import { useEffect, useState } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Pill,
  Stethoscope,
  StickyNote,
  FileText,
  ClipboardList,
  ShieldCheck,
  Bell,
  Bot,
  MessageSquareText,
  LayoutDashboard,
  RefreshCcw,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { patientsService } from '../services/patientsService';
import { useShortcuts } from '../hooks/useShortcuts';
import { useAuthStore } from '../store/authStore';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
// `roles` restricts a tab to specific roles; omit it for tabs everyone sees.
const CLINICIAN_ROLES = ['MEDICAL_RESIDENT', 'ICU_SPECIALIST'];

const TABS = [
  { label: 'Overview',     path: '',             icon: LayoutDashboard },
  { label: 'Vitals',       path: 'vitals',       icon: Activity },
  { label: 'Diagnoses',    path: 'diagnoses',    icon: Stethoscope },
  { label: 'Timeline',     path: 'timeline',     icon: Clock },
  { label: 'Documents',    path: 'documents',    icon: FileText },
  { label: 'Medications',  path: 'medications',  icon: Pill },
  { label: 'Follow Ups',   path: 'follow-ups',   icon: ClipboardList },
  { label: 'Notes',        path: 'notes',        icon: StickyNote },
  { label: 'Approvals',    path: 'treatment-approvals', icon: ShieldCheck },
  { label: 'Alerts',       path: 'alerts',       icon: Bell },
  { label: 'AI Summary',   path: 'ai-assistant', icon: Bot },
  { label: 'AI Chat',      path: 'ai-chat',      icon: MessageSquareText, roles: CLINICIAN_ROLES },
];

// ─── Acuity ───────────────────────────────────────────────────────────────────
function getAcuityMeta(vitals) {
  if (!vitals) return { acuity: 'Stable', dot: '#22c55e', riskColor: 'text-emerald-500 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30' };
  const pulse = parseInt(vitals.pulse, 10) || 75;
  const spo2  = parseInt(vitals.spo2,  10) || 98;
  const sBp   = parseInt(vitals.systolicBp, 10) || 120;
  const temp  = parseFloat(vitals.temperature) || 37.0;
  let c = 0, w = 0;
  if (spo2 < 90) c += 2; else if (spo2 < 95) w++;
  if (pulse > 130 || pulse < 45) c++; else if (pulse > 100 || pulse < 55) w++;
  if (temp > 39.0 || temp < 35.5) c++; else if (temp > 38.0 || temp < 36.0) w++;
  if (sBp > 180 || sBp < 85) c++; else if (sBp > 140 || sBp < 95) w++;
  if (c > 0) return { acuity: 'Critical', dot: '#ef4444', riskColor: 'text-red-500 border-red-300 bg-red-50 dark:bg-red-950/30' };
  if (w > 0) return { acuity: 'Watchful', dot: '#f59e0b', riskColor: 'text-amber-500 border-amber-300 bg-amber-50 dark:bg-amber-950/30' };
  return { acuity: 'Stable', dot: '#22c55e', riskColor: 'text-emerald-500 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30' };
}

function getRiskScore(vitals, acuity) {
  if (!vitals) return 25;
  const p = parseInt(vitals.pulse, 10) || 75;
  if (acuity === 'Critical') return Math.min(82 + (p % 10), 99);
  if (acuity === 'Watchful') return Math.min(55 + (p % 10), 79);
  return Math.max(18, p % 30 + 10);
}

// ─── Vital column ──────────────────────────────────────────────────────────────
// color: tailwind text class for the value
function VitalCol({ label, value, color = 'text-foreground', unit }) {
  return (
    <div className="flex flex-col items-center px-3 sm:px-4 border-r border-border last:border-0">
      <span className="font-sans text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">
        {label}
      </span>
      <span className={`font-tnum text-base sm:text-lg font-bold leading-none ${color}`}>
        {value ?? '—'}
      </span>
      {unit && (
        <span className="font-sans text-[9px] text-muted-foreground mt-0.5">{unit}</span>
      )}
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function PatientDetailLayout() {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const userRole = useAuthStore((s) => s.user?.role);

  const [admission, setAdmission] = useState(null);
  const [vitals, setVitals]       = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [found, v] = await Promise.all([
        patientsService.getAdmissionById(admissionId),
        patientsService.getLatestVitals(admissionId),
      ]);
      if (!found) throw new Error('Admission not found.');
      setAdmission(found);
      setVitals(v);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load patient.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [admissionId]);

  const patient   = admission?.patient;
  const bed       = admission?.bed;
  const doctor    = admission?.doctor;
  const initials  = patient?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '??';
  const admitDate = admission?.admitted_at
    ? new Date(admission.admitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const doctorName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : null;

  const { acuity, dot, riskColor } = getAcuityMeta(vitals);
  const riskScore = getRiskScore(vitals, acuity);
  const basePath  = `/patients/${admissionId}`;

  // Every destination here must match a child route in router.jsx. Three of
  // these used to point at paths that do not exist — `/overview` (the tab is
  // the index route), `/labs` (no such tab) and `/ai` (it is `ai-assistant`) —
  // so those keys silently did nothing.
  useShortcuts('patientDetails', {
    closePatient: () => navigate('/dashboard'),
    openOverview: () => navigate(basePath),
    openVitals: () => navigate(`${basePath}/vitals`),
    openDiagnoses: () => navigate(`${basePath}/diagnoses`),
    openMedications: () => navigate(`${basePath}/medications`),
    openNotes: () => navigate(`${basePath}/notes`),
    openDocuments: () => navigate(`${basePath}/documents`),
    openFollowUps: () => navigate(`${basePath}/follow-ups`),
    openApprovals: () => navigate(`${basePath}/treatment-approvals`),
    openAlerts: () => navigate(`${basePath}/alerts`),
    openAiAssistant: () => navigate(`${basePath}/ai-assistant`),
  });

  // ─ Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border bg-background p-4 space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-9  w-full rounded-lg" />
        </div>
        <div className="flex-1 bg-muted/20 p-4">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ─ Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <p className="text-destructive font-sans font-medium text-center">{error}</p>
        <Button variant="outline" onClick={() => navigate('/patients')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Patient List
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Fixed header shell ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-background border-b border-border shadow-sm">

        {/* ── Main header row ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 overflow-x-auto scrollbar-none">

          {/* Back button */}
          <Button
            variant="ghost" size="icon"
            onClick={() => navigate('/patients')}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </Button>

          {/* Coloured avatar */}
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-md">
            <span className="font-bold text-primary-foreground text-xs sm:text-sm tracking-wide">{initials}</span>
          </div>

          {/* Name + meta */}
          <div className="flex flex-col min-w-0 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-foreground text-base sm:text-lg leading-tight whitespace-nowrap">
                {patient?.name ?? 'Unknown Patient'}
              </span>
              {/* Acuity dot + label */}
              <span className="flex items-center gap-1 shrink-0">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />
                <span className="font-sans text-xs font-semibold" style={{ color: dot }}>{acuity}</span>
              </span>
              {/* Extra tag pills e.g. blood type as DNR-style chip */}
              {patient?.blood_type && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 shrink-0">
                  {patient.blood_type}
                </span>
              )}
              {bed?.bed_number && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-700 shrink-0">
                  {bed.bed_number}
                </span>
              )}
            </div>
            <p className="font-sans text-[11px] text-muted-foreground leading-snug whitespace-nowrap">
              {[
                patient?.mrn,
                patient?.age ? `${patient.age}y ${patient.gender ?? ''}`.trim() : null,
                doctorName,
                admitDate,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-10 w-px bg-border mx-1 shrink-0" />

          {/* ── Vital columns ─────────────────────────────────────────────── */}
          <div className="flex items-center shrink-0">
            <VitalCol
              label="HR"
              value={vitals?.pulse}
              unit="bpm"
              color={parseInt(vitals?.pulse, 10) > 100 || parseInt(vitals?.pulse, 10) < 55
                ? 'text-red-500' : 'text-red-400'}
            />
            <VitalCol
              label="BP"
              value={vitals?.systolicBp ? `${vitals.systolicBp}/${vitals.diastolicBp}` : null}
              unit="mmHg"
              color="text-blue-500 dark:text-blue-400"
            />
            <VitalCol
              label="SpO₂"
              value={vitals?.spo2 ? `${vitals.spo2}%` : null}
              color={parseInt(vitals?.spo2, 10) < 95 ? 'text-red-500' : 'text-cyan-500 dark:text-cyan-400'}
            />
            <VitalCol
              label="RR"
              value={vitals?.respiratoryRate}
              unit="/min"
              color="text-violet-500 dark:text-violet-400"
            />
            <VitalCol
              label="TEMP"
              value={vitals?.temperature ? `${vitals.temperature}°C` : null}
              color={parseFloat(vitals?.temperature) > 38 ? 'text-orange-500' : 'text-amber-500 dark:text-amber-400'}
            />
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-10 w-px bg-border mx-1 shrink-0" />

          {/* AI Risk badge */}
          <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg border-2 shrink-0 ${riskColor}`}>
            <span className="font-sans text-[9px] font-bold uppercase tracking-widest">AI Risk</span>
            <span className="font-tnum text-xl font-black leading-none">{riskScore}</span>
          </div>

          {/* Refresh — pushed to the end */}
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 shrink-0 ml-auto text-muted-foreground hover:text-foreground"
            onClick={fetchData}
            aria-label="Refresh"
          >
            <RefreshCcw size={13} />
          </Button>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <nav
          className="flex items-center overflow-x-auto scrollbar-none px-3 sm:px-5 border-t border-border/50"
          aria-label="Patient detail tabs"
        >
          {TABS.filter(({ roles }) => !roles || roles.includes(userRole)).map(({ label, path, icon: Icon }) => {
            const to = path ? `${basePath}/${path}` : basePath;
            return (
              <NavLink
                key={label}
                to={to}
                end={path === ''}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-1.5 px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm font-medium font-sans',
                    'border-b-2 transition-colors whitespace-nowrap shrink-0',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                  ].join(' ')
                }
              >
                <Icon size={13} className="shrink-0" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-muted/20">
        <Outlet context={{ admission, vitals, riskScore, acuity, refetch: fetchData }} />
      </main>

    </div>
  );
}
