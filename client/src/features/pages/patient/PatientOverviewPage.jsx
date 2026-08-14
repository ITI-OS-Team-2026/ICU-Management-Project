import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Clipboard,
  User,
  Bed,
  Stethoscope,
  Clock,
  FileText,
  AlertTriangle,
  MapPin,
  Briefcase,
  Heart,
  Hand,
  Hash,
  IdCard,
  Activity,
  Users,
  Pill,
  FlaskConical,
  ShieldAlert,
  History,
  TrendingUp,
  Droplets,
  Pencil,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { patientsService } from '../../services/patientsService';
import { useVitals } from '../../hooks/useVitals';
import { VitalTrendChart, BloodPressureTrendChart, TimeRangeSelector } from '../../components/VitalTrendChart';

const OVERVIEW_TREND_CONFIGS = [
  { title: 'Heart Rate', unit: 'bpm', icon: Heart, dataKey: 'pulse', ariaLabel: 'Heart rate trend chart' },
  { title: 'SpO₂', unit: '%', icon: Droplets, dataKey: 'spo2', ariaLabel: 'Oxygen saturation trend chart' },
  { title: 'MAP', unit: 'mmHg', icon: Activity, dataKey: 'map', ariaLabel: 'Mean arterial pressure trend chart' },
];

/* ================================================================
   Helpers
   ================================================================ */

function formatDate(value, pattern = 'MMM d, yyyy · h:mm a') {
  if (!value) return null;
  try {
    return format(new Date(value), pattern);
  } catch {
    return null;
  }
}

function computeLOS(admittedAt, dischargedAt) {
  if (!admittedAt) return null;
  const start = new Date(admittedAt);
  const end = dischargedAt ? new Date(dischargedAt) : new Date();
  const diffMs = end - start;
  if (diffMs < 0) return null;
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (totalHours < 24) return `${totalHours}h`;
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function getStatusVariant(status) {
  switch (status) {
    case 'ACTIVE': return 'default';
    case 'DISCHARGED': return 'secondary';
    case 'ARCHIVED': return 'outline';
    default: return 'outline';
  }
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

/* ================================================================
   Sub-components
   ================================================================ */

function InfoRow({ icon: Icon, label, value, mono = false }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex items-center justify-center h-5 w-5 shrink-0 mt-0.5">
        <Icon size={13} className="text-muted-foreground" />
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`font-sans text-sm text-foreground leading-relaxed break-words ${mono ? 'font-tnum' : ''}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h3 className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
      {children}
    </h3>
  );
}

function NurseAssignmentList({ nurses }) {
  const activeNurses = nurses?.filter((n) => !n.unassigned_at) || [];
  if (activeNurses.length === 0) {
    return <p className="font-sans text-xs text-muted-foreground">No nurses currently assigned.</p>;
  }
  return (
    <div className="space-y-2">
      {activeNurses.map((assignment) => {
        const nurse = assignment.nurse;
        if (!nurse) return null;
        const name = `${nurse.first_name || ''} ${nurse.last_name || ''}`.trim();
        return (
          <div key={assignment.id} className="flex items-center gap-2.5">
            <Avatar size="sm">
              <AvatarFallback className="text-[10px] font-bold">{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="font-sans text-sm font-medium text-foreground truncate">{name || 'Unknown'}</span>
              <span className="font-sans text-[10px] text-muted-foreground font-tnum">
                Since {formatDate(assignment.assigned_at, 'MMM d, h:mm a') || '—'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PreviousInvestigationsDisplay({ data }) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) return null;
  return (
    <div className="space-y-1.5">
      {Object.entries(data).map(([key, value]) => {
        if (value === null || value === undefined || value === '' || value === false) return null;
        return (
          <div key={key} className="flex items-start gap-2">
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 min-w-[100px] mt-0.5">
              {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (s) => s.toUpperCase())}
            </span>
            <span className="font-sans text-xs text-foreground break-words">{String(value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function TrendChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-7 w-16" />
            <Separator className="bg-border" />
            <Skeleton className="h-[180px] w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ================================================================
   Main Page Component
   ================================================================ */
export default function PatientOverviewPage() {
  const { admission, refetch } = useOutletContext();
  const { vitals, isLoading: vitalsLoading } = useVitals(admission?.id, 50);
  
  const [extraData, setExtraData] = useState({
    diagnoses: [],
    medications: [],
    labs: [],
    allergies: [],
    history: null,
    isLoading: true,
  });

  // Reconcile / Edit Patient Identity Dialog state
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [reconcileError, setReconcileError] = useState(null);
  const [reconcileForm, setReconcileForm] = useState({
    name: '',
    national_id: '',
    age: '',
    gender: '',
    residence: '',
  });

  // Everything still in the differential — confirmed conditions plus the ones
  // being worked up. Ruled-out and resolved entries belong to the closed record.
  const activeDiagnoses = extraData.diagnoses.filter((d) =>
    ['CONFIRMED', 'SUSPECTED'].includes(d.status)
  );

  const [showAllDiagnoses, setShowAllDiagnoses] = useState(false);
  const [showAllMeds, setShowAllMeds] = useState(false);
  const [showAllLabs, setShowAllLabs] = useState(false);

  useEffect(() => {
    if (!admission?.id || !admission?.patient_id) return;
    
    let isMounted = true;
    
    const fetchExtraData = async () => {
      try {
        const [diagnoses, medications, labs, allergies, history] = await Promise.all([
          patientsService.getDiagnoses(admission.id).catch(() => []),
          patientsService.getMedications(admission.id).catch(() => []),
          patientsService.getLabs(admission.id).catch(() => []),
          patientsService.getAllergies(admission.patient_id).catch(() => []),
          patientsService.getMedicalHistory(admission.patient_id).catch(() => null),
        ]);
        
        if (isMounted) {
          setExtraData({ diagnoses, medications, labs, allergies, history, isLoading: false });
        }
      } catch (error) {
        console.error("Failed to load extra clinical data", error);
        if (isMounted) setExtraData(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchExtraData();
    
    return () => { isMounted = false; };
  }, [admission?.id, admission?.patient_id]);

  const [overviewTimeRange, setOverviewTimeRange] = useState('all');

  const patient = admission?.patient;
  const bed = admission?.bed;
  const doctor = admission?.doctor;
  const nurses = admission?.nurses;

  const los = computeLOS(admission?.admitted_at, admission?.discharged_at);

  const handleOpenReconcile = () => {
    setReconcileError(null);
    setReconcileForm({
      name: patient?.name || '',
      national_id: patient?.national_id || '',
      age: patient?.age != null ? String(patient.age) : '',
      gender: patient?.gender || '',
      residence: patient?.residence || '',
    });
    setIsReconcileOpen(true);
  };

  const handleNationalIdInput = (val) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 14);
    let derivedGender = reconcileForm.gender;
    let derivedAge = reconcileForm.age;

    if (digitsOnly.length === 14) {
      const genderDigit = parseInt(digitsOnly[12], 10);
      if (!isNaN(genderDigit)) {
        derivedGender = genderDigit % 2 === 0 ? 'FEMALE' : 'MALE';
      }

      const centuryDigit = parseInt(digitsOnly[0], 10);
      const yearStr = digitsOnly.substring(1, 3);
      const monthStr = digitsOnly.substring(3, 5);
      const dayStr = digitsOnly.substring(5, 7);

      if (!isNaN(centuryDigit) && centuryDigit >= 2 && centuryDigit <= 3) {
        const century = centuryDigit === 2 ? 1900 : 2000;
        const year = century + parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10) - 1;
        const day = parseInt(dayStr, 10);

        const birthDate = new Date(year, month, day);
        const today = new Date();

        let calcAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calcAge--;
        }

        if (calcAge >= 0 && calcAge <= 150) {
          derivedAge = String(calcAge);
        }
      }
    }

    setReconcileForm((prev) => ({
      ...prev,
      national_id: digitsOnly,
      gender: derivedGender,
      age: derivedAge,
    }));
  };

  const handleSaveReconcile = async () => {
    if (!patient?.id) return;
    if (!reconcileForm.name.trim()) {
      setReconcileError('Patient full name is required.');
      return;
    }
    if (reconcileForm.national_id && reconcileForm.national_id.length !== 14) {
      setReconcileError('If provided, National ID must be exactly 14 digits.');
      return;
    }

    try {
      setIsSavingPatient(true);
      setReconcileError(null);

      const payload = {
        name: reconcileForm.name.trim(),
        national_id: reconcileForm.national_id ? reconcileForm.national_id.trim() : null,
        age: reconcileForm.age ? parseInt(reconcileForm.age, 10) : undefined,
        gender: reconcileForm.gender || null,
        residence: reconcileForm.residence ? reconcileForm.residence.trim() : null,
      };

      await patientsService.updatePatient(patient.id, payload);
      if (typeof refetch === 'function') {
        await refetch();
      }
      setIsReconcileOpen(false);
    } catch (err) {
      console.error('Failed to update patient identity:', err);
      setReconcileError(err?.response?.data?.message || err?.message || 'Failed to update patient details.');
    } finally {
      setIsSavingPatient(false);
    }
  };
  const doctorName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="p-4 sm:p-6 space-y-6">
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clipboard className="w-5 h-5 text-primary" />
            <div>
              <h1 className="font-display text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                Patient Overview
              </h1>
              <p className="font-sans text-xs text-muted-foreground mt-0.5">
                Clinical summary and admission details.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {admission?.status && (
              <Badge variant={getStatusVariant(admission.status)} className="font-sans text-[11px] uppercase tracking-wider">
                {admission.status}
              </Badge>
            )}
            {los && (
              <Tooltip>
                <TooltipTrigger render={
                  <span className="font-tnum font-sans text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded cursor-help" />
                }>
                    LOS: {los}
                </TooltipTrigger>
                <TooltipContent side="bottom">Length of Stay since admission</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <Separator className="bg-border" />

        {/* ── First Grid: Demographics, Admission Details, Transfer & Prior Info ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Patient Demographics */}
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                <User size={14} className="text-muted-foreground" />
                Patient Information
              </CardTitle>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleOpenReconcile}
                className="h-6 px-2 text-[11px] font-sans text-muted-foreground hover:text-primary gap-1"
                title="Update / Reconcile Patient Identity"
              >
                <Pencil size={11} />
                {patient?.national_id ? 'Edit ID' : 'Reconcile ID'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              <InfoRow icon={User} label="Full Name" value={patient?.name} />
              <InfoRow icon={Hash} label="MRN" value={patient?.mrn} mono />
              {patient?.national_id ? (
                <InfoRow icon={IdCard} label="National ID" value={patient?.national_id} mono />
              ) : (
                <div className="flex items-start gap-3 py-2">
                  <div className="flex items-center justify-center h-5 w-5 shrink-0 mt-0.5">
                    <IdCard size={13} className="text-amber-500" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      National ID
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] font-sans border-amber-500/30 text-amber-600 bg-amber-500/10">
                        Emergency Unknown ID · Pending
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              <InfoRow
                icon={User}
                label="Age / Gender"
                value={patient?.age != null ? `${patient.age} years${patient?.gender ? ` · ${patient.gender}` : ''}` : patient?.gender || null}
              />
              <InfoRow icon={Heart} label="Marital Status" value={patient?.marital_status} />
              <InfoRow icon={MapPin} label="Residence" value={patient?.residence} />
              <InfoRow icon={Briefcase} label="Occupation" value={patient?.occupation} />
              <InfoRow icon={Hand} label="Handedness" value={patient?.handedness} />
              <InfoRow 
                icon={Users} 
                label="Children" 
                value={patient?.children_count != null ? `${patient.children_count} ${patient.children_count === 1 ? 'child' : 'children'}${patient.youngest_child_age ? ` (Youngest: ${patient.youngest_child_age})` : ''}` : null} 
              />
            </CardContent>
          </Card>

          {/* Admission Details */}
          <Card className="border-border lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                <FileText size={14} className="text-muted-foreground" />
                Admission Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-1">
                <InfoRow icon={Clock} label="Admitted At" value={formatDate(admission?.admitted_at)} mono />
                {admission?.discharged_at && <InfoRow icon={Clock} label="Discharged At" value={formatDate(admission?.discharged_at)} mono />}
                <InfoRow icon={Bed} label="Bed" value={bed?.bed_number} />
                <InfoRow icon={AlertTriangle} label="Chief Complaint" value={admission?.chief_complaint} />
                <InfoRow icon={Stethoscope} label="Provisional Diagnosis" value={admission?.provisional_diagnosis} />
                <InfoRow icon={FileText} label="Complaint Analysis" value={admission?.complaint_analysis} />
              </div>

              {/* Symptoms */}
              {(admission?.symptoms_related_system || admission?.symptoms_other_systems) && (
                <>
                  <Separator className="bg-border" />
                  <div className="space-y-1">
                    <SectionLabel>Symptoms</SectionLabel>
                    <InfoRow icon={Activity} label="Related System" value={admission?.symptoms_related_system} />
                    <InfoRow icon={Activity} label="Other Systems" value={admission?.symptoms_other_systems} />
                  </div>
                </>
              )}

              {/* Transfer Details */}
              {(admission?.transfer_reason || admission?.place_of_transfer || admission?.transfer_doctor_name) && (
                <>
                  <Separator className="bg-border" />
                  <div className="space-y-1">
                    <SectionLabel>Transfer Details</SectionLabel>
                    <InfoRow icon={FileText} label="Reason for Transfer" value={admission?.transfer_reason} />
                    <InfoRow icon={MapPin} label="Place of Transfer" value={admission?.place_of_transfer} />
                    <InfoRow icon={Stethoscope} label="Transfer Doctor" value={admission?.transfer_doctor_name} />
                  </div>
                </>
              )}

              {/* Previous Treatments & Investigations */}
              {(admission?.previous_treatments || (admission?.previous_investigations && Object.keys(admission.previous_investigations).length > 0)) && (
                <>
                  <Separator className="bg-border" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {admission?.previous_treatments && (
                      <div className="space-y-1">
                        <SectionLabel>Previous Treatments</SectionLabel>
                        <p className="font-sans text-sm text-foreground leading-relaxed">
                          {admission.previous_treatments}
                        </p>
                      </div>
                    )}
                    {admission?.previous_investigations && Object.keys(admission.previous_investigations).length > 0 && (
                      <div className="space-y-2">
                        <SectionLabel>Previous Investigations</SectionLabel>
                        <PreviousInvestigationsDisplay data={admission.previous_investigations} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Key Physiological Trends Section ──────────────────────────────── */}
        <section aria-label="Key physiological trends">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-sans text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              Key Physiological Trends
            </h2>
            <div className="flex items-center gap-3">
              <TimeRangeSelector value={overviewTimeRange} onChange={setOverviewTimeRange} />
              {vitals && vitals.length > 0 && (
                <span className="font-sans text-xs text-muted-foreground hidden sm:inline">
                  {vitals.length} {vitals.length === 1 ? 'reading' : 'readings'}
                </span>
              )}
            </div>
          </div>
          {vitalsLoading ? (
            <TrendChartsSkeleton />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
              {OVERVIEW_TREND_CONFIGS.map((trend) => (
                <VitalTrendChart
                  key={trend.dataKey}
                  {...trend}
                  data={vitals}
                  timeRange={overviewTimeRange}
                  onTimeRangeChange={setOverviewTimeRange}
                />
              ))}
              <BloodPressureTrendChart
                data={vitals}
                ariaLabel="Blood pressure trend chart"
                timeRange={overviewTimeRange}
                onTimeRangeChange={setOverviewTimeRange}
              />
            </div>
          )}
        </section>

        <Separator className="bg-border" />

        {/* ── Second Grid: Clinical Status (History, Diagnoses, Medications, Labs) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Medical History & Allergies */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                <History size={14} className="text-muted-foreground" />
                History & Allergies
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {extraData.isLoading ? (
                <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
              ) : (
                <>
                  <div className="space-y-2">
                    <SectionLabel>Allergies</SectionLabel>
                    {extraData.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {extraData.allergies.map((allergy) => (
                          <Badge key={allergy.id} variant="destructive" className="font-sans text-xs flex items-center gap-1">
                            <ShieldAlert size={12} /> {allergy.allergen} ({allergy.severity})
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="font-sans text-xs text-muted-foreground">No known allergies.</p>
                    )}
                  </div>
                  
                  <Separator className="bg-border" />
                  
                  <div className="space-y-2">
                    <SectionLabel>Past Medical History</SectionLabel>
                    {extraData.history ? (
                      <ul className="font-sans text-sm text-foreground list-disc pl-4 space-y-1">
                        {extraData.history.diabetes_dm && <li>Diabetes Mellitus</li>}
                        {extraData.history.hypertension_htn && <li>Hypertension</li>}
                        {extraData.history.blood_transfusion && <li>Blood Transfusion</li>}
                        {extraData.history.past_diseases?.map((d, i) => <li key={i}>{d}</li>)}
                        {extraData.history.previous_operations && <li>Previous Operations: {extraData.history.operations_details}</li>}
                        {extraData.history.special_habits && <li>Special Habits: {extraData.history.special_habits}</li>}
                        {!extraData.history.diabetes_dm && !extraData.history.hypertension_htn && !extraData.history.blood_transfusion && !extraData.history.special_habits && (!extraData.history.past_diseases || extraData.history.past_diseases.length === 0) && (
                          <span className="text-muted-foreground text-xs">No significant past medical history.</span>
                        )}
                      </ul>
                    ) : (
                      <p className="font-sans text-xs text-muted-foreground">No history recorded.</p>
                    )}
                  </div>

                  {extraData.history?.menstrual_history && Object.keys(extraData.history.menstrual_history).length > 0 && (
                    <>
                      <Separator className="bg-border" />
                      <div className="space-y-2">
                        <SectionLabel>Menstrual History</SectionLabel>
                        <PreviousInvestigationsDisplay data={extraData.history.menstrual_history} />
                      </div>
                    </>
                  )}

                  {extraData.history?.obstetric_history && Object.keys(extraData.history.obstetric_history).length > 0 && (
                    <>
                      <Separator className="bg-border" />
                      <div className="space-y-2">
                        <SectionLabel>Obstetric History</SectionLabel>
                        <PreviousInvestigationsDisplay data={extraData.history.obstetric_history} />
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Active Diagnoses & Medications */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                <Activity size={14} className="text-muted-foreground" />
                Active Care
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {extraData.isLoading ? (
                <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
              ) : (
                <>
                  <div className="space-y-2">
                    <SectionLabel>Active Diagnoses</SectionLabel>
                    {activeDiagnoses.length > 0 ? (
                      <ul className="font-sans text-sm text-foreground space-y-1.5">
                        {activeDiagnoses.slice(0, showAllDiagnoses ? undefined : 5).map(d => (
                          <li key={d.id} className="flex items-start gap-2">
                            <Stethoscope size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                            <span>{d.conditionName}</span>
                          </li>
                        ))}
                        {activeDiagnoses.length > 5 && !showAllDiagnoses && (
                          <li 
                            className="text-xs text-primary font-medium pl-6 cursor-pointer hover:underline"
                            onClick={() => setShowAllDiagnoses(true)}
                          >
                            + {activeDiagnoses.length - 5} more
                          </li>
                        )}
                        {showAllDiagnoses && activeDiagnoses.length > 5 && (
                          <li 
                            className="text-xs text-muted-foreground font-medium pl-6 cursor-pointer hover:underline"
                            onClick={() => setShowAllDiagnoses(false)}
                          >
                            Show less
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p className="font-sans text-xs text-muted-foreground">No active diagnoses.</p>
                    )}
                  </div>

                  <Separator className="bg-border" />

                  <div className="space-y-2">
                    <SectionLabel>Current Medications</SectionLabel>
                    {extraData.medications.filter(m => m.isActive).length > 0 ? (
                      <ul className="font-sans text-sm text-foreground space-y-1.5">
                        {extraData.medications.filter(m => m.isActive).slice(0, showAllMeds ? undefined : 5).map(m => (
                          <li key={m.id} className="flex items-start gap-2">
                            <Pill size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                            <span>
                              <span className="font-medium">{m.drugName}</span> {m.dosage} <span className="text-muted-foreground text-xs ml-1">({m.frequency})</span>
                            </span>
                          </li>
                        ))}
                        {extraData.medications.filter(m => m.isActive).length > 5 && !showAllMeds && (
                          <li 
                            className="text-xs text-primary font-medium pl-6 cursor-pointer hover:underline"
                            onClick={() => setShowAllMeds(true)}
                          >
                            + {extraData.medications.filter(m => m.isActive).length - 5} more
                          </li>
                        )}
                        {showAllMeds && extraData.medications.filter(m => m.isActive).length > 5 && (
                          <li 
                            className="text-xs text-muted-foreground font-medium pl-6 cursor-pointer hover:underline"
                            onClick={() => setShowAllMeds(false)}
                          >
                            Show less
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p className="font-sans text-xs text-muted-foreground">No active medications.</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Third Grid: Recent Labs & Care Team ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
           {/* Recent Labs */}
           <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                <FlaskConical size={14} className="text-muted-foreground" />
                Recent Abnormal Labs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {extraData.isLoading ? (
                <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
              ) : (
                <div className="space-y-2">
                  {extraData.labs.filter(l => l.abnormal).length > 0 ? (
                    <div className="space-y-2">
                      {extraData.labs.filter(l => l.abnormal).slice(0, showAllLabs ? undefined : 5).map(l => (
                        <div key={l.id} className="flex items-center justify-between">
                          <span className="font-sans text-sm text-foreground">{l.testName}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-tnum font-bold text-destructive text-sm">{l.resultValue}</span>
                            <span className="font-sans text-[10px] text-muted-foreground">{formatDate(l.recordedAt, 'MMM d, h:mm a')}</span>
                          </div>
                        </div>
                      ))}
                      {extraData.labs.filter(l => l.abnormal).length > 5 && !showAllLabs && (
                         <div 
                           className="text-xs text-primary font-medium cursor-pointer hover:underline"
                           onClick={() => setShowAllLabs(true)}
                         >
                           + {extraData.labs.filter(l => l.abnormal).length - 5} more
                         </div>
                      )}
                      {showAllLabs && extraData.labs.filter(l => l.abnormal).length > 5 && (
                         <div 
                           className="text-xs text-muted-foreground font-medium cursor-pointer hover:underline"
                           onClick={() => setShowAllLabs(false)}
                         >
                           Show less
                         </div>
                      )}
                    </div>
                  ) : (
                    <p className="font-sans text-xs text-muted-foreground">No recent abnormal labs.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Care Team */}
          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                  <Stethoscope size={14} className="text-muted-foreground" />
                  Attending Physician
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {doctor ? (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {getInitials(`${doctor.first_name} ${doctor.last_name}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-sans text-sm font-medium text-foreground truncate">
                        {doctorName}
                      </span>
                      <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider">
                        {doctor.role?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="font-sans text-xs text-muted-foreground">
                    No attending physician assigned.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                  <Users size={14} className="text-muted-foreground" />
                  Assigned Nurses
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <NurseAssignmentList nurses={nurses} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Reconcile / Edit Patient Identity Dialog ─────────────────────────── */}
      <Dialog open={isReconcileOpen} onOpenChange={(open) => !isSavingPatient && setIsReconcileOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <IdCard className="h-4 w-4" />
              </div>
              <DialogTitle className="font-display text-base font-bold text-foreground">
                {patient?.national_id ? 'Update Patient Demographics' : 'Reconcile Patient Identity'}
              </DialogTitle>
            </div>
            <DialogDescription className="font-sans text-xs text-muted-foreground pt-1 leading-relaxed">
              Link the patient's verified National ID and update identity records. All ICU telemetry and clinical history will remain preserved.
            </DialogDescription>
          </DialogHeader>

          {reconcileError && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              <AlertTitle className="font-bold text-xs">Update Failed</AlertTitle>
              <AlertDescription className="text-xs">{reconcileError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="rec-name" className="font-sans text-xs font-semibold text-foreground">
                Patient Verified Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rec-name"
                value={reconcileForm.name}
                onChange={(e) => setReconcileForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter verified official name"
                className="font-sans text-xs"
                disabled={isSavingPatient}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-natid" className="font-sans text-xs font-semibold text-foreground">
                14-Digit National ID
              </Label>
              <Input
                id="rec-natid"
                inputMode="numeric"
                maxLength={14}
                value={reconcileForm.national_id}
                onChange={(e) => handleNationalIdInput(e.target.value)}
                placeholder="Enter 14-digit National ID"
                className="font-mono text-xs font-tnum"
                disabled={isSavingPatient}
              />
              <p className="font-sans text-[10px] text-muted-foreground">
                Entering 14 digits automatically computes Age and Gender from Egyptian Civil Registry format.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rec-age" className="font-sans text-xs font-semibold text-foreground">
                  Age (Years)
                </Label>
                <Input
                  id="rec-age"
                  type="number"
                  min={0}
                  max={150}
                  value={reconcileForm.age}
                  onChange={(e) => setReconcileForm((prev) => ({ ...prev, age: e.target.value }))}
                  placeholder="e.g. 45"
                  className="font-sans text-xs font-tnum"
                  disabled={isSavingPatient}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rec-gender" className="font-sans text-xs font-semibold text-foreground">
                  Gender
                </Label>
                <Select
                  value={reconcileForm.gender || 'UNKNOWN'}
                  onValueChange={(val) => setReconcileForm((prev) => ({ ...prev, gender: val === 'UNKNOWN' ? '' : val }))}
                  disabled={isSavingPatient}
                >
                  <SelectTrigger id="rec-gender" className="font-sans text-xs">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="UNKNOWN">Not Specified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-residence" className="font-sans text-xs font-semibold text-foreground">
                Residence / Address (Optional)
              </Label>
              <Input
                id="rec-residence"
                value={reconcileForm.residence}
                onChange={(e) => setReconcileForm((prev) => ({ ...prev, residence: e.target.value }))}
                placeholder="City, Governorate, or Address"
                className="font-sans text-xs"
                disabled={isSavingPatient}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReconcileOpen(false)}
              disabled={isSavingPatient}
              className="font-sans text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveReconcile}
              disabled={isSavingPatient}
              className="font-sans text-xs font-semibold gap-1.5"
            >
              {isSavingPatient ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving Identity...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Save Identity
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
