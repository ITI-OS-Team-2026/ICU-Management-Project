import { useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Clock,
  Heart,
  History,
  Minus,
  RefreshCcw,
  Thermometer,
  Wind,
  AlertTriangle,
  Droplets,
  User,
} from 'lucide-react';
import { format } from 'date-fns';

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useVitals } from '../../hooks/useVitals';

/* ================================================================
   Vital Sign Configuration
   ================================================================ */
const VITAL_CONFIG = [
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    icon: Thermometer,
    normalRange: { min: 36.0, max: 38.5 },
    colorClass: (v) =>
      v < 35.5 || v > 39.0
        ? 'text-destructive'
        : v > 38.0 || v < 36.0
          ? 'text-amber-500'
          : 'text-emerald-500',
    format: (v) => (typeof v === 'number' ? v.toFixed(1) : v),
  },
  {
    key: 'pulse',
    label: 'Heart Rate',
    unit: 'bpm',
    icon: Heart,
    normalRange: { min: 40, max: 140 },
    colorClass: (v) =>
      v < 45 || v > 130
        ? 'text-destructive'
        : v > 100 || v < 55
          ? 'text-amber-500'
          : 'text-rose-500',
    format: (v) => v,
  },
  {
    key: 'bloodPressure',
    label: 'Blood Pressure',
    unit: 'mmHg',
    icon: Activity,
    colorClass: (sys, dia) =>
      sys < 85 || sys > 180 || dia < 50 || dia > 110
        ? 'text-destructive'
        : sys > 140 || sys < 95 || dia > 90 || dia < 60
          ? 'text-amber-500'
          : 'text-primary',
    format: (_v, record) =>
      record?.systolicBp && record?.diastolicBp
        ? `${record.systolicBp}/${record.diastolicBp}`
        : '—',
    isComposite: true,
  },
  {
    key: 'spo2',
    label: 'SpO₂',
    unit: '%',
    icon: Droplets,
    normalRange: { min: 85, max: 100 },
    colorClass: (v) =>
      v < 90 ? 'text-destructive' : v < 95 ? 'text-amber-500' : 'text-cyan-500',
    format: (v) => v,
  },
  {
    key: 'respiratoryRate',
    label: 'Respiratory Rate',
    unit: '/min',
    icon: Wind,
    normalRange: { min: 8, max: 30 },
    colorClass: (v) =>
      v < 8 || v > 30
        ? 'text-destructive'
        : v > 24 || v < 12
          ? 'text-amber-500'
          : 'text-violet-500',
    format: (v) => v,
  },
  {
    key: 'map',
    label: 'MAP',
    unit: 'mmHg',
    icon: Activity,
    colorClass: (v) =>
      v < 65 || v > 110
        ? 'text-destructive'
        : v > 100 || v < 70
          ? 'text-amber-500'
          : 'text-primary',
    format: (_v, record) => {
      const sys = parseInt(record?.systolicBp, 10) || 0;
      const dia = parseInt(record?.diastolicBp, 10) || 0;
      if (!sys || !dia) return '—';
      return Math.round(dia + (sys - dia) / 3);
    },
    isDerived: true,
  },
];

/* ================================================================
   Helpers
   ================================================================ */
function getTrend(current, previous, config) {
  if (!previous || current == null) return 'same';

  if (config.key === 'bloodPressure') {
    const currSys = parseInt(current?.systolicBp, 10);
    const prevSys = parseInt(previous?.systolicBp, 10);
    if (isNaN(currSys) || isNaN(prevSys)) return 'same';
    if (currSys > prevSys + 5) return 'up';
    if (currSys < prevSys - 5) return 'down';
    return 'same';
  }

  if (config.key === 'map') {
    const curr = parseInt(config.format(null, current), 10);
    const prev = parseInt(config.format(null, previous), 10);
    if (isNaN(curr) || isNaN(prev)) return 'same';
    if (curr > prev + 3) return 'up';
    if (curr < prev - 3) return 'down';
    return 'same';
  }

  const curr = parseFloat(
    typeof current === 'object' ? current[config.key] : current
  );
  const prev = parseFloat(
    typeof previous === 'object' ? previous[config.key] : previous
  );
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return 'same';

  const threshold =
    { pulse: 5, spo2: 2, respiratoryRate: 3, temperature: 0.5 }[
      config.key
    ] || 0;
  if (Math.abs(curr - prev) <= threshold) return 'same';
  return curr > prev ? 'up' : 'down';
}

function computeStatus(latest) {
  let criticalCount = 0;
  let warningCount = 0;

  const t = parseFloat(latest?.temperature);
  if (Number.isFinite(t)) {
    if (t < 35.5 || t > 39.0) criticalCount++;
    else if (t > 38.0 || t < 36.0) warningCount++;
  }

  const p = parseInt(latest?.pulse, 10);
  if (Number.isFinite(p)) {
    if (p < 45 || p > 130) criticalCount++;
    else if (p > 100 || p < 55) warningCount++;
  }

  const s = parseInt(latest?.systolicBp, 10);
  const d = parseInt(latest?.diastolicBp, 10);
  if (Number.isFinite(s) && Number.isFinite(d)) {
    if (s < 85 || s > 180 || d < 50 || d > 110) criticalCount++;
    else if (s > 140 || s < 95 || d > 90 || d < 60) warningCount++;
  }

  const sp = parseInt(latest?.spo2, 10);
  if (Number.isFinite(sp)) {
    if (sp < 90) criticalCount++;
    else if (sp < 95) warningCount++;
  }

  const r = parseInt(latest?.respiratoryRate, 10);
  if (Number.isFinite(r)) {
    if (r < 8 || r > 30) criticalCount++;
    else if (r > 24 || r < 12) warningCount++;
  }

  if (criticalCount > 0) return { label: 'Critical', variant: 'destructive' };
  if (warningCount > 0) return { label: 'Watchful', variant: 'outline' };
  return { label: 'Normal', variant: 'secondary' };
}

const TREND_ICONS = {
  up: ArrowUp,
  down: ArrowDown,
  same: Minus,
};

const TREND_CLASSES = {
  up: 'text-emerald-500',
  down: 'text-destructive',
  same: 'text-muted-foreground',
};

/* ================================================================
   Sub-components
   ================================================================ */

function VitalCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function VitalCard({ config, latest, previous }) {
  const Icon = config.icon;
  const value =
    config.isDerived || config.isComposite
      ? config.format(null, latest)
      : config.format(latest?.[config.key]);

  const rawValue =
    config.isDerived || config.isComposite ? value : latest?.[config.key];

  const color = config.isComposite
    ? config.colorClass(
        parseInt(latest?.systolicBp, 10),
        parseInt(latest?.diastolicBp, 10)
      )
    : config.isDerived
      ? config.colorClass(parseInt(value, 10))
      : config.colorClass(parseFloat(rawValue));

  const trend = getTrend(latest, previous, config);
  const TrendIcon = TREND_ICONS[trend];

  const isEmpty =
    value === '—' || value === null || value === undefined || value === '';

  return (
    <Card className="border-border relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-border" />
      <CardContent className="p-4 space-y-2 pl-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon size={13} className="text-muted-foreground" />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {config.label}
            </span>
          </div>
          {!isEmpty && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  <TrendIcon size={12} className={TREND_CLASSES[trend]} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span className="capitalize">{trend === 'same' ? 'No change' : `${trend} since last reading`}</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className={`font-tnum text-2xl font-bold leading-none ${color}`}>
          {isEmpty ? '—' : value}
        </div>

        <div className="font-sans text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          {config.unit}
          {config.normalRange && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-muted-foreground/60">
                  (Normal: {config.normalRange.min}\u2013{config.normalRange.max})
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Normal range: {config.normalRange.min}\u2013{config.normalRange.max} {config.unit}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VitalsHistoryTable({ vitals, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!vitals || vitals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <History size={32} className="mb-3 opacity-40" />
        <p className="font-sans text-sm">
          No vitals recorded yet for this admission.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-sans text-[11px] font-semibold uppercase tracking-wider w-[140px]">
              <div className="flex items-center gap-1">
                <Clock size={11} />
                Recorded At
              </div>
            </TableHead>
            <TableHead className="font-sans text-[11px] font-semibold uppercase tracking-wider text-right">
              HR
            </TableHead>
            <TableHead className="font-sans text-[11px] font-semibold uppercase tracking-wider text-right">
              BP
            </TableHead>
            <TableHead className="font-sans text-[11px] font-semibold uppercase tracking-wider text-right">
              SpO₂
            </TableHead>
            <TableHead className="font-sans text-[11px] font-semibold uppercase tracking-wider text-right">
              RR
            </TableHead>
            <TableHead className="font-sans text-[11px] font-semibold uppercase tracking-wider text-right">
              Temp
            </TableHead>
            <TableHead className="font-sans text-[11px] font-semibold uppercase tracking-wider text-right">
              MAP
            </TableHead>
            <TableHead className="font-sans text-[11px] font-semibold uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <User size={11} />
                Recorded By
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vitals.map((v, index) => {
            const prev = vitals[index + 1];

            const pulseTrend = getTrend(v, prev, VITAL_CONFIG[1]);
            const bpTrend = getTrend(v, prev, VITAL_CONFIG[2]);
            const spo2Trend = getTrend(v, prev, VITAL_CONFIG[3]);
            const rrTrend = getTrend(v, prev, VITAL_CONFIG[4]);
            const tempTrend = getTrend(v, prev, VITAL_CONFIG[0]);

            const sys = parseInt(v.systolicBp, 10);
            const dia = parseInt(v.diastolicBp, 10);
            const mapVal =
              !isNaN(sys) && !isNaN(dia) ? Math.round(dia + (sys - dia) / 3) : null;

            const recordedBy = v.recordedBy
              ? `${v.recordedBy.firstName || ''} ${v.recordedBy.lastName || ''}`.trim()
              : 'Unknown';

            return (
              <TableRow key={v.id} className="hover:bg-muted/30">
                <TableCell className="font-tnum text-xs whitespace-nowrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        {format(new Date(v.recordedAt), 'MMM d, y h:mm a')}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {format(new Date(v.recordedAt), 'PPP p')}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>

                <TableCell className="font-tnum text-xs text-right">
                  <div className="flex items-center justify-end gap-1">
                    {v.pulse != null ? (
                      <>
                        <span
                          className={
                            v.pulse < 45 || v.pulse > 130
                              ? 'text-destructive font-semibold'
                              : v.pulse > 100 || v.pulse < 55
                                ? 'text-amber-500 font-semibold'
                                : 'text-rose-500'
                          }
                        >
                          {v.pulse}
                        </span>
                        {(() => {
                          const TI = TREND_ICONS[pulseTrend];
                          return <TI size={10} className={TREND_CLASSES[pulseTrend]} />;
                        })()}
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                </TableCell>

                <TableCell className="font-tnum text-xs text-right">
                  <div className="flex items-center justify-end gap-1">
                    {v.systolicBp && v.diastolicBp ? (
                      <>
                        <span
                          className={
                            sys < 85 || sys > 180 || dia < 50 || dia > 110
                              ? 'text-destructive font-semibold'
                              : sys > 140 || sys < 95 || dia > 90 || dia < 60
                                ? 'text-amber-500 font-semibold'
                                : 'text-primary'
                          }
                        >
                          {v.systolicBp}/{v.diastolicBp}
                        </span>
                        {(() => {
                          const TI = TREND_ICONS[bpTrend];
                          return <TI size={10} className={TREND_CLASSES[bpTrend]} />;
                        })()}
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                </TableCell>

                <TableCell className="font-tnum text-xs text-right">
                  <div className="flex items-center justify-end gap-1">
                    {v.spo2 != null ? (
                      <>
                        <span
                          className={
                            v.spo2 < 90
                              ? 'text-destructive font-semibold'
                              : v.spo2 < 95
                                ? 'text-amber-500 font-semibold'
                                : 'text-cyan-500'
                          }
                        >
                          {v.spo2}%
                        </span>
                        {(() => {
                          const TI = TREND_ICONS[spo2Trend];
                          return <TI size={10} className={TREND_CLASSES[spo2Trend]} />;
                        })()}
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                </TableCell>

                <TableCell className="font-tnum text-xs text-right">
                  <div className="flex items-center justify-end gap-1">
                    {v.respiratoryRate != null ? (
                      <>
                        <span
                          className={
                            v.respiratoryRate < 8 || v.respiratoryRate > 30
                              ? 'text-destructive font-semibold'
                              : v.respiratoryRate > 24 || v.respiratoryRate < 12
                                ? 'text-amber-500 font-semibold'
                                : 'text-violet-500'
                          }
                        >
                          {v.respiratoryRate}
                        </span>
                        {(() => {
                          const TI = TREND_ICONS[rrTrend];
                          return <TI size={10} className={TREND_CLASSES[rrTrend]} />;
                        })()}
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                </TableCell>

                <TableCell className="font-tnum text-xs text-right">
                  <div className="flex items-center justify-end gap-1">
                    {v.temperature != null ? (
                      <>
                        <span
                          className={
                            parseFloat(v.temperature) < 35.5 ||
                            parseFloat(v.temperature) > 39.0
                              ? 'text-destructive font-semibold'
                              : parseFloat(v.temperature) > 38.0 ||
                                  parseFloat(v.temperature) < 36.0
                                ? 'text-amber-500 font-semibold'
                                : 'text-emerald-500'
                          }
                        >
                          {typeof v.temperature === 'number'
                            ? v.temperature.toFixed(1)
                            : v.temperature}
                          °
                        </span>
                        {(() => {
                          const TI = TREND_ICONS[tempTrend];
                          return <TI size={10} className={TREND_CLASSES[tempTrend]} />;
                        })()}
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                </TableCell>

                <TableCell className="font-tnum text-xs text-right">
                  {mapVal != null ? (
                    <span
                      className={
                        mapVal < 65 || mapVal > 110
                          ? 'text-destructive font-semibold'
                          : mapVal > 100 || mapVal < 70
                            ? 'text-amber-500 font-semibold'
                            : 'text-primary'
                      }
                    >
                      {mapVal}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>

                <TableCell className="font-sans text-xs whitespace-nowrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help flex items-center gap-1">
                        <User size={10} className="text-muted-foreground" />
                        {recordedBy}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="capitalize">{v.recordedBy?.role || 'Unknown'}</span>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ================================================================
   Main Page Component
   ================================================================ */
export default function PatientVitalsPage() {
  const { admission } = useOutletContext();
  const admissionId = admission?.id;

  const { vitals, isLoading, error, refetch } = useVitals(admissionId, 50);

  const latest = vitals[0] || null;
  const previous = vitals[1] || null;

  const status = latest ? computeStatus(latest) : null;

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="p-4 sm:p-6 space-y-6">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <div>
              <h1 className="font-display text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                Vital Signs
              </h1>
              <p className="font-sans text-xs text-muted-foreground mt-0.5">
                Latest readings and historical data for this admission.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {status && (
              <Badge variant={status.variant} className="font-sans text-[11px] uppercase tracking-wider">
                {status.label}
              </Badge>
            )}
            {latest?.recordedAt && (
              <span className="font-tnum font-sans text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded">
                Last updated: {format(new Date(latest.recordedAt), 'MMM d, h:mm a')}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleRefetch}
              aria-label="Refresh vitals"
            >
              <RefreshCcw size={14} />
            </Button>
          </div>
        </div>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive px-4 py-3">
            <AlertTriangle size={16} className="shrink-0" />
            <p className="font-sans text-sm">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10 h-7"
              onClick={handleRefetch}
            >
              Retry
            </Button>
          </div>
        )}

        <Separator className="bg-border" />

        {/* ── Current Vitals Cards ─────────────────────────────────────── */}
        <section aria-label="Current vital signs">
          <h2 className="font-sans text-sm font-semibold text-foreground mb-3">
            Current Reading
          </h2>
          {isLoading ? (
            <VitalCardsSkeleton />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {VITAL_CONFIG.map((config) => (
                <VitalCard
                  key={config.key}
                  config={config}
                  latest={latest}
                  previous={previous}
                />
              ))}
            </div>
          )}
        </section>

        <Separator className="bg-border" />

        {/* ── Vitals History Table ─────────────────────────────────────── */}
        <section aria-label="Vitals history">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-sans text-sm font-semibold text-foreground flex items-center gap-2">
              <History size={14} className="text-muted-foreground" />
              Vitals History
            </h2>
            <span className="font-sans text-xs text-muted-foreground">
              {vitals.length} {vitals.length === 1 ? 'record' : 'records'}
            </span>
          </div>
          <VitalsHistoryTable vitals={vitals} isLoading={isLoading} />
        </section>
      </div>
    </TooltipProvider>
  );
}
