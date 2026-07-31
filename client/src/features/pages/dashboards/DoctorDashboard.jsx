import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Users,
  UserPlus,
} from 'lucide-react';

import { useDashboard } from '../../hooks/useDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardRagAssistant from '../../components/rag/DashboardRagAssistant';

export default function DoctorDashboard({ user, greetingName, currentFormattedDate }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { stats, admissions, activities, isLoading } = useDashboard();

  // The assistant is scoped to one admission at a time; the selection lives in
  // the URL so a shared link opens on the same patient.
  const activeAdmissionId = searchParams.get('admissionId') || admissions[0]?.id || '';

  const handlePatientSelect = (val) => {
    setSearchParams({ admissionId: val });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Header Greeting Section ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Clinical Workbench
          </span>
          <h1 className="font-display text-headline text-foreground font-bold">
            Good morning, {greetingName}
          </h1>
          <p className="text-sm font-sans text-muted-foreground mt-0.5">
            {currentFormattedDate} · Critical Care Unit
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.criticalCases > 0 ? (
            <Badge variant="destructive" className="animate-pulse gap-1.5 py-1.5 px-3 border border-destructive/20 font-sans font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
              {stats.criticalCases} Critical Patients
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-status-available/10 text-status-available border-status-available/30 font-sans font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-status-available" />
              All Patients Stable
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate('/patients/admit')} className="ml-2">
            <UserPlus className="h-4 w-4 mr-2" />
            Admit Patient
          </Button>
        </div>
      </div>

      {/* ── Workbench Layout columns ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (RAG AI Assistant — the main tool) */}
        <div className="lg:col-span-2 flex flex-col">
          <DashboardRagAssistant
            admissions={admissions}
            activeAdmissionId={activeAdmissionId}
            onSelectAdmission={handlePatientSelect}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column (Clinical Overview) */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <StatsCard
              title="My Patients"
              value={isLoading ? '-' : stats.activePatients}
              icon={Users}
              iconClass="text-primary bg-primary/10"
            />
            <StatsCard
              title="Pending Labs"
              value={isLoading ? '-' : stats.pendingLabs}
              icon={Activity}
              iconClass="text-status-reserved bg-status-reserved/10"
            />
          </div>
          
          <Card className="rounded-[1.25rem] border-border bg-card shadow-2xs flex flex-col flex-1">
            <CardHeader className="pb-3 pt-5 px-6 border-b border-border/50">
              <CardTitle className="font-display text-sm font-bold text-foreground">
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-6 flex flex-col justify-between gap-6">
              <div className="space-y-5">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="flex gap-3">
                      <Skeleton className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-2.5 w-2/3" />
                      </div>
                    </div>
                  ))
                ) : activities.filter(a => a.type === 'alert' || a.type === 'vitals').length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8">
                    <span className="text-sm font-sans text-muted-foreground">No alerts for now</span>
                  </div>
                ) : (
                  activities.filter(a => a.type === 'alert' || a.type === 'vitals').slice(0, 4).map((act, idx) => (
                    <div key={idx} className="flex gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 ${act.dotColor}`} />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-sans text-xs font-bold text-foreground truncate">
                          {act.title}
                        </span>
                        <span className="font-sans text-[11px] text-muted-foreground mt-0.5">
                          {act.desc}
                        </span>
                      </div>
                      <span className="font-tnum text-[10px] text-muted-foreground shrink-0 mt-0.5 whitespace-nowrap ml-2">
                        {act.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, iconClass }) {
  return (
    <Card className="shadow-2xs border-border bg-card rounded-xl overflow-hidden">
      <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
        <div className="flex justify-between items-start">
          <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <span className="font-tnum text-2xl font-bold leading-none text-foreground mt-2">
          {value}
        </span>
      </CardContent>
    </Card>
  );
}
