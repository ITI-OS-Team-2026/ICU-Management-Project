import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Pill,
  User,
  CheckCircle2,
  AlertCircle,
  History,
  Activity
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { patientsService } from '../../services/patientsService';

function formatDate(value, pattern = 'MMM d, yyyy · h:mm a') {
  if (!value) return '—';
  try {
    return format(new Date(value), pattern);
  } catch {
    return '—';
  }
}

export default function PatientMedicationsPage() {
  const { admission } = useOutletContext();
  const [medications, setMedications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'discontinued'

  const fetchMedications = useCallback(async () => {
    if (!admission?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await patientsService.getMedications(admission.id);
      setMedications(data || []);
    } catch (err) {
      console.error('Failed to fetch medications:', err);
      setError('Failed to load medications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [admission]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMedications();
  }, [fetchMedications]);

  const activeMeds = medications.filter(m => m.isActive);
  const discontinuedMeds = medications.filter(m => !m.isActive);

  const displayedMeds = activeTab === 'active' ? activeMeds : discontinuedMeds;

  const renderSkeleton = () => (
    <div className="space-y-4 mt-6">
      <Skeleton className="h-10 w-[200px]" />
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="space-y-4 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center border-b border-border/50 pb-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return <div className="p-6 md:p-8 max-w-7xl mx-auto">{renderSkeleton()}</div>;
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="font-sans font-medium">{error}</p>
          <Button variant="outline" onClick={fetchMedications} className="mt-4">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" />
            Medication Orders
          </h2>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            Current and past prescriptions for this admission.
          </p>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-1.5 text-sm font-sans font-medium rounded-md transition-all ${
              activeTab === 'active'
                ? 'bg-card text-foreground shadow-2xs border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Active ({activeMeds.length})
          </button>
          <button
            onClick={() => setActiveTab('discontinued')}
            className={`px-4 py-1.5 text-sm font-sans font-medium rounded-md transition-all ${
              activeTab === 'discontinued'
                ? 'bg-card text-foreground shadow-2xs border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Discontinued ({discontinuedMeds.length})
          </button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <Card className="border-border shadow-2xs overflow-hidden">
        {displayedMeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Pill className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="font-sans font-medium text-foreground">
              No {activeTab} medications.
            </p>
            <p className="font-sans text-sm text-muted-foreground mt-1">
              There are currently no medication records in this category.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-sans text-xs font-bold text-muted-foreground uppercase tracking-wider pl-6">Medication</TableHead>
                  <TableHead className="font-sans text-xs font-bold text-muted-foreground uppercase tracking-wider">Dosage & Freq</TableHead>
                  <TableHead className="font-sans text-xs font-bold text-muted-foreground uppercase tracking-wider">Start / End Date</TableHead>
                  <TableHead className="font-sans text-xs font-bold text-muted-foreground uppercase tracking-wider">Prescriber</TableHead>
                  <TableHead className="font-sans text-xs font-bold text-muted-foreground uppercase tracking-wider pr-6 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedMeds.map((med) => {
                  const prescriberName = med.prescribedBy ? `Dr. ${med.prescribedBy.lastName}` : 'Unknown';
                  
                  return (
                    <TableRow key={med.id} className="hover:bg-muted/10 border-b border-border/50">
                      <TableCell className="pl-6 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${med.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <Pill size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-sans text-sm font-bold text-foreground leading-tight truncate">
                              {med.drugName}
                            </span>
                            <span className="font-sans text-[10px] text-muted-foreground mt-0.5">
                              Ordered: {formatDate(med.prescribedAt)}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="align-middle">
                        <div className="flex flex-col">
                          <span className="font-sans text-sm font-semibold text-foreground">
                            {med.dosage}
                          </span>
                          <span className="font-sans text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Activity size={10} /> {med.frequency}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="align-middle">
                        <div className="flex flex-col font-tnum text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground w-8">Start:</span>
                            <span>{formatDate(med.startDate || med.prescribedAt, 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground w-8">End:</span>
                            <span>{med.endDate ? formatDate(med.endDate, 'MMM d, yyyy') : 'Ongoing'}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="align-middle">
                        <div className="flex items-center gap-2">
                          <User size={12} className="text-muted-foreground" />
                          <span className="font-sans text-sm text-foreground font-medium">{prescriberName}</span>
                        </div>
                      </TableCell>

                      <TableCell className="pr-6 align-middle text-right">
                        {med.isActive ? (
                          <Badge variant="outline" className="bg-status-available/10 text-status-available border-status-available/30 font-sans font-semibold">
                            <CheckCircle2 size={12} className="mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-sans font-semibold">
                            <History size={12} className="mr-1" /> Discontinued
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
