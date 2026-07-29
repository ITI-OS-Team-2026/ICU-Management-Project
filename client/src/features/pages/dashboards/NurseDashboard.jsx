import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Heart,
  Pill,
  Users,
  FileText,
} from 'lucide-react';

import { useDashboard } from '../../hooks/useDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function NurseDashboard({ greetingName, currentFormattedDate }) {
  const navigate = useNavigate();
  const { stats, activities, isLoading } = useDashboard();

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Header Greeting Section ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Live · ICU Dashboard
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
              {stats.criticalCases} Critical Alerts Active
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-status-available/10 text-status-available border-status-available/30 font-sans font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-status-available" />
              All Systems Normal
            </Badge>
          )}
        </div>
      </div>

      {/* ── Summary Stats Cards (4 Cards) ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Badges show values derived from the fetched data. Comparisons such as
            "+2 today" are omitted because no historical baseline is fetched. */}
        <StatsCard
          title="Active Patients"
          value={isLoading ? '-' : stats.activePatients}
          subText="Currently admitted"
          icon={Users}
          iconClass="text-primary bg-primary/10"
        />
        <StatsCard
          title="Critical Cases"
          value={isLoading ? '-' : stats.criticalCases}
          subText="Require immediate attention"
          badgeText={!isLoading && stats.criticalCases > 0 ? 'Action needed' : undefined}
          badgeColor="bg-destructive/10 text-destructive border-destructive/20"
          icon={AlertCircle}
          iconClass="text-destructive bg-destructive/10"
        />
        <StatsCard
          title="Pending Labs"
          value={isLoading ? '-' : stats.pendingLabs}
          subText="Awaiting review"
          icon={Activity}
          iconClass="text-status-reserved bg-status-reserved/10"
        />
        <StatsCard
          title="AI Alerts"
          value={isLoading ? '-' : stats.aiAlerts}
          subText="Raised from abnormal vitals"
          icon={Heart}
          iconClass="text-primary bg-primary/10"
        />
      </div>

      {/* ── Bottom Layout columns ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Clinical Shortcuts Card) */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="rounded-[1.25rem] border-border bg-card shadow-2xs flex-1 flex flex-col p-6 min-h-[420px]">
            <CardHeader className="p-0 pb-5 border-b border-border/50">
              <CardTitle className="font-display text-sm font-bold text-foreground">
                Clinical Quick Actions
              </CardTitle>
              <p className="text-xs font-sans text-muted-foreground mt-1">
                Access direct clinical charts and bedside recording views
              </p>
            </CardHeader>
            <CardContent className="flex-1 grid grid-cols-2 gap-4 pt-6">
              <QuickActionButton
                title="Vitals Entry"
                desc="Record hourly vitals signs"
                icon={Activity}
                onClick={() => navigate('/vitals/entry')}
              />
              <QuickActionButton
                title="Med Administration"
                desc="Record MAR administrations"
                icon={Pill}
                onClick={() => navigate('/medications/administration')}
              />
              <QuickActionButton
                title="Bed Overview"
                desc="View wards census & occupancy"
                icon={CheckCircle2}
                onClick={() => navigate('/beds')}
              />
              <QuickActionButton
                title="Nursing Notes"
                desc="Document patient observations"
                icon={FileText}
                onClick={() => navigate('/nursing-notes')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Recent Activity Feed) */}
        <Card className="rounded-[1.25rem] border-border bg-card shadow-2xs flex flex-col">
          <CardHeader className="pb-3 pt-5 px-6 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="font-display text-sm font-bold text-foreground">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-6 flex flex-col justify-between gap-6">
            <div className="space-y-5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex gap-3">
                    <Skeleton className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                  </div>
                ))
              ) : activities.length === 0 ? (
                <p className="font-sans text-xs text-muted-foreground py-6 text-center">
                  No recent activity recorded.
                </p>
              ) : (
                activities.map((act, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 ${act.dotColor}`} />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-sans text-xs font-bold text-foreground truncate">
                        {act.title}
                      </span>
                      <span className="font-sans text-[11px] text-muted-foreground mt-0.5 truncate">
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

            {/* The feed is fetched once on mount — there is no polling or socket
                subscription, so this must not claim to be live. */}
            <div className="flex items-center gap-2 text-border/80 border-t border-border/40 pt-4 mt-auto">
              <span className="h-2 w-2 rounded-full bg-status-available" />
              <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Updated on page load
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subText, badgeText, badgeColor, icon: Icon, iconClass }) {
  return (
    <Card className="shadow-2xs border-border bg-card rounded-xl overflow-hidden">
      <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {title}
            </span>
            <span className="font-tnum text-[2.25rem] font-bold leading-none text-foreground mt-2">
              {value}
            </span>
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-auto">
          <span className="font-sans text-xs text-muted-foreground truncate">
            {subText}
          </span>
          {badgeText && (
            <Badge variant="outline" className={`text-[10px] font-sans font-semibold border ${badgeColor} self-start sm:self-auto`}>
              {badgeText}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionButton({ title, desc, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start text-left p-4 rounded-xl border border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40 transition-all gap-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <span className="font-sans text-xs font-bold text-foreground block">
          {title}
        </span>
        <span className="font-sans text-[10px] text-muted-foreground mt-0.5 block leading-normal">
          {desc}
        </span>
      </div>
    </button>
  );
}
