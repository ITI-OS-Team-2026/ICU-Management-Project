import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Activity,
  History
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { patientsService } from '../../services/patientsService';

function formatDate(value, pattern = 'MMM d, yyyy · h:mm a') {
  if (!value) return '—';
  try {
    return format(new Date(value), pattern);
  } catch {
    return '—';
  }
}

export default function PatientDiagnosesPage() {
  const { admission } = useOutletContext();
  const [diagnoses, setDiagnoses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'resolved'

  const fetchDiagnoses = useCallback(async () => {
    if (!admission?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await patientsService.getDiagnoses(admission.id);
      setDiagnoses(data || []);
    } catch (err) {
      console.error('Failed to fetch diagnoses:', err);
      setError('Failed to load diagnoses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [admission]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDiagnoses();
  }, [fetchDiagnoses]);

  const activeDiagnoses = diagnoses.filter(d => d.status === 'ACTIVE');
  const resolvedDiagnoses = diagnoses.filter(d => d.status === 'RESOLVED');

  const displayedDiagnoses = activeTab === 'active' ? activeDiagnoses : resolvedDiagnoses;

  const renderSkeleton = () => (
    <div className="space-y-4 mt-6">
      <Skeleton className="h-10 w-[200px]" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border shadow-2xs">
            <CardContent className="p-6">
              <div className="flex gap-4 items-center">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="p-6 md:p-8 max-w-5xl mx-auto">{renderSkeleton()}</div>;
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="font-sans font-medium text-foreground">{error}</p>
          <Button variant="outline" onClick={fetchDiagnoses} className="mt-2">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Clinical Diagnoses
          </h2>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            Active and resolved medical conditions for this admission.
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
            Active ({activeDiagnoses.length})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-1.5 text-sm font-sans font-medium rounded-md transition-all ${
              activeTab === 'resolved'
                ? 'bg-card text-foreground shadow-2xs border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Resolved ({resolvedDiagnoses.length})
          </button>
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        {displayedDiagnoses.length === 0 ? (
          <Card className="border-border shadow-2xs border-dashed bg-transparent">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-sans font-medium text-foreground">
                No {activeTab} diagnoses.
              </p>
              <p className="font-sans text-sm text-muted-foreground mt-1">
                There are currently no clinical diagnoses marked as {activeTab}.
              </p>
            </CardContent>
          </Card>
        ) : (
          displayedDiagnoses.map((diagnosis) => {
            const doctorName = diagnosis.diagnosedBy ? `Dr. ${diagnosis.diagnosedBy.lastName}` : 'Unknown';
            const isActive = diagnosis.status === 'ACTIVE';

            return (
              <Card key={diagnosis.id} className="border-border shadow-2xs overflow-hidden transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 sm:p-6 gap-4">
                    
                    <div className="flex items-start sm:items-center gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Stethoscope size={20} />
                      </div>
                      
                      <div className="flex flex-col space-y-1.5">
                        <h3 className="font-sans text-lg font-bold text-foreground leading-tight">
                          {diagnosis.conditionName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-sans text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} className="opacity-70" />
                            Diagnosed: {formatDate(diagnosis.diagnosedAt, 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <User size={12} className="opacity-70" />
                            By: {doctorName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 pt-2 sm:pt-0 pl-16 sm:pl-0">
                      {isActive ? (
                        <Badge variant="outline" className="bg-status-available/10 text-status-available border-status-available/30 font-sans font-semibold px-3 py-1">
                          <CheckCircle2 size={14} className="mr-1.5" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-sans font-semibold px-3 py-1">
                          <History size={14} className="mr-1.5" /> Resolved
                        </Badge>
                      )}
                    </div>
                    
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
