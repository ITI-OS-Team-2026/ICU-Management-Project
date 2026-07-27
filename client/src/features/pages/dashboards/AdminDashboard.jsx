import { useNavigate } from 'react-router-dom';
import {
  Users,
  BedDouble,
  History,
  ActivitySquare
} from 'lucide-react';

import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function AdminDashboard({ greetingName, currentFormattedDate }) {
  const navigate = useNavigate();
  const { stats, activities, isLoading } = useAdminDashboard();

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Header Greeting Section ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            System Administration
          </span>
          <h1 className="font-display text-headline text-foreground font-bold">
            Good morning, {greetingName}
          </h1>
          <p className="text-sm font-sans text-muted-foreground mt-0.5">
            {currentFormattedDate} · System Health
          </p>
        </div>
      </div>

      {/* ── Summary Stats Cards (4 Cards) ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={isLoading ? '-' : stats.totalUsers}
          icon={Users}
          iconClass="text-primary bg-primary/10"
        />
        <StatsCard
          title="Active Sessions"
          value={isLoading ? '-' : stats.activeUsers}
          icon={ActivitySquare}
          iconClass="text-status-available bg-status-available/10"
        />
        <StatsCard
          title="Total Beds"
          value={isLoading ? '-' : stats.totalBeds}
          icon={BedDouble}
          iconClass="text-status-reserved bg-status-reserved/10"
        />
        <StatsCard
          title="Occupied Beds"
          value={isLoading ? '-' : stats.occupiedBeds}
          icon={BedDouble}
          iconClass="text-status-occupied bg-status-occupied/10"
        />
      </div>

      {/* ── Bottom Layout columns ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Management Shortcuts) */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="rounded-[1.25rem] border-border bg-card shadow-2xs flex-1 flex flex-col p-6 min-h-[420px]">
            <CardHeader className="p-0 pb-5 border-b border-border/50">
              <CardTitle className="font-display text-sm font-bold text-foreground">
                Management Shortcuts
              </CardTitle>
              <p className="text-xs font-sans text-muted-foreground mt-1">
                Quick access to system configuration and administration tools
              </p>
            </CardHeader>
            <CardContent className="flex-1 grid grid-cols-2 gap-4 pt-6">
              <QuickActionButton
                title="Manage Users"
                desc="Add, edit, or deactivate staff"
                icon={Users}
                onClick={() => navigate('/admin/users')}
              />
              <QuickActionButton
                title="Manage Beds"
                desc="Configure ward capacity"
                icon={BedDouble}
                onClick={() => navigate('/admin/beds')}
              />
              <QuickActionButton
                title="Audit Logs"
                desc="Review system activity"
                icon={History}
                onClick={() => navigate('/admin/audit-logs')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Recent System Activity) */}
        <Card className="rounded-[1.25rem] border-border bg-card shadow-2xs flex flex-col">
          <CardHeader className="pb-3 pt-5 px-6 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="font-display text-sm font-bold text-foreground">
              Recent System Logs
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/audit-logs')} className="text-xs font-sans font-semibold text-primary hover:bg-transparent">
              View all
            </Button>
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
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                  <History className="h-8 w-8 text-muted-foreground/30" />
                  <p className="font-sans text-xs text-muted-foreground">No recent activity yet.</p>
                </div>
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

            <div className="flex items-center gap-2 text-border/80 border-t border-border/40 pt-4 mt-auto">
              <span className="h-2 w-2 rounded-full bg-status-available animate-pulse" />
              <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                System online
              </span>
            </div>
          </CardContent>
        </Card>
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
