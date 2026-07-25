import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  // ChevronDown,
  Clock,
  Droplets,
  Heart,
  Info,
  Loader2,
  // Plus,
  // RefreshCw,
  Sparkles,
  Thermometer,
  User,
  Wind,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// Critical ranges matching vitalSign.schema.js
const NORMAL_RANGES = {
  temperature: { min: 36.0, max: 38.5 },
  pulse: { min: 40, max: 140 },
  systolic_bp: { min: 80, max: 180 },
  diastolic_bp: { min: 50, max: 110 },
  respiratory_rate: { min: 8, max: 30 },
  spo2: { min: 85, max: 100 },
};

export default function VitalsEntryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // const navigate = useNavigate();

  const currentView = searchParams.get('view') || (window.location.pathname.includes('monitor') ? 'monitor' : 'entry');
  const admissionIdFromUrl = searchParams.get('admissionId') || '';

  const [admissions, setAdmissions] = useState([]);
  const [activeAdmission, setActiveAdmission] = useState(null);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [/*nursingNotes*/, setNursingNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dropdown options
  const o2Devices = [
    'Room Air',
    'Nasal Cannula',
    'High Flow Nasal Cannula',
    'Simple Mask',
    'Venturi Mask',
    'Non-rebreather',
    'CPAP',
    'BiBAP',
    'Mechanical Ventilation',
  ];

  const positions = [
    'Supine',
    'Prone',
    'Semi-Fowler\'s',
    'Fowler\'s',
    'Left Lateral',
    'Right Lateral',
  ];

  const painRoutes = [
    'Patient-reported (NRS)',
    'FLACC scale',
    'CPOT (Critical-Care Pain Observation Tool)',
    'BPS (Behavioral Pain Scale)',
  ];

  // React Hook Form for Vitals logging
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      temperature: '',
      pulse: '',
      systolic_bp: '',
      diastolic_bp: '',
      respiratory_rate: '',
      spo2: '',
      oxygen_device: 'Room Air',
      oxygen_flow_rate: '',
      patient_position: 'Supine',
      pain_assessment_route: 'Patient-reported (NRS)',
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
    if (watchedTemp && (parseFloat(watchedTemp) < NORMAL_RANGES.temperature.min || parseFloat(watchedTemp) > NORMAL_RANGES.temperature.max)) {
      fields.push(`Temperature: ${watchedTemp}°C`);
    }
    if (watchedPulse && (parseInt(watchedPulse, 10) < NORMAL_RANGES.pulse.min || parseInt(watchedPulse, 10) > NORMAL_RANGES.pulse.max)) {
      fields.push(`Pulse: ${watchedPulse} bpm`);
    }
    if (watchedSys && (parseInt(watchedSys, 10) < NORMAL_RANGES.systolic_bp.min || parseInt(watchedSys, 10) > NORMAL_RANGES.systolic_bp.max)) {
      fields.push(`Systolic BP: ${watchedSys} mmHg`);
    }
    if (watchedDia && (parseInt(watchedDia, 10) < NORMAL_RANGES.diastolic_bp.min || parseInt(watchedDia, 10) > NORMAL_RANGES.diastolic_bp.max)) {
      fields.push(`Diastolic BP: ${watchedDia} mmHg`);
    }
    if (watchedRR && (parseInt(watchedRR, 10) < NORMAL_RANGES.respiratory_rate.min || parseInt(watchedRR, 10) > NORMAL_RANGES.respiratory_rate.max)) {
      fields.push(`Resp Rate: ${watchedRR}/min`);
    }
    if (watchedSpO2 && (parseInt(watchedSpO2, 10) < NORMAL_RANGES.spo2.min || parseInt(watchedSpO2, 10) > NORMAL_RANGES.spo2.max)) {
      fields.push(`SpO2: ${watchedSpO2}%`);
    }
    return fields;
  };

  const criticalFields = getCriticalFields();
  const hasCritical = criticalFields.length > 0;

  // Fetch admissions on mount
  useEffect(() => {
    async function initPage() {
      try {
        setIsLoading(true);
        const { data: adData } = await api.get('/admissions?status=ACTIVE');
        setAdmissions(adData.data || []);

        // Pick initial admission
        let initialAd = null;
        if (admissionIdFromUrl) {
          initialAd = adData.data.find(a => a.id === admissionIdFromUrl);
        }
        if (!initialAd && adData.data.length > 0) {
          initialAd = adData.data.find(a => a.patient?.name?.includes('Porter')) || adData.data[0];
          setSearchParams({ view: currentView, admissionId: initialAd.id }, { replace: true });
        }
        setActiveAdmission(initialAd);
      } catch (err) {
        console.error("Initialization error:", err);
        setErrorMsg("Failed to load active patients list.");
      } finally {
        setIsLoading(false);
      }
    }
    initPage();
  }, [admissionIdFromUrl]);

  // Fetch patient history when active patient switches
  useEffect(() => {
    if (!activeAdmission) return;
    async function fetchHistory() {
      try {
        const [vitalsRes, notesRes] = await Promise.all([
          api.get(`/admissions/${activeAdmission.id}/vitals?limit=20`),
          api.get(`/admissions/${activeAdmission.id}/notes/nursing`)
        ]);
        setVitalsHistory(vitalsRes.data || []);
        setNursingNotes(notesRes.data || []);
      } catch (err) {
        console.error("Fetch history error:", err);
      }
    }
    fetchHistory();
  }, [activeAdmission]);

  const handlePatientSwitch = (val) => {
    const selected = admissions.find(a => a.id === val);
    setActiveAdmission(selected);
    setSearchParams({ view: currentView, admissionId: val });
  };

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
        oxygen_device: 'Room Air',
        oxygen_flow_rate: '',
        patient_position: 'Supine',
        pain_assessment_route: 'Patient-reported (NRS)',
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

  // High precision telemetry waves for monitor view
  const renderEKG = (colorClass) => {
    return (
      <svg className={`h-16 w-full ${colorClass}`} viewBox="0 0 400 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0 32h60l8-18 10 38 12-30 8 10h50l8-18 10 38 12-30 8 10h50l8-18 10 38 12-30 8 10h50l8-18 10 38 12-30 8 10h64"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 font-sans text-sm text-muted-foreground">Loading patient details...</span>
      </div>
    );
  }

  // Get active vitals (most recent logged)
  const activeVitals = vitalsHistory[0] || {};

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      
      {/* ── Patient Context Ticker & Switcher ────────────────────────────────── */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold text-foreground">Current Patient:</span>
          </div>
          <Select value={activeAdmission?.id || ''} onValueChange={handlePatientSwitch}>
            <SelectTrigger className="w-56 bg-background">
              <SelectValue placeholder="Select patient" />
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
          </div>
        )}
      </div>

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
            Telemetry & Charts Monitor
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

              {/* Oxygen Therapy Card */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg font-semibold text-foreground">
                    Oxygen Therapy & Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">O₂ Device</Label>
                    <Select defaultValue="Room Air" onValueChange={(v) => setValue('oxygen_device', v)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select oxygen device" />
                      </SelectTrigger>
                      <SelectContent>
                        {o2Devices.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="oxygen_flow_rate" className="text-sm font-semibold">O₂ Flow Rate (L/min)</Label>
                    <Input
                      id="oxygen_flow_rate"
                      type="number"
                      step="0.5"
                      placeholder="e.g. 4.0"
                      className="bg-background font-tnum"
                      {...register('oxygen_flow_rate')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Patient Position</Label>
                    <Select defaultValue="Supine" onValueChange={(v) => setValue('patient_position', v)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Pain Assessment Route</Label>
                    <Select defaultValue="Patient-reported (NRS)" onValueChange={(v) => setValue('pain_assessment_route', v)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select pain assessment route" />
                      </SelectTrigger>
                      <SelectContent>
                        {painRoutes.map(pr => (
                          <SelectItem key={pr} value={pr}>{pr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <input
                      type="checkbox"
                      id="is_override"
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-ring"
                      {...register('is_override')}
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

          {/* Telemetry Indicator Strip */}
          {activeVitals.temperature && (
            <Alert className="border-destructive bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-display font-semibold">Clinical Warning Alert</AlertTitle>
              <AlertDescription className="text-xs">
                Lactate 4.2 mmol/L &mdash; High multi-organ failure risk. Telemetry shows active vasopressor requirements.
              </AlertDescription>
            </Alert>
          )}

          {/* ── Quick Vitals Cards Ticker ────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {/* Heart Rate */}
            <Card className="border-rose-500/20 bg-rose-500/5 text-rose-900 dark:text-rose-200">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider">Heart Rate</span>
                  <Heart className="h-4 w-4 text-rose-500 animate-pulse" />
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

          {/* ── Main Charts Panel (EKG Wave Layout) ───────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            
            {/* Real-time Telemetry sparkline panels */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="font-display text-base font-semibold text-foreground">
                    Telemetry Continuous Waveforms (Real-time ECG & Pulse Oximetry)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Heart Rate / EKG */}
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-rose-500 font-semibold font-mono">
                      <span>ECG TELEMETRY (I) - HR: {activeVitals.pulse || '—'} bpm</span>
                      <span>100% telemetry connection</span>
                    </div>
                    {renderEKG('text-rose-500')}
                  </div>

                  {/* BP Line */}
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-sky-500 font-semibold font-mono">
                      <span>ART PRESSURE TELEMETRY (ABP) - BP: {activeVitals.systolicBp}/{activeVitals.diastolicBp} mmHg</span>
                      <span>Systolic limit override authorized</span>
                    </div>
                    {renderEKG('text-sky-500')}
                  </div>

                  {/* SpO2 Line */}
                  <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-teal-500 font-semibold font-mono">
                      <span>PULSE OXIMETRY (PLETH) - SpO₂: {activeVitals.spo2 || '—'}%</span>
                      <span>O₂ Device: {activeVitals.oxygenDevice || 'Room Air'}</span>
                    </div>
                    {renderEKG('text-teal-500')}
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-mono text-xs uppercase">Time</TableHead>
                        <TableHead className="font-mono text-xs uppercase text-right">HR</TableHead>
                        <TableHead className="font-mono text-xs uppercase text-right">BP</TableHead>
                        <TableHead className="font-mono text-xs uppercase text-right">SpO₂</TableHead>
                        <TableHead className="font-mono text-xs uppercase text-right">RR</TableHead>
                        <TableHead className="font-mono text-xs uppercase text-right">Temp</TableHead>
                        <TableHead className="font-mono text-xs uppercase">O₂ Info</TableHead>
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
                          <TableCell className="text-xs font-sans">
                            {v.oxygenDevice} {v.oxygenFlowRate ? `(${v.oxygenFlowRate} L/min)` : ''}
                          </TableCell>
                          <TableCell className="text-xs font-sans font-semibold">
                            {v.recordedBy?.firstName} {v.recordedBy?.lastName}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                  <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                    <span className="font-sans text-muted-foreground">WBC</span>
                    <span className="font-mono font-bold font-tnum text-destructive">22.4 K/μL (High)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                    <span className="font-sans text-muted-foreground">Lactate</span>
                    <span className="font-mono font-bold font-tnum text-destructive">4.2 mmol/L (High)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                    <span className="font-sans text-muted-foreground">Procalcitonin</span>
                    <span className="font-mono font-bold font-tnum text-destructive">38.2 ng/mL (High)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                    <span className="font-sans text-muted-foreground">CRP</span>
                    <span className="font-mono font-bold font-tnum text-destructive">284 mg/L (High)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="font-sans text-muted-foreground">Creatinine</span>
                    <span className="font-mono font-bold font-tnum text-destructive">2.8 mg/dL (High)</span>
                  </div>
                </CardContent>
              </Card>

              {/* Active Medications */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Active Vasopressor Infusions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Norepinephrine</h4>
                      <p className="text-[10px] text-muted-foreground font-mono font-tnum mt-0.5">0.15 mcg/kg/min</p>
                    </div>
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-semibold py-0.5">
                      LIVE
                    </Badge>
                  </div>
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
                  <div className="relative text-xs">
                    <span className="absolute -left-5 top-1 h-2 w-2 rounded-full bg-destructive" />
                    <span className="font-mono font-semibold font-tnum block text-muted-foreground">16:30</span>
                    <span className="font-sans font-semibold text-foreground">Lactate 4.2 - Critical Alert flagged</span>
                  </div>

                  <div className="relative text-xs">
                    <span className="absolute -left-5 top-1 h-2 w-2 rounded-full bg-primary" />
                    <span className="font-mono font-semibold font-tnum block text-muted-foreground">16:00</span>
                    <span className="font-sans font-semibold text-foreground">Broad spectrum antibiotics started</span>
                  </div>

                  <div className="relative text-xs">
                    <span className="absolute -left-5 top-1 h-2 w-2 rounded-full bg-secondary" />
                    <span className="font-mono font-semibold font-tnum block text-muted-foreground">15:45</span>
                    <span className="font-sans font-semibold text-foreground">Cultures ×2 drawn (Blood & Urine)</span>
                  </div>

                  <div className="relative text-xs">
                    <span className="absolute -left-5 top-1 h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-mono font-semibold font-tnum block text-muted-foreground">15:30</span>
                    <span className="font-sans font-semibold text-foreground">Norepinephrine infusion started</span>
                  </div>

                  <div className="relative text-xs">
                    <span className="absolute -left-5 top-1 h-2 w-2 rounded-full bg-primary" />
                    <span className="font-mono font-semibold font-tnum block text-muted-foreground">14:10</span>
                    <span className="font-sans font-semibold text-foreground">Admitted to CCU-7 / B5 (Sepsis query)</span>
                  </div>
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
    </div>
  );
}
