import { useMemo } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useBeds } from '../hooks/useBeds';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

export default function BedOverviewPage() {
  const { beds, isLoading, error, refetch } = useBeds();

  const stats = useMemo(() => {
    if (!beds) return { occupied: 0, available: 0, maintenance: 0, reserved: 0, total: 0 };
    return beds.reduce(
      (acc, bed) => {
        acc.total++;
        if (bed.status === 'OCCUPIED') acc.occupied++;
        else if (bed.status === 'AVAILABLE') acc.available++;
        else if (bed.status === 'MAINTENANCE') acc.maintenance++;
        else if (bed.status === 'RESERVED') acc.reserved++;
        return acc;
      },
      { occupied: 0, available: 0, maintenance: 0, reserved: 0, total: 0 }
    );
  }, [beds]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-destructive font-sans">Error loading beds: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 bg-muted/20 min-h-[calc(100vh-4rem)]">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-sans text-muted-foreground mb-1">Clinical / Bed Overview</p>
          <h1 className="font-display text-headline text-foreground">Bed Overview</h1>
        </div>
        <Button onClick={refetch} variant="outline" className="shrink-0" disabled={isLoading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Occupied" 
          value={isLoading ? '-' : stats.occupied} 
          total={stats.total}
          textColorClass="text-status-occupied" 
          bgColorClass="bg-status-occupied" 
        />
        <SummaryCard 
          title="Available" 
          value={isLoading ? '-' : stats.available} 
          total={stats.total}
          textColorClass="text-status-available" 
          bgColorClass="bg-status-available" 
        />
        <SummaryCard 
          title="Maintenance" 
          value={isLoading ? '-' : stats.maintenance} 
          total={stats.total}
          textColorClass="text-status-maintenance" 
          bgColorClass="bg-status-maintenance" 
        />
        <SummaryCard 
          title="Reserved" 
          value={isLoading ? '-' : stats.reserved} 
          total={stats.total}
          textColorClass="text-status-reserved" 
          bgColorClass="bg-status-reserved" 
        />
      </div>

      {/* Bed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <BedCardSkeleton key={i} />)
          : beds?.map((bed) => <BedCard key={bed.id} bed={bed} />)}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, total, textColorClass, bgColorClass }) {
  const percentage = total > 0 && value !== '-' ? (value / total) * 100 : 0;
  
  return (
    <Card className="shadow-sm border-transparent rounded-[1.25rem] bg-card overflow-hidden">
      <CardHeader className="pb-0 pt-5 px-6">
        <CardTitle className="font-sans text-[13px] font-medium text-muted-foreground capitalize">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6 pt-1 px-6">
        <div className={`font-tnum text-[2.5rem] font-bold leading-none mb-4 ${textColorClass}`}>{value}</div>
        <div className="h-1.5 w-[90%] rounded-full bg-secondary overflow-hidden">
          <div className={`h-full ${bgColorClass}`} style={{ width: `${percentage}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function BedCard({ bed }) {
  const isOccupied = bed.status === 'OCCUPIED';
  const isAvailable = bed.status === 'AVAILABLE';
  const isMaintenance = bed.status === 'MAINTENANCE';
  const isReserved = bed.status === 'RESERVED';

  let cardClass = '';
  let titleClass = '';
  
  if (isOccupied) {
    cardClass = 'bg-status-occupied/[0.03] border-status-occupied/30 shadow-none';
    titleClass = 'text-status-occupied';
  } else if (isAvailable) {
    cardClass = 'bg-status-available/[0.03] border-status-available/40 border-dashed shadow-none';
    titleClass = 'text-status-available';
  } else if (isMaintenance) {
    cardClass = 'bg-status-maintenance/[0.03] border-status-maintenance/40 shadow-none';
    titleClass = 'text-status-maintenance';
  } else if (isReserved) {
    cardClass = 'bg-status-reserved/[0.03] border-status-reserved/40 shadow-none';
    titleClass = 'text-status-reserved';
  } else {
    cardClass = 'bg-card border-border shadow-sm';
    titleClass = 'text-foreground';
  }

  // Visual alert condition (e.g. Bed 3 in screenshot)
  const isAlert = isOccupied && (bed.heartRate > 100 || bed.spo2 < 95);
  const avatarBg = isAlert ? 'bg-destructive text-destructive-foreground' : 'bg-status-occupied text-primary-foreground';
  const progressBg = isAlert ? 'bg-destructive' : 'bg-status-occupied';

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const formatName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
  };

  return (
    <Card className={`flex flex-col min-h-[180px] rounded-[1.25rem] ${cardClass}`}>
      <CardHeader className="pb-0 pt-4 px-5 flex flex-row items-center justify-between">
        <CardTitle className={`font-sans text-[13px] font-bold ${titleClass} tracking-wide`}>
          Bed {bed.bed_number}
        </CardTitle>
        {isAlert && <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col px-5 pb-5 pt-3">
        {isOccupied && bed.patientName ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 mt-1">
              <Avatar className={`h-8 w-8 ${avatarBg}`}>
                <AvatarFallback className="bg-transparent text-inherit font-sans font-bold text-[11px]">
                  {getInitials(bed.patientName)}
                </AvatarFallback>
              </Avatar>
              <p className="font-sans font-bold text-foreground text-[14px] leading-none">
                {formatName(bed.patientName)}
              </p>
            </div>
            
            <div className="mt-auto pt-4 space-y-2">
              <p className="font-sans text-[11px] text-muted-foreground truncate font-medium">
                {bed.diagnosis || 'No active diagnosis'}
              </p>
              
              <div className="flex justify-between items-end">
                <span className="font-sans text-[11px] text-muted-foreground font-semibold">HR <span className="font-tnum text-status-occupied font-bold">{bed.heartRate || '-'}</span></span>
                <span className="font-sans text-[11px] text-muted-foreground font-semibold">SpO₂ <span className="font-tnum text-status-occupied font-bold">{bed.spo2 || '-'}%</span></span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full ${progressBg}`} style={{ width: `${bed.spo2 || bed.heartRate || 82}%` }} />
                </div>
                <span className={`font-tnum text-[11px] font-bold ${isAlert ? 'text-destructive' : 'text-status-occupied'}`}>
                  {bed.spo2 || bed.heartRate || 82}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className={`font-sans text-[13px] capitalize font-medium ${titleClass}`}>
              {bed.status.toLowerCase()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BedCardSkeleton() {
  return (
    <Card className="min-h-[180px] flex flex-col shadow-sm rounded-[1.25rem] bg-card border-transparent">
      <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
        <Skeleton className="h-4 w-14" />
      </CardHeader>
      <CardContent className="space-y-4 flex-1 px-5 pb-5 pt-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3 pt-4 mt-auto">
          <Skeleton className="h-3 w-32" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-1 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
