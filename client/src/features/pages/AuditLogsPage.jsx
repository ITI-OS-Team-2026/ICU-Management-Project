import { useAuditLogs } from '../hooks/useAuditLogs';
import { Search, History, AlertCircle, AlertTriangle, ShieldCheck, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function AuditLogsPage() {
  const { 
    logs, meta, stats, isLoading, error, page, setPage,
    search, setSearch,
    eventLevel, setEventLevel,
    category, setCategory
  } = useAuditLogs();

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-destructive font-sans">Error loading audit logs: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 bg-muted/20 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-sans text-muted-foreground mb-1">Administration / Audit Logs</p>
          <h1 className="font-display text-headline text-foreground">Audit Logs</h1>
          <p className="font-sans text-muted-foreground mt-1 text-body">
            Complete audit trail of all system actions and events
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<History className="h-5 w-5 text-blue-500" />} 
          title="Total Events Today" 
          value={isLoading || !stats ? '-' : stats.totalEventsToday} 
          iconBg="bg-blue-50"
        />
        <StatCard 
          icon={<AlertCircle className="h-5 w-5 text-destructive" />} 
          title="Critical Events" 
          value={isLoading || !stats ? '-' : stats.criticalEvents} 
          iconBg="bg-destructive/10"
        />
        <StatCard 
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} 
          title="Warning Events" 
          value={isLoading || !stats ? '-' : stats.warningEvents} 
          iconBg="bg-amber-50"
        />
        <StatCard 
          icon={<ShieldCheck className="h-5 w-5 text-purple-500" />} 
          title="Admin Actions" 
          value={isLoading || !stats ? '-' : stats.adminActions} 
          iconBg="bg-purple-50"
        />
      </div>

      <div className="flex flex-col xl:flex-row items-center gap-4 mt-2">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search events or users..." 
            className="pl-9 font-sans h-11 bg-card rounded-xl border-border w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          {/* Event Level Filters */}
          <div className="flex flex-wrap items-center bg-card border border-border rounded-xl p-1 gap-1 min-h-[44px]">
            {['All', 'Info', 'Warning', 'Critical'].map(level => (
              <Button
                key={level}
                variant="ghost"
                size="sm"
                onClick={() => setEventLevel(level)}
                className={`font-sans rounded-lg h-9 px-4 ${eventLevel === level ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {level}
              </Button>
            ))}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap items-center bg-card border border-border rounded-xl p-1 gap-1 min-h-[44px]">
            {['All', 'Patients', 'Admissions', 'Documents', 'Admin'].map(cat => (
              <Button
                key={cat}
                variant="ghost"
                size="sm"
                onClick={() => setCategory(cat)}
                className={`font-sans rounded-lg h-9 px-4 ${category === cat ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <LogSkeleton key={i} />)
        ) : logs?.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground font-sans bg-card rounded-xl border border-border">
            No audit logs found.
          </div>
        ) : (
          logs?.map((log) => <LogRow key={log.id} log={log} />)
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              <div className="flex items-center justify-center text-sm font-sans px-4 text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </div>

              <PaginationItem>
                <PaginationNext 
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  className={page === meta.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, iconBg }) {
  return (
    <Card className="shadow-sm border-transparent rounded-[1.25rem] bg-card overflow-hidden">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="font-sans text-[13px] font-medium text-muted-foreground">{title}</p>
          <p className="font-tnum text-[1.75rem] font-bold leading-none mt-1 text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LogRow({ log }) {
  // Format based on action
  let Icon = Info;
  let iconColor = "text-blue-500";
  let iconBg = "bg-blue-50";
  let badgeColor = "text-blue-500";
  let avatarBg = "bg-blue-600";
  let eventType = "Info";

  if (log.action === "ARCHIVE" || log.action === "ACCOUNT_LOCKED") {
    Icon = AlertCircle;
    iconColor = "text-destructive";
    iconBg = "bg-destructive/10";
    badgeColor = "text-destructive";
    avatarBg = "bg-destructive";
    eventType = "Critical";
  } else if (log.action === "UPDATE") {
    Icon = AlertTriangle;
    iconColor = "text-amber-500";
    iconBg = "bg-amber-50";
    badgeColor = "text-amber-500";
    avatarBg = "bg-blue-800";
    eventType = "Warning";
  } else {
    Icon = CheckCircle2;
    iconColor = "text-teal-500";
    iconBg = "bg-teal-50";
    badgeColor = "text-teal-500";
    avatarBg = "bg-blue-600";
  }

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
  };

  const formatTitle = (action, table) => {
    const actionMap = {
      "CREATE": "Created",
      "UPDATE": "Updated",
      "ARCHIVE": "Archived",
      "LOGIN": "Logged In",
      "LOGOUT": "Logged Out",
      "ACCOUNT_LOCKED": "Account Locked",
      "VIEW": "Viewed"
    };
    return `${table} Record ${actionMap[action] || action}`;
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className="flex gap-4 relative">
      <div className="flex flex-col items-center mt-4">
        <div className={`h-6 w-6 rounded-full flex items-center justify-center z-10 ${iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <div className="w-px h-full bg-border mt-2" />
      </div>
      
      <Card className="flex-1 shadow-sm border-transparent rounded-[1.25rem] bg-card p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex gap-4 items-start">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${avatarBg} text-white font-sans font-bold text-sm`}>
              {getInitials(log.user?.name)}
            </div>
            <div className="flex flex-col">
              <h3 className="font-sans font-bold text-foreground text-[15px] leading-tight">
                {formatTitle(log.action, log.targetTable)}
              </h3>
              <p className="font-sans text-sm text-muted-foreground mt-0.5">
                Action By: {log.user ? log.user.name : 'System'} · {log.user?.role || 'Unknown'} 
              </p>
              
              <div className="flex items-center gap-3 mt-3">
                <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-sans font-semibold text-muted-foreground">
                  {log.targetTable}
                </span>
                <span className="font-tnum text-[11px] text-muted-foreground/70">
                  IP: {log.ipAddress || 'Unknown'}
                </span>
                <span className="font-sans text-[12px] text-muted-foreground italic ml-2">
                  Database Event: {log.action} on {log.targetTable} table
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`font-sans text-[12px] font-bold ${badgeColor}`}>
              {eventType}
            </span>
            <span className="font-tnum text-[12px] text-muted-foreground">
              {formatTime(log.createdAt)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LogSkeleton() {
  return (
    <div className="flex gap-4 relative">
      <div className="flex flex-col items-center mt-4">
        <Skeleton className="h-6 w-6 rounded-full" />
        <div className="w-px h-full bg-border mt-2" />
      </div>
      <Card className="flex-1 shadow-sm border-transparent rounded-[1.25rem] bg-card p-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-4 w-1/4 mt-4" />
          </div>
          <div className="space-y-2 w-16">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </Card>
    </div>
  );
}
