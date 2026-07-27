/* Hallmark · macrostructure: Catalogue · genre: modern-minimal · theme: system-managed */
import { useMemo, useState, useEffect } from 'react';
import { MoreHorizontal, Plus, RefreshCcw, Activity, Droplet, HelpCircle } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function AdminBedsPage() {
  const { beds, isLoading, error, refetch, createBed, updateBedStatus } = useBeds();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [bedNumber, setBedNumber] = useState('');

  const handleUpdateStatus = async (id, status) => {
    setUpdateError(null);
    try {
      await updateBedStatus(id, status);
    } catch (err) {
      setUpdateError(err.response?.data?.message || err.message || 'An unknown error occurred');
      setTimeout(() => setUpdateError(null), 5000);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError(null);
    try {
      setIsSubmitting(true);
      await createBed({ bed_number: bedNumber });
      setIsAddOpen(false);
      setBedNumber('');
    } catch (err) {
      setAddError(err.response?.data?.message || err.message || 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    if (!beds) return { occupied: 0, available: 0, maintenance: 0, total: 0 };
    return beds.reduce(
      (acc, bed) => {
        acc.total++;
        if (bed.status === 'OCCUPIED') acc.occupied++;
        else if (bed.status === 'AVAILABLE') acc.available++;
        else if (bed.status === 'MAINTENANCE') acc.maintenance++;
        return acc;
      },
      { occupied: 0, available: 0, maintenance: 0, total: 0 }
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
    <div className="flex flex-col gap-8 p-4 md:p-8 bg-background min-h-[calc(100vh-4rem)]">

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-sm font-sans text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Administration / Beds</p>
          <h1 className="font-display text-headline text-foreground tracking-tight">Bed Overview</h1>
          <p className="font-sans text-muted-foreground mt-1 text-body">
            Real-time ward occupancy and patient monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={refetch} variant="outline" className="shrink-0" disabled={isLoading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button className="shrink-0 font-sans bg-primary" />
            }>
              <Plus className="mr-2 h-4 w-4" /> Add Bed
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-sans">Add New Bed</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
                {addError && (
                  <div className="bg-destructive/10 text-destructive text-sm font-sans p-3 rounded-md border border-destructive/20">
                    {addError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="bed_number" className="font-sans text-xs font-semibold">Bed Number / ID</Label>
                  <Input 
                    id="bed_number" 
                    placeholder="e.g. ICU-01" 
                    className="font-sans h-9"
                    value={bedNumber}
                    onChange={e => setBedNumber(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="font-sans">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="font-sans bg-primary">
                    {isSubmitting ? 'Saving...' : 'Create Bed'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard 
          title="Occupied" 
          value={isLoading ? '-' : stats.occupied} 
          total={stats.total}
          progressColor="bg-status-occupied"
        />
        <SummaryCard 
          title="Available" 
          value={isLoading ? '-' : stats.available} 
          total={stats.total}
          progressColor="bg-status-available"
        />
        <SummaryCard 
          title="Maintenance" 
          value={isLoading ? '-' : stats.maintenance} 
          total={stats.total}
          progressColor="bg-status-maintenance"
        />
      </div>

      {updateError && (
        <div className="bg-destructive/10 text-destructive text-sm font-sans p-4 rounded-md border border-destructive/20 mt-2 mb-2">
          <p className="font-semibold">Error Updating Bed</p>
          <p>{updateError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <BedCardSkeleton key={i} />)
          : beds?.map((bed) => <BedCard key={bed.id} bed={bed} updateBedStatus={handleUpdateStatus} />)}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, total, progressColor }) {
  const percentage = total > 0 && value !== '-' ? (value / total) * 100 : 0;
  
  return (
    <Card className="shadow-sm border-border bg-card">
      <CardHeader className="pb-2 pt-5 px-6">
        <CardTitle className="font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6 pt-0 px-6">
        <div className="font-tnum text-3xl font-bold leading-none mb-4 text-foreground">{value}</div>
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div className={`h-full ${progressColor}`} style={{ width: `${percentage}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function BedCard({ bed, updateBedStatus }) {
  const isOccupied = bed.status === 'OCCUPIED';
  const isAvailable = bed.status === 'AVAILABLE';
  const isMaintenance = bed.status === 'MAINTENANCE';
  const isReserved = bed.status === 'RESERVED';

  const isAlert = isOccupied && (bed.heartRate > 100 || bed.spo2 < 95);

  const getBadge = () => {
    if (isOccupied) return <Badge className="bg-status-occupied hover:bg-status-occupied text-primary-foreground uppercase text-[10px] tracking-wider">Occupied</Badge>;
    if (isAvailable) return <Badge variant="outline" className="text-status-available border-status-available uppercase text-[10px] tracking-wider">Available</Badge>;
    if (isMaintenance) return <Badge variant="secondary" className="text-status-maintenance uppercase text-[10px] tracking-wider">Maintenance</Badge>;
    if (isReserved) return <Badge variant="secondary" className="text-status-reserved uppercase text-[10px] tracking-wider">Reserved</Badge>;
    return null;
  };

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
    <div 
      className="cursor-pointer transition-transform hover:scale-[1.02] h-full"
      onClick={() => {
        // e.g. navigate(`/patients/${bed.patientId}`)
        console.log(`Navigate to patient overview for bed ${bed.id}`);
      }}
    >
      <Card className={`flex flex-col h-full min-h-[200px] shadow-sm border-border bg-card transition-shadow hover:shadow-md ${isAlert ? 'border-destructive ring-1 ring-destructive' : ''}`}>
        <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="font-sans text-sm font-bold text-foreground">
              Bed {bed.bed_number}
            </CardTitle>
            {getBadge()}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-muted/50 -mr-2" onClick={e => e.stopPropagation()} />
            }>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-sans">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateBedStatus(bed.id, 'AVAILABLE'); }}>Set Available</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateBedStatus(bed.id, 'MAINTENANCE'); }}>Set Maintenance</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col px-5 pb-5 pt-0">
          {isOccupied && bed.patientName ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarFallback className="bg-muted text-foreground font-sans font-bold text-xs">
                    {getInitials(bed.patientName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <p className="font-sans font-semibold text-foreground text-sm truncate">
                    {formatName(bed.patientName)}
                  </p>
                  <p className="font-sans text-xs text-muted-foreground truncate">
                    {bed.diagnosis || 'No active diagnosis'}
                  </p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="mt-auto grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Activity className="w-3.5 h-3.5" />
                    <span className="font-sans text-[10px] font-semibold uppercase tracking-wider">HR</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className={`font-tnum text-2xl font-bold leading-none ${bed.heartRate > 100 ? 'text-destructive' : 'text-foreground'}`}>
                      {bed.heartRate || '-'}
                    </span>
                    <span className="font-sans text-[10px] text-muted-foreground mb-0.5">bpm</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Droplet className="w-3.5 h-3.5" />
                    <span className="font-sans text-[10px] font-semibold uppercase tracking-wider">SpO₂</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className={`font-tnum text-2xl font-bold leading-none ${bed.spo2 < 95 ? 'text-destructive' : 'text-foreground'}`}>
                      {bed.spo2 || '-'}
                    </span>
                    <span className="font-sans text-[10px] text-muted-foreground mb-0.5">%</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                <span className="font-sans text-xs font-semibold uppercase tracking-wider opacity-50">Empty</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BedCardSkeleton() {
  return (
    <Card className="min-h-[200px] flex flex-col shadow-sm bg-card border-border">
      <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-4 flex-1 px-5 pb-5 pt-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Separator className="my-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-6 w-12" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
