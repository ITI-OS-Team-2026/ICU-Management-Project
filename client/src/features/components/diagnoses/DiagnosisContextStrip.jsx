import { useCallback, useEffect, useState } from 'react';
import { HelpCircle, Stethoscope } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { diagnosesService } from '../../services/diagnosesService';

/**
 * The patient's open problem list, condensed to one strip.
 *
 * Nurses charting vitals or giving drugs need to know what is being treated and
 * what is still only suspected — that context lives on the diagnoses tab, which
 * is not the screen they are working on.
 */
export default function DiagnosisContextStrip({ admissionId, className = '' }) {
  const [diagnoses, setDiagnoses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDiagnoses = useCallback(async () => {
    if (!admissionId) return;
    try {
      setIsLoading(true);
      const data = await diagnosesService.list(admissionId);
      setDiagnoses((data || []).filter((d) => ['SUSPECTED', 'CONFIRMED'].includes(d.status)));
    } catch {
      // Context, not the task itself — a failure here must not block charting.
      setDiagnoses([]);
    } finally {
      setIsLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDiagnoses();
  }, [fetchDiagnoses]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
    );
  }

  if (diagnoses.length === 0) return null;

  // Primary first, then confirmed, so the reason for admission leads.
  const ordered = [...diagnoses].sort((a, b) => {
    if (a.type === 'PRIMARY' && b.type !== 'PRIMARY') return -1;
    if (b.type === 'PRIMARY' && a.type !== 'PRIMARY') return 1;
    if (a.status !== b.status) return a.status === 'CONFIRMED' ? -1 : 1;
    return 0;
  });

  return (
    <div className={`rounded-lg border border-border bg-muted/20 p-3 ${className}`}>
      <div className="mb-2 flex items-center gap-1.5 font-label text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Stethoscope className="h-3.5 w-3.5" />
        Active problems
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ordered.map((d) => (
          <Badge
            key={d.id}
            variant="outline"
            className={`font-sans text-xs font-medium ${
              d.type === 'PRIMARY'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground'
            }`}
          >
            {d.status === 'SUSPECTED' && <HelpCircle className="mr-1 h-3 w-3 text-amber-600" />}
            {d.conditionName}
            {d.status === 'SUSPECTED' && (
              <span className="ml-1 text-[10px] text-amber-600">suspected</span>
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
}
