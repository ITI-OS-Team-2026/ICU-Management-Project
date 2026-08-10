import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Users,
  UserPlus,
  ClipboardList,
  Stethoscope,
  Pill
} from 'lucide-react';

import { useDashboard } from '../../hooks/useDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DashboardRagAssistant from '../../components/rag/DashboardRagAssistant';
import { useShortcuts } from '../../hooks/useShortcuts';

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

  const activeIndex = admissions.findIndex(a => a.id === activeAdmissionId);

  const handleNextPatient = () => {
    if (!admissions || admissions.length === 0) return;
    const nextIndex = activeIndex < admissions.length - 1 ? activeIndex + 1 : activeIndex;
    setSearchParams({ admissionId: admissions[nextIndex].id });
  };

  const handlePrevPatient = () => {
    if (!admissions || admissions.length === 0) return;
    const prevIndex = activeIndex > 0 ? activeIndex - 1 : activeIndex;
    setSearchParams({ admissionId: admissions[prevIndex].id });
  };

  const handleOpenPatient = () => {
    if (activeAdmissionId) {
      navigate(`/patients/${activeAdmissionId}`);
    }
  };

  useShortcuts('dashboard', {
    nextPatient: handleNextPatient,
    prevPatient: handlePrevPatient,
    openPatient: handleOpenPatient,
    admitPatient: () => navigate('/patients/admit'),
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Header Greeting Section ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="font-display text-headline text-foreground font-bold text-balance">
            Good morning, {greetingName}
          </h1>
          <p className="text-sm font-sans text-muted-foreground mt-0.5">
            {currentFormattedDate} · Critical Care Unit
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stats.criticalCases > 0 ? (
            <Badge variant="destructive" className="gap-1.5 py-1.5 px-3 border border-destructive/20 font-sans font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
              {stats.criticalCases} Critical Patients
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-status-available/10 text-status-available border-status-available/30 font-sans font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-status-available" />
              All Patients Stable
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate('/patients/admit')} className="ml-2 hidden sm:flex">
            <UserPlus className="h-4 w-4 mr-2" />
            Admit Patient
          </Button>
          <Button size="icon" variant="outline" onClick={() => navigate('/patients/admit')} className="ml-1 sm:hidden">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Workbench Layout columns ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Mini Patient Census) - 3/12 */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-foreground">
              My Patients
            </h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold px-2" onClick={() => navigate('/patients')}>
              View All
            </Button>
          </div>
          
          <Card className="border-border shadow-2xs bg-card overflow-hidden flex flex-col h-[400px] lg:h-[calc(100vh-200px)]">
            <ScrollArea className="h-full">
              <div className="flex flex-col p-2 gap-1">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-md">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-2 w-1/2" />
                      </div>
                    </div>
                  ))
                ) : admissions.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground font-sans text-balance">
                    No active patients assigned.
                  </div>
                ) : (
                  admissions.map(adm => {
                    const isSelected = adm.id === activeAdmissionId;
                    const bedStr = adm.bed?.bed_number ? `Bed ${adm.bed.bed_number.split('/')[1] || adm.bed.bed_number}` : 'No Bed';
                    return (
                      <button
                        key={adm.id}
                        onClick={() => handlePatientSelect(adm.id)}
                        className={`flex flex-col gap-1 p-3 rounded-lg text-left transition-colors border ${
                          isSelected 
                            ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/20' 
                            : 'bg-transparent border-transparent hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-sans text-sm font-semibold text-foreground truncate">
                            {adm.patient?.name || 'Unknown'}
                          </span>
                          {adm.isCritical && (
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                          )}
                        </div>
                        <span className="font-sans text-xs text-muted-foreground truncate">
                          {bedStr} · {adm.reasonForAdmission?.split(' ')[0] || 'Observation'}...
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        <div className="lg:col-span-5 flex flex-col h-[800px] lg:h-[calc(100vh-200px)]">
          <DashboardRagAssistant
            admissions={admissions}
            activeAdmissionId={activeAdmissionId}
            onSelectAdmission={handlePatientSelect}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column (Clinical Overview & Feed) - 4/12 */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-[500px] lg:h-[calc(100vh-200px)]">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 gap-4 shrink-0">
            <StatsCard
              title="Active Patients"
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
          
          {/* Unified Clinical Feed */}
          <div className="flex flex-col flex-1 min-h-0">
            <Tabs defaultValue="critical" className="w-full flex flex-col h-full">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="font-display text-sm font-bold text-foreground">
                  Clinical Feed
                </h2>
                <TabsList className="h-8">
                  <TabsTrigger value="critical" className="text-xs px-3">Critical</TabsTrigger>
                  <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
                </TabsList>
              </div>

              <Card className="flex-1 border-border shadow-2xs bg-card overflow-hidden min-h-0">
                <TabsContent value="critical" className="p-0 m-0 border-none outline-none h-full min-h-0 data-[state=active]:flex flex-col">
                  <ScrollArea className="flex-1 h-full">
                    <FeedList 
                      isLoading={isLoading} 
                      activities={activities.filter(a => a.type === 'alert' || a.type === 'vitals')} 
                      emptyTitle="All patients stable."
                      emptyDesc="No critical alerts or vitals deviations in the current shift."
                    />
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="all" className="p-0 m-0 border-none outline-none h-full min-h-0 data-[state=active]:flex flex-col">
                  <ScrollArea className="flex-1 h-full">
                    <FeedList 
                      isLoading={isLoading} 
                      activities={activities} 
                      emptyTitle="No recent activity."
                      emptyDesc="No clinical events recorded recently."
                    />
                  </ScrollArea>
                </TabsContent>
              </Card>
            </Tabs>
          </div>

          {/* Quick Actions (Ghost Buttons) */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            <Button variant="ghost" className="flex flex-col items-center justify-center gap-2 h-auto py-3 bg-muted/30 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-colors">
              <Stethoscope className="h-4 w-4" />
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">Order Lab</span>
            </Button>
            <Button variant="ghost" className="flex flex-col items-center justify-center gap-2 h-auto py-3 bg-muted/30 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-colors">
              <ClipboardList className="h-4 w-4" />
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">Add Note</span>
            </Button>
            <Button variant="ghost" className="flex flex-col items-center justify-center gap-2 h-auto py-3 bg-muted/30 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-colors">
              <Pill className="h-4 w-4" />
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">Medicate</span>
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}

function FeedList({ isLoading, activities, emptyTitle, emptyDesc }) {
  if (isLoading) {
    return (
      <div className="flex flex-col p-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="flex gap-3 p-3">
            <Skeleton className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col py-8 px-6 text-center items-center justify-center h-full min-h-[150px]">
        <span className="text-sm font-sans font-medium text-foreground">{emptyTitle}</span>
        <span className="text-xs font-sans text-muted-foreground mt-1 text-balance leading-relaxed max-w-[200px]">
          {emptyDesc}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-2 gap-1">
      {activities.map((act, idx) => (
        <Dialog key={idx}>
          <DialogTrigger
            render={
              <button className="flex w-full text-left gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                <span className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 ${act.dotColor}`} />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-sans text-xs font-bold text-foreground truncate">
                    {act.title}
                  </span>
                  <span className="font-sans text-[11px] text-muted-foreground mt-0.5 truncate">
                    {act.desc}
                  </span>
                </div>
                <span className="font-tnum text-[10px] font-semibold text-muted-foreground shrink-0 mt-0.5 whitespace-nowrap ml-2">
                  {act.time}
                </span>
              </button>
            }
          />
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">{act.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="text-sm font-sans flex items-center gap-2">
                <span className="font-semibold text-foreground">Action:</span>
                <span className="text-muted-foreground">{act.desc}</span>
              </div>
              <ObjectDiffView oldValues={act.oldValues} newValues={act.newValues} />
            </div>
          </DialogContent>
        </Dialog>
      ))}
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

function ObjectDiffView({ oldValues, newValues }) {
  if (!oldValues && !newValues) return null;
  
  const formatVal = (v) => typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? 'none');
  
  const ignoredKeys = ['id', 'createdAt', 'updatedAt', 'isArchived', 'archivedAt'];
  const shouldShowKey = (key) => {
    if (ignoredKeys.includes(key)) return false;
    if (key.endsWith('Id')) return false; // Ignore foreign keys like patientId, admissionId
    return true;
  };
  
  // If no oldValues (e.g. CREATE), just list the new values cleanly
  if (!oldValues || Object.keys(oldValues).length === 0) {
    const visibleEntries = Object.entries(newValues || {}).filter(([key]) => shouldShowKey(key));
    
    if (visibleEntries.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Values</span>
        <div className="bg-muted p-3 rounded-md border border-border space-y-1.5 max-h-[250px] overflow-auto">
          {visibleEntries.map(([key, val]) => (
             <div key={key} className="text-xs font-sans grid grid-cols-3 gap-2 border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
               <span className="font-semibold text-muted-foreground">{key}</span>
               <span className="col-span-2 text-foreground font-mono break-all">{formatVal(val)}</span>
             </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Compute diff
  const allKeys = Array.from(new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]));
  const changedKeys = allKeys.filter(key => 
    shouldShowKey(key) && JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
  );
  
  if (changedKeys.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">No visible fields changed.</div>
    );
  }
  
  return (
    <div className="space-y-2">
      <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Changes</span>
      <div className="bg-muted p-3 rounded-md border border-border space-y-3 max-h-[250px] overflow-auto">
        {changedKeys.map(key => (
          <div key={key} className="text-xs font-sans flex flex-col gap-1 border-b border-border/50 pb-2 last:border-0 last:pb-0">
            <span className="font-semibold text-foreground">{key}</span>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
               <span className="text-destructive bg-destructive/10 px-1.5 py-0.5 rounded line-through break-all">{formatVal(oldValues[key])}</span>
               <span className="text-muted-foreground">→</span>
               <span className="text-status-available bg-status-available/10 px-1.5 py-0.5 rounded break-all">{formatVal(newValues[key])}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
