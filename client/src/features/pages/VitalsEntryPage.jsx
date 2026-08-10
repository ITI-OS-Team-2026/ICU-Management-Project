import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Clock,
  Droplets,
  Heart,
  Info,
  Loader2,
  Sparkles,
  Thermometer,
  User,
  Wind,
} from 'lucide-react';
import api from '@/lib/api';
import DiagnosisContextStrip from '../components/diagnoses/DiagnosisContextStrip';
import { TimeRangeSelector } from '../components/VitalTrendChart';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { VITAL_NORMAL_RANGES } from '@/features/utils/vitalStatus';
import { SummonDoctorModal } from '@/components/notifications/SummonDoctorModal';

export default function VitalsEntryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // const navigate = useNavigate();

  const currentView = searchParams.get('view') || (window.location.pathname.includes('monitor') ? 'monitor' : 'entry');
  const admissionIdFromUrl = searchParams.get('admissionId') || '';

  const [admissions, setAdmissions] = useState([]);
  const [activeAdmission, setActiveAdmission] = useState(null);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [/*nursingNotes*/, setNursingNotes] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [medications, setMedications] = useState([]);
  const [isLoadingAdmissions, setIsLoadingAdmissions] = useState(true);
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSummonModalOpen, setIsSummonModalOpen] = useState(false);
  const [entryTimeRange, setEntryTimeRange] = useState('all');

  // React Hook Form for Vitals logging.
  // These fields mirror createVitalSignSchema on the server exactly. Anything not
  // in that schema is stripped by the validate middleware (stripUnknown: true), so
  // adding inputs here without a matching column silently discards what is typed.
  const { register, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: {
      temperature: '',
      pulse: '',
      systolic_bp: '',
      diastolic_bp: '',
      respiratory_rate: '',
      spo2: '',
      nursing_note: '',
      is_override: false,
      override_reason: '',
    }
  });

  // Watch values for abnormal triggers
  const watchedTemp = watch('temperature');
  const watchedPulse = watch('pulse');
  const watchedSys = watch('systolic_bp');
  const watchedDia = watch('diastolic_bp');
  const watchedRR = watch('respiratory_rate');
  const watchedSpO2 = watch('spo2');
  const isOverrideChecked = watch('is_override');

  // Determine if there are critical values in real-time
  const getCriticalFields = () => {
    const fields = [];
    if (watchedTemp && (parseFloat(watchedTemp) < VITAL_NORMAL_RANGES.temperature.min || parseFloat(watchedTemp) > VITAL_NORMAL_RANGES.temperature.max)) {
      fields.push(`Temperature: ${watchedTemp}°C`);
    }
    if (watchedPulse && (parseInt(watchedPulse, 10) < VITAL_NORMAL_RANGES.pulse.min || parseInt(watchedPulse, 10) > VITAL_NORMAL_RANGES.pulse.max)) {
      fields.push(`Pulse: ${watchedPulse} bpm`);
    }
    if (watchedSys && (parseInt(watchedSys, 10) < VITAL_NORMAL_RANGES.systolic_bp.min || parseInt(watchedSys, 10) > VITAL_NORMAL_RANGES.systolic_bp.max)) {
      fields.push(`Systolic BP: ${watchedSys} mmHg`);
    }
    if (watchedDia && (parseInt(watchedDia, 10) < VITAL_NORMAL_RANGES.diastolic_bp.min || parseInt(watchedDia, 10) > VITAL_NORMAL_RANGES.diastolic_bp.max)) {
      fields.push(`Diastolic BP: ${watchedDia} mmHg`);
    }
    if (watchedRR && (parseInt(watchedRR, 10) < VITAL_NORMAL_RANGES.respiratory_rate.min || parseInt(watchedRR, 10) > VITAL_NORMAL_RANGES.respiratory_rate.max)) {
      fields.push(`Resp Rate: ${watchedRR}/min`);
    }
    if (watchedSpO2 && (parseInt(watchedSpO2, 10) < VITAL_NORMAL_RANGES.spo2.min || parseInt(watchedSpO2, 10) > VITAL_NORMAL_RANGES.spo2.max)) {
      fields.push(`SpO2: ${watchedSpO2}%`);
    }
    return fields;
  };

  const criticalFields = getCriticalFields();
  const hasCritical = criticalFields.length > 0;

  // Fetch admissions ONCE on mount
  useEffect(() => {
    async function initPage() {
      try {
        setIsLoadingAdmissions(true);
        const { data: adData } = await api.get('/admissions?status=ACTIVE&limit=100');
        setAdmissions(adData.data || []);

        // Pick initial admission from URL or use first
        let initialAd = null;
        if (admissionIdFromUrl) {
          initialAd = adData.data.find(a => a.id === admissionIdFromUrl);
        }
        if (!initialAd && adData.data.length > 0) {
          initialAd = adData.data.find(a => a.patient?.name?.includes('Porter')) || adData.data[0];
        }

        setActiveAdmission(initialAd);
      } catch (err) {
        console.error("Initialization error:", err);
        setErrorMsg("Failed to load active patients list.");
      } finally {
        setIsLoadingAdmissions(false);
      }
    }
    initPage();
  }, []); // Empty array: runs only on mount

  // Fetch patient vitals/notes when active patient changes
  useEffect(() => {
    if (!activeAdmission) return;

    async function fetchHistory() {
      try {
        setIsLoadingVitals(true);
        // Labs and medications back the monitor sidebar, which previously rendered
        // hardcoded values. They are allowed to fail independently of the vitals.
        const [vitalsRes, notesRes, labsRes, medsRes] = await Promise.all([
          api.get(`/admissions/${activeAdmission.id}/vitals?limit=20`),
          api.get(`/admissions/${activeAdmission.id}/notes/nursing`),
          api.get(`/admissions/${activeAdmission.id}/labs`).catch(() => ({ data: [] })),
          api.get(`/admissions/${activeAdmission.id}/medications`).catch(() => ({ data: [] }))
        ]);
        setVitalsHistory(vitalsRes.data || []);
        setNursingNotes(notesRes.data || []);
        setLabResults(labsRes.data || []);
        setMedications(medsRes.data || []);
      } catch (err) {
        console.error("Fetch history error:", err);
      } finally {
        setIsLoadingVitals(false);
      }
    }
    fetchHistory();
  }, [activeAdmission?.id]); // Only depend on ID to prevent reference changes

  const handlePatientSwitch = useCallback((val) => {
    const selected = admissions.find(a => a.id === val);
    setActiveAdmission(selected);
    setSearchParams({ view: currentView, admissionId: val });
  }, [currentView, admissions, setSearchParams]);

  const handleToggleView = (viewName) => {
    if (activeAdmission) {
      setSearchParams({ view: viewName, admissionId: activeAdmission.id });
    }
  };

  // Submit Vitals and Notes
  const onSaveVitalsSubmit = async (formData) => {
    if (!activeAdmission) return;
    setErrorMsg('');
    setSuccessMsg('');

    // Pre-validation for overrides
    if (hasCritical && !formData.is_override) {
      setErrorMsg("Critical values detected. You must acknowledge clinical warnings and provide an override reason.");
      return;
    }
    if (hasCritical && formData.is_override && !formData.override_reason?.trim()) {
      setErrorMsg("An override reason must be provided for critical values.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Log Vitals
      const vitalsPayload = {
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        pulse: formData.pulse ? parseInt(formData.pulse, 10) : undefined,
        systolic_bp: formData.systolic_bp ? parseInt(formData.systolic_bp, 10) : undefined,
        diastolic_bp: formData.diastolic_bp ? parseInt(formData.diastolic_bp, 10) : undefined,
        respiratory_rate: formData.respiratory_rate ? parseInt(formData.respiratory_rate, 10) : undefined,
        spo2: formData.spo2 ? parseInt(formData.spo2, 10) : undefined,
        is_override: formData.is_override,
        override_reason: formData.is_override ? formData.override_reason : undefined,
      };

      await api.post(`/admissions/${activeAdmission.id}/vitals`, vitalsPayload);

      // Log Nursing Note if text exists
      if (formData.nursing_note?.trim()) {
        await api.post(`/admissions/${activeAdmission.id}/notes/nursing`, {
          note: formData.nursing_note
        });
      }

      setSuccessMsg("Vitals successfully saved.");
      reset({
        temperature: '',
        pulse: '',
        systolic_bp: '',
        diastolic_bp: '',
        respiratory_rate: '',
        spo2: '',
        nursing_note: '',
        is_override: false,
        override_reason: '',
      });

      // Reload history
      const [vitalsRes, notesRes] = await Promise.all([
        api.get(`/admissions/${activeAdmission.id}/vitals?limit=20`),
        api.get(`/admissions/${activeAdmission.id}/notes/nursing`)
      ]);
      setVitalsHistory(vitalsRes.data || []);
      setNursingNotes(notesRes.data || []);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "An error occurred while saving vitals.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulated sparkline coordinates generator
  const getSparklinePoints = (history, key, height = 30) => {
    if (!history || history.length === 0) return '';
    const valid = history.filter(h => h[key] !== null && h[key] !== undefined).reverse();
    if (valid.length < 2) return '';
    const maxVal = Math.max(...valid.map(h => parseFloat(h[key])));
    const minVal = Math.min(...valid.map(h => parseFloat(h[key])));
    const range = maxVal - minVal || 1;
    const width = 120;
    const padding = 2;
    const points = valid.map((h, i) => {
      const x = (i / (valid.length - 1)) * (width - padding * 2) + padding;
      const y = height - (((parseFloat(h[key]) - minVal) / range) * (height - padding * 2) + padding);
      return `${x},${y}`;
    });
    return points.join(' ');
  };

  const formatDateLabel = (timestampStr, range) => {
    if (!timestampStr) return '';
    const d = new Date(timestampStr);
    if (Number.isNaN(d.getTime())) return '';
    const pattern = range === '24h' ? 'HH:mm' : range === '30d' ? 'MMM d' : 'MMM d, HH:mm';
    return format(d, pattern);
  };

  // Trend line over the recorded vitals for `key`. This replaced a static SVG
  // path that drew the same fake ECG squiggle for every patient and every metric
  // — there is no telemetry hardware feed in this system, only discrete entries.
  const renderTrend = (key, colorClass) => {
    let valid = (vitalsHistory || [])
      .filter(h => h[key] !== null && h[key] !== undefined && !Number.isNaN(parseFloat(h[key])))
      .reverse();

    if (entryTimeRange !== 'all' && valid.length > 0) {
      const latestTime = new Date(valid[valid.length - 1]?.recordedAt).getTime();
      let cutoffMs = 0;
      if (entryTimeRange === '24h') cutoffMs = 24 * 60 * 60 * 1000;
      else if (entryTimeRange === '7d') cutoffMs = 7 * 24 * 60 * 60 * 1000;
      else if (entryTimeRange === '30d') cutoffMs = 30 * 24 * 60 * 60 * 1000;

      if (cutoffMs && Number.isFinite(latestTime)) {
        const filtered = valid.filter(h => new Date(h.recordedAt).getTime() >= latestTime - cutoffMs);
        if (filtered.length >= 2) {
          valid = filtered;
        }
      }
    }

    if (valid.length < 2) {
      return (
        <div className="flex h-16 items-center justify-center text-[11px] font-sans text-muted-foreground">
          {valid.length === 0
            ? 'No readings recorded yet'
            : 'At least two readings are needed to plot a trend'}
        </div>
      );
    }

    const values = valid.map(h => parseFloat(h[key]));
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const range = maxVal - minVal || 1;
    const width = 400;
    const height = 64;
    const pad = 6;

    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * (width - pad * 2) + pad;
      const y = height - (((v - minVal) / range) * (height - pad * 2) + pad);
      return `${x},${y}`;
    });

    const firstDate = formatDateLabel(valid[0]?.recordedAt, entryTimeRange);
    const midDate = valid.length > 2 ? formatDateLabel(valid[Math.floor(valid.length / 2)]?.recordedAt, entryTimeRange) : null;
    const lastDate = formatDateLabel(valid[valid.length - 1]?.recordedAt, entryTimeRange);

    return (
      <div className="space-y-1">
        <div className="relative">
          <svg className={`h-16 w-full ${colorClass}`} viewBox={`0 0 ${width} ${height}`} fill="none" preserveAspectRatio="none">
            <polyline
              points={points.join(' ')}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-between py-0.5 text-[9px] font-mono font-tnum text-muted-foreground">
            <span>{maxVal}</span>
            <span>{minVal}</span>
          </div>
        </div>
        {/* Horizontal Axis (X-Axis) Date Labels */}
        <div className="flex items-center justify-between border-t border-border/40 pt-1 text-[9px] font-mono font-tnum text-muted-foreground">
          <span>{firstDate}</span>
          {midDate && <span>{midDate}</span>}
          <span>{lastDate}</span>
        </div>
      </div>
    );
  };

  if (isLoadingAdmissions) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Patient context bar */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-56 rounded-md" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-border pb-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-48" />
        </div>

        {/* Form body */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {Array.from({ length: 2 }).map((_, cardIdx) => (
              <Card key={cardIdx} className="border-border bg-card">
                <CardHeader>
                  <Skeleton className="h-5 w-44" />
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, fieldIdx) => (
                    <div key={fieldIdx} className="space-y-2">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full rounded-md" />
              </CardContent>
            </Card>
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  // Get active vitals (most recent logged)
  const activeVitals = vitalsHistory[0] || {};
  const abnormalLabs = labResults.filter(l => l.abnormal);
  const activeMedications = medications.filter(m => m.isActive);

  // Built from this admission's own records. Previously five fixed rows naming a
  // specific bed, drug and diagnosis were shown for every patient.
  const timelineEvents = [
    ...vitalsHistory.map(v => ({
      id: `vitals-${v.id}`,
      at: v.recordedAt,
      label: `Vitals logged — HR ${v.pulse ?? '—'}, BP ${v.systolicBp ?? '—'}/${v.diastolicBp ?? '—'}, SpO₂ ${v.spo2 ?? '—'}%`,
      dotColor: 'bg-primary',
    })),
    ...labResults.map(l => ({
      id: `lab-${l.id}`,
      at: l.recordedAt,
      label: `${l.testName} — ${l.resultValue}${l.abnormal ? ' (Abnormal)' : ''}`,
      dotColor: l.abnormal ? 'bg-destructive' : 'bg-secondary',
    })),
    ...medications.map(m => ({
      id: `med-${m.id}`,
      at: m.prescribedAt || m.startDate,
      label: `${m.drugName} ${m.dosage} prescribed`,
      dotColor: 'bg-emerald-500',
    })),
  ]
    .filter(e => e.at && !Number.isNaN(new Date(e.at).getTime()))
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      
      {/* ── Patient Context Ticker & Switcher ────────────────────────────────── */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold text-foreground">Current Patient:</span>
          </div>
          <Select value={activeAdmission?.id || ''} onValueChange={handlePatientSwitch}>
            <SelectTrigger className="w-56 bg-background">
              <SelectValue placeholder="Select patient">
                {(value) => {
                  const ad = admissions.find(a => a.id === value);
                  return ad ? `${ad.patient?.name} (${ad.bed?.bed_number || 'No Bed'})` : null;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {admissions.map(ad => (
                <SelectItem key={ad.id} value={ad.id}>
                  {ad.patient?.name} ({ad.bed?.bed_number || 'No Bed'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeAdmission && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Triage Status:</span>
            <Badge variant={activeAdmission.patient?.name?.includes('Porter') || activeAdmission.patient?.name?.includes('Emma') ? 'destructive' : 'secondary'} className="font-mono font-medium">
              {activeAdmission.patient?.name?.includes('Porter') || activeAdmission.patient?.name?.includes('Emma') || activeAdmission.patient?.name?.includes('Sofia') ? 'Critical' : 'Watchful'}
            </Badge>
            <Separator orientation="vertical" className="h-4" />
            <span className="font-sans text-muted-foreground">Age:</span>
            <span className="font-tnum font-semibold">{activeAdmission.patient?.age}</span>
            <span className="font-sans text-muted-foreground">Gender:</span>
            <span className="font-sans font-semibold">{activeAdmission.patient?.gender}</span>
            <Separator orientation="vertical" className="h-4" />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsSummonModalOpen(true)}
              className="gap-2 ml-2"
            >
              <BellRing className="h-4 w-4" />
              Summon Doctor
            </Button>
          </div>
        )}
      </div>

      {/* What is being treated, and what is still only suspected — context for
          interpreting the numbers being charted. */}
      {activeAdmission && (
        <DiagnosisContextStrip admissionId={activeAdmission.id} className="mb-6" />
      )}

      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Info className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* ── Tab Views ────────────────────────────────────────────────────────── */}
      <div className="mb-6 border-b border-border">
        <div className="flex gap-4">
          <Button
            variant="ghost"
            className={`relative rounded-none px-4 py-2 font-display text-sm font-semibold transition-all hover:bg-transparent ${currentView === 'entry' ? 'text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary' : 'text-muted-foreground'}`}
            onClick={() => handleToggleView('entry')}
          >
            Log Patient Vitals
          </Button>
          <Button
            variant="ghost"
            className={`relative rounded-none px-4 py-2 font-display text-sm font-semibold transition-all hover:bg-transparent ${currentView === 'monitor' ? 'text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary' : 'text-muted-foreground'}`}
            onClick={() => handleToggleView('monitor')}
          >
            Charts Monitor
          </Button>
        </div>
      </div>

      {/* ── View 1: Vitals Entry Form ─────────────────────────────────────────── */}
      {currentView === 'entry' && activeAdmission && (
        <form onSubmit={handleSubmit(onSaveVitalsSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            
            {/* Core Metrics Column */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg font-semibold text-foreground">
                    Core Vital Signs
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="temperature" className="text-sm font-semibold">Temperature (°C)</Label>
                    <div className="relative">
                      <Input
                        id="temperature"
                        type="number"
                        step="0.1"
                        placeholder="e.g. 37.0"
                        className="pr-10 bg-background font-tnum"
                        {...register('temperature')}
                      />
                      <Thermometer className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pulse" className="text-sm font-semibold">Pulse (Heart Rate - bpm)</Label>
                    <div className="relative">
                      <Input
                        id="pulse"
                        type="number"
                        placeholder="e.g. 80"
                        className="pr-10 bg-background font-tnum"
                        {...register('pulse')}
                      />
                      <Heart className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="systolic_bp" className="text-sm font-semibold">Systolic Blood Pressure (mmHg)</Label>
                    <Input
                      id="systolic_bp"
                      type="number"
                      placeholder="e.g. 120"
                      className="bg-background font-tnum"
                      {...register('systolic_bp')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diastolic_bp" className="text-sm font-semibold">Diastolic Blood Pressure (mmHg)</Label>
                    <Input
                      id="diastolic_bp"
                      type="number"
                      placeholder="e.g. 80"
                      className="bg-background font-tnum"
                      {...register('diastolic_bp')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="respiratory_rate" className="text-sm font-semibold">Respiratory Rate (/min)</Label>
                    <div className="relative">
                      <Input
                        id="respiratory_rate"
                        type="number"
                        placeholder="e.g. 18"
                        className="pr-10 bg-background font-tnum"
                        {...register('respiratory_rate')}
                      />
                      <Wind className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spo2" className="text-sm font-semibold">Oxygen Saturation (SpO2 %)</Label>
                    <div className="relative">
                      <Input
                        id="spo2"
                        type="number"
                        placeholder="e.g. 98"
                        className="pr-10 bg-background font-tnum"
                        {...register('spo2')}
                      />
                      <Droplets className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Nursing Notes Card */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg font-semibold text-foreground">
                    Nursing Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Document any observations, patient complaints, or assessment findings..."
                    className="min-h-24 bg-background"
                    {...register('nursing_note')}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Validation & Actions Column */}
            <div className="space-y-6">
              
              {/* Critical Alert Warning */}
              {hasCritical && (
                <Alert className="border-destructive bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="font-display font-semibold">Abnormal Vitals Warning</AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p className="text-xs">The following values fall outside normal clinical ICU guidelines:</p>
                    <ul className="list-disc pl-5 font-mono text-xs font-semibold">
                      {criticalFields.map((field, idx) => (
                        <li key={idx}>{field}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Override Authorization Card */}
              <Card className={`border-border bg-card ${hasCritical && !isOverrideChecked ? 'ring-2 ring-destructive/40' : ''}`}>
                <CardHeader>
                  <CardTitle className="font-display text-base font-semibold text-foreground">
                    Clinical Override Authorization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="is_override"
                      className="mt-1"
                      checked={isOverrideChecked}
                      onCheckedChange={(val) => setValue('is_override', val)}
                    />
                    <Label htmlFor="is_override" className="text-xs leading-normal font-sans text-muted-foreground select-none cursor-pointer">
                      Acknowledge critical alerts and authorize entry override. Requires clinical reason.
                    </Label>
                  </div>

                  {isOverrideChecked && (
                    <div className="space-y-2">
                      <Label htmlFor="override_reason" className="text-xs font-semibold">Override Reason</Label>
                      <Textarea
                        id="override_reason"
                        placeholder="Provide details for overriding validation..."
                        className="min-h-16 bg-background text-sm"
                        {...register('override_reason')}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Card */}
              <Card className="border-border bg-card p-4">
                <div className="space-y-4">
                  <Button
                    type="submit"
                    variant="default"
                    className="w-full font-sans font-semibold py-6 text-base"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Entry...
                      </>
                    ) : (
                      'Save Vitals'
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full font-sans text-sm"
                    onClick={() => handleToggleView('monitor')}
                  >
                    Open Telemetry Monitor
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* ── View 2: Vitals Monitor Dashboard ─────────────────────────────────── */}
      {currentView === 'monitor' && activeAdmission && (
        <div className="space-y-6">
          
          {/* Back Action */}
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleView('entry')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Vitals Entry
            </Button>
          </div>

          {/* Warns from the patient's own abnormal-flagged labs. This replaced a
              banner that announced a fixed "Lactate 4.2 mmol/L" for any patient
              who merely had a temperature on file. */}
          {abnormalLabs.length > 0 && (
            <Alert className="border-destructive bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-display font-semibold">
                {abnormalLabs.length} abnormal lab {abnormalLabs.length === 1 ? 'result' : 'results'}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {abnormalLabs.slice(0, 3).map(l => `${l.testName} ${l.resultValue}`).join(' · ')}
                {abnormalLabs.length > 3 ? ` · +${abnormalLabs.length - 3} more` : ''}
              </AlertDescription>
            </Alert>
          )}

          {/* ── Quick Vitals Cards Ticker ────────────────────────────────────── */}
          {isLoadingVitals ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {/* Heart Rate */}
              <Card className="border-rose-500/20 bg-rose-500/5 text-rose-900 dark:text-rose-200">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider">Heart Rate</span>
                    <Heart className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold font-tnum">
                      {activeVitals.pulse || '—'}
                    </span>
                    <span className="text-xs font-sans text-muted-foreground">bpm</span>
                  </div>
                  {/* Micro sparkline */}
                  <div className="h-6">
                    <svg className="w-full h-full text-rose-500/40" viewBox="0 0 120 30" fill="none">
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        points={getSparklinePoints(vitalsHistory, 'pulse', 30)}
                      />
                    </svg>
                  </div>
                </CardContent>
              </Card>

              {/* Blood Pressure */}
              <Card className="border-sky-500/20 bg-sky-500/5 text-sky-900 dark:text-sky-200">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider">Blood Pressure</span>
                    <Activity className="h-4 w-4 text-sky-500" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold font-tnum">
                      {activeVitals.systolicBp && activeVitals.diastolicBp
                        ? `${activeVitals.systolicBp}/${activeVitals.diastolicBp}`
                        : '—'}
                    </span>
                    <span className="text-xs font-sans text-muted-foreground">mmHg</span>
                  </div>
                  <div className="h-6">
                    <svg className="w-full h-full text-sky-500/40" viewBox="0 0 120 30" fill="none">
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        points={getSparklinePoints(vitalsHistory, 'systolicBp', 30)}
                      />
                    </svg>
                  </div>
                </CardContent>
              </Card>

              {/* SpO2 */}
              <Card className="border-teal-500/20 bg-teal-500/5 text-teal-900 dark:text-teal-200">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider">SpO₂</span>
                    <Droplets className="h-4 w-4 text-teal-500" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold font-tnum">
                      {activeVitals.spo2 || '—'}
                    </span>
                    <span className="text-xs font-sans text-muted-foreground">%</span>
                  </div>
                  <div className="h-6">
                    <svg className="w-full h-full text-teal-500/40" viewBox="0 0 120 30" fill="none">
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        points={getSparklinePoints(vitalsHistory, 'spo2', 30)}
                      />
                    </svg>
                  </div>
                </CardContent>
              </Card>

              {/* Resp Rate */}
              <Card className="border-purple-500/20 bg-purple-500/5 text-purple-900 dark:text-purple-200">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider">Resp Rate</span>
                    <Wind className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold font-tnum">
                      {activeVitals.respiratoryRate || '—'}
                    </span>
                    <span className="text-xs font-sans text-muted-foreground">/min</span>
                  </div>
                  <div className="h-6">
                    <svg className="w-full h-full text-purple-500/40" viewBox="0 0 120 30" fill="none">
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        points={getSparklinePoints(vitalsHistory, 'respiratoryRate', 30)}
                      />
                    </svg>
                  </div>
                </CardContent>
              </Card>

              {/* Temperature */}
              <Card className="border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-200 col-span-2 sm:col-span-1">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider">Temperature</span>
                    <Thermometer className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold font-tnum">
                      {activeVitals.temperature || '—'}
                    </span>
                    <span className="text-xs font-sans text-muted-foreground">°C</span>
                  </div>
                  <div className="h-6">
                    <svg className="w-full h-full text-amber-500/40" viewBox="0 0 120 30" fill="none">
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        points={getSparklinePoints(vitalsHistory, 'temperature', 30)}
                      />
                    </svg>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Main Charts Panel (EKG Wave Layout) ───────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            
            {/* Real-time Telemetry sparkline panels */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="font-display text-base font-semibold text-foreground">
                      Recorded Vitals Trends
                    </CardTitle>
                    <p className="text-xs font-sans text-muted-foreground mt-1">
                      Plotted from logged entries ({entryTimeRange === 'all' ? 'all time' : entryTimeRange})
                    </p>
                  </div>
                  <TimeRangeSelector value={entryTimeRange} onChange={setEntryTimeRange} />
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Heart Rate */}
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-rose-500 font-semibold font-mono">
                      <span>HEART RATE — latest {activeVitals.pulse || '—'} bpm</span>
                    </div>
                    {renderTrend('pulse', 'text-rose-500')}
                  </div>

                  {/* Systolic BP */}
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-sky-500 font-semibold font-mono">
                      <span>
                        SYSTOLIC BP — latest{' '}
                        {activeVitals.systolicBp && activeVitals.diastolicBp
                          ? `${activeVitals.systolicBp}/${activeVitals.diastolicBp}`
                          : '—'}{' '}
                        mmHg
                      </span>
                    </div>
                    {renderTrend('systolicBp', 'text-sky-500')}
                  </div>

                  {/* SpO2 */}
                  <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-teal-500 font-semibold font-mono">
                      <span>OXYGEN SATURATION — latest {activeVitals.spo2 || '—'}%</span>
                    </div>
                    {renderTrend('spo2', 'text-teal-500')}
                  </div>
                </CardContent>
              </Card>

              {/* Historical Vitals Table */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="font-display text-base font-semibold text-foreground">
                    Discrete Log History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingVitals ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-mono text-xs uppercase">Time</TableHead>
                          <TableHead className="font-mono text-xs uppercase text-right">HR</TableHead>
                          <TableHead className="font-mono text-xs uppercase text-right">BP</TableHead>
                          <TableHead className="font-mono text-xs uppercase text-right">SpO₂</TableHead>
                          <TableHead className="font-mono text-xs uppercase text-right">RR</TableHead>
                          <TableHead className="font-mono text-xs uppercase text-right">Temp</TableHead>
                          <TableHead className="font-mono text-xs uppercase">Logged By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vitalsHistory.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-mono text-xs font-tnum">
                              {new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell className="font-tnum text-right font-semibold text-rose-500">{v.pulse}</TableCell>
                            <TableCell className="font-tnum text-right font-semibold text-sky-500">
                              {v.systolicBp}/{v.diastolicBp}
                            </TableCell>
                            <TableCell className="font-tnum text-right font-semibold text-teal-500">{v.spo2}%</TableCell>
                            <TableCell className="font-tnum text-right font-semibold text-purple-500">{v.respiratoryRate}</TableCell>
                            <TableCell className="font-tnum text-right font-semibold text-amber-500">{v.temperature}°C</TableCell>
                            <TableCell className="text-xs font-sans font-semibold">
                              {v.recordedBy?.firstName} {v.recordedBy?.lastName}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Columns (Labs, Meds, Timeline) */}
            <div className="space-y-6">
              
              {/* Critical Labs */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Critical Clinical Labs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoadingVitals ? (
                    [...Array(4)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)
                  ) : labResults.length === 0 ? (
                    <p className="text-xs font-sans text-muted-foreground py-2">
                      No lab results recorded for this admission.
                    </p>
                  ) : (
                    labResults.slice(0, 6).map((lab, idx, arr) => (
                      <div
                        key={lab.id}
                        className={`flex items-center justify-between text-xs pb-2 ${idx < arr.length - 1 ? 'border-b border-border' : 'pb-1'}`}
                      >
                        <span className="font-sans text-muted-foreground">{lab.testName}</span>
                        <span className={`font-mono font-bold font-tnum ${lab.abnormal ? 'text-destructive' : 'text-foreground'}`}>
                          {lab.resultValue}{lab.abnormal ? ' (Abnormal)' : ''}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Active Medications */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Active Medications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingVitals ? (
                    [...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
                  ) : activeMedications.length === 0 ? (
                    <p className="text-xs font-sans text-muted-foreground">
                      No active medication orders for this admission.
                    </p>
                  ) : (
                    activeMedications.map(med => (
                      <div key={med.id} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate">{med.drugName}</h4>
                          <p className="text-[10px] text-muted-foreground font-mono font-tnum mt-0.5">
                            {med.dosage} · {med.frequency}
                          </p>
                        </div>
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-semibold py-0.5 shrink-0">
                          ACTIVE
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Recent Events Feed */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Clinical Timeline Events
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:h-[80%] before:w-0.5 before:bg-border">
                  {isLoadingVitals ? (
                    [...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
                  ) : timelineEvents.length === 0 ? (
                    <p className="text-xs font-sans text-muted-foreground">
                      No recorded events for this admission yet.
                    </p>
                  ) : (
                    timelineEvents.map(evt => (
                      <div key={evt.id} className="relative text-xs">
                        <span className={`absolute -left-5 top-1 h-2 w-2 rounded-full ${evt.dotColor}`} />
                        <span className="font-mono font-semibold font-tnum block text-muted-foreground">
                          {new Date(evt.at).toLocaleString([], {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        <span className="font-sans font-semibold text-foreground">{evt.label}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      )}

      {!activeAdmission && (
        <Card className="border-border bg-card p-8 text-center my-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No Active Patient Selected</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            There are either no active admissions in the system or you need to select a patient from the dropdown above to start viewing or logging vitals.
          </p>
          {admissions.length === 0 && (
            <div className="text-xs text-muted-foreground border-t border-border pt-4 max-w-md mx-auto">
              Tip: If this is a fresh setup, ensure the database is seeded by running:
              <pre className="mt-2 bg-muted p-2 rounded text-left font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">node prisma/seed.js</pre>
            </div>
          )}
        </Card>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <SummonDoctorModal 
        open={isSummonModalOpen} 
        onClose={() => setIsSummonModalOpen(false)} 
        admission={activeAdmission} 
      />
    </div>
  );
}
