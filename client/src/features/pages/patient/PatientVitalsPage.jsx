/* ================================================================
   Imports
   ================================================================ */
import { useCallback, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Clock,
  Heart,
  History,
  LineChart,
  Loader2,
  RefreshCcw,
  Thermometer,
  Wind,
  AlertTriangle,
  Droplets,
  User,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useVitalsHistory } from '../../hooks/useVitalsHistory';
import {
  VitalTrendChart,
  BloodPressureTrendChart,
} from '../../components/VitalTrendChart';
import {
  getChronologicalVitals,
  getOverallVitalStatus,
  getVitalStatus,
  getVitalValue,
} from '../../utils/vitalStatus';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    format: (v) => (typeof v === 'number' ? v.toFixed(1) : v),
  },
  {
    key: 'pulse',
    label: 'Heart Rate',
    unit: 'bpm',
    icon: Heart,
    normalRange: { min: 40, max: 140 },
    format: (v) => v,
  },
  {
    key: 'bloodPressure',
    label: 'Blood Pressure',
    unit: 'mmHg',
    icon: Activity,
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
    format: (v) => v,
  },
  {
    key: 'respiratoryRate',
    label: 'Respiratory Rate',
    unit: '/min',
    icon: Wind,
    normalRange: { min: 8, max: 30 },
    format: (v) => v,
  },
  {
    key: 'map',
    label: 'MAP',
    unit: 'mmHg',
    icon: Activity,
    format: (_v, record) => getVitalValue(record, 'map') ?? '—',
    isDerived: true,
  },
];

const VITAL_TREND_CONFIG = [
  { title: 'Heart Rate', unit: 'bpm', icon: Heart, dataKey: 'pulse', ariaLabel: 'Heart rate trend chart' },
  { title: 'SpO₂', unit: '%', icon: Droplets, dataKey: 'spo2', ariaLabel: 'Oxygen saturation trend chart' },
  { title: 'Temperature', unit: '°C', icon: Thermometer, dataKey: 'temperature', ariaLabel: 'Temperature trend chart' },
  { title: 'Respiratory Rate', unit: '/min', icon: Wind, dataKey: 'respiratoryRate', ariaLabel: 'Respiratory rate trend chart' },
  { title: 'MAP', unit: 'mmHg', icon: Activity, dataKey: 'map', ariaLabel: 'Mean arterial pressure trend chart' },
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

const TREND_ICONS = {
  up: ArrowUp,
  down: ArrowDown,
  same: null,
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

  const status = getVitalStatus(
    config.key,
    config.isDerived ? getVitalValue(latest, config.key) : latest?.[config.key],
    latest,
  );

  const trend = getTrend(latest, previous, config);
  const TrendIcon = TREND_ICONS[trend];

  const isEmpty =
    value === '—' || value === null || value === undefined || value === '';

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon size={13} className="text-muted-foreground" />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {config.label}
            </span>
          </div>
          {!isEmpty && TrendIcon && (
            <Tooltip>
              <TooltipTrigger render={
                <span className="cursor-help" />
              }>
                  <TrendIcon size={12} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top">
                <span className="capitalize">{`${trend} since last reading`}</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className={`font-tnum text-2xl font-bold leading-none ${status.colorClass}`}>
          {isEmpty ? '—' : value}
        </div>

        <div className="flex items-center justify-between">
          <Badge variant={status.badgeVariant} className={`font-sans text-[10px] uppercase tracking-wide ${status.colorClass}`}>
            {status.label}
          </Badge>
          {config.normalRange ? (
            <Tooltip>
              <TooltipTrigger render={
                <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-wide cursor-help" />
              }>
                  {config.unit}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Normal: {config.normalRange.min}–{config.normalRange.max} {config.unit}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-wide">
              {config.unit}
            </span>
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

            const mapVal = getVitalValue(v, 'map');

            const pulseStatus = getVitalStatus('pulse', v.pulse, v);
            const bpStatus = getVitalStatus('bloodPressure', null, v);
            const spo2Status = getVitalStatus('spo2', v.spo2, v);
            const rrStatus = getVitalStatus('respiratoryRate', v.respiratoryRate, v);
            const tempStatus = getVitalStatus('temperature', v.temperature, v);
            const mapStatus = getVitalStatus('map', mapVal, v);

            const recordedBy = v.recordedBy
              ? `${v.recordedBy.firstName || ''} ${v.recordedBy.lastName || ''}`.trim()
              : 'Unknown';

            return (
              <TableRow key={v.id} className="hover:bg-muted/30">
                <TableCell className="font-tnum text-xs whitespace-nowrap">
                  <Tooltip>
                    <TooltipTrigger render={
                      <span className="cursor-help" />
                    }>
                        {format(new Date(v.recordedAt), 'MMM d, y h:mm a')}
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
                          className={`${pulseStatus.colorClass} ${pulseStatus.label !== 'Normal' && pulseStatus.label !== 'No data' ? 'font-semibold' : ''}`}
                        >
                          {v.pulse}
                        </span>
                        {(() => {
                          const TI = TREND_ICONS[pulseTrend];
                          return TI ? <TI size={10} className="text-muted-foreground" /> : null;
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
                          className={`${bpStatus.colorClass} ${bpStatus.label !== 'Normal' && bpStatus.label !== 'No data' ? 'font-semibold' : ''}`}
                        >
                          {v.systolicBp}/{v.diastolicBp}
                        </span>
                        {(() => {
                          const TI = TREND_ICONS[bpTrend];
                          return TI ? <TI size={10} className="text-muted-foreground" /> : null;
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
                          className={`${spo2Status.colorClass} ${spo2Status.label !== 'Normal' && spo2Status.label !== 'No data' ? 'font-semibold' : ''}`}
                        >
                          {v.spo2}%
                        </span>
                        {(() => {
                          const TI = TREND_ICONS[spo2Trend];
                          return TI ? <TI size={10} className="text-muted-foreground" /> : null;
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
                          className={`${rrStatus.colorClass} ${rrStatus.label !== 'Normal' && rrStatus.label !== 'No data' ? 'font-semibold' : ''}`}
                        >
                          {v.respiratoryRate}
                        </span>
                        {(() => {
                          const TI = TREND_ICONS[rrTrend];
                          return TI ? <TI size={10} className="text-muted-foreground" /> : null;
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
                          className={`${tempStatus.colorClass} ${tempStatus.label !== 'Normal' && tempStatus.label !== 'No data' ? 'font-semibold' : ''}`}
                        >
                          {typeof v.temperature === 'number'
                            ? v.temperature.toFixed(1)
                            : v.temperature}
                          °
                        </span>
                        {(() => {
                          const TI = TREND_ICONS[tempTrend];
                          return TI ? <TI size={10} className="text-muted-foreground" /> : null;
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
                      className={`${mapStatus.colorClass} ${mapStatus.label !== 'Normal' && mapStatus.label !== 'No data' ? 'font-semibold' : ''}`}
                    >
                      {mapVal}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>

                <TableCell className="font-sans text-xs whitespace-nowrap">
                  <Tooltip>
                    <TooltipTrigger render={
                      <span className="cursor-help flex items-center gap-1" />
                    }>
                        <User size={10} className="text-muted-foreground" />
                        {recordedBy}
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
   Vitals History Section
   ================================================================ */

const RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

function DateRangeFilter({ range, setRange, customFrom, setCustomFrom, customTo, setCustomTo, disabled }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
      <div className="flex items-center gap-2">
        <Calendar size={13} className="text-muted-foreground shrink-0" />
        <Select
          value={range}
          onValueChange={setRange}
          disabled={disabled}
        >
          <SelectTrigger className="w-[160px]" size="sm">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {range === 'custom' && (
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <Label className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              From
            </Label>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              disabled={disabled}
              className="h-7 text-xs px-2"
            />
          </div>
          <span className="text-muted-foreground text-xs pb-3">→</span>
          <div className="space-y-1">
            <Label className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              To
            </Label>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              disabled={disabled}
              className="h-7 text-xs px-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function VitalsHistorySection({ admissionId }) {
  const {
    vitals,
    visibleCount,
    totalLoaded,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    range,
    setRange,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    loadMore,
  } = useVitalsHistory(admissionId);

  return (
    <section aria-label="Vitals history" className="space-y-3">
      {/* ── Header & Filters ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-sans text-sm font-semibold text-foreground flex items-center gap-2">
            <History size={14} className="text-muted-foreground" />
            Vitals History
          </h2>
          <span className="font-sans text-xs text-muted-foreground">
            {isLoading
              ? 'Loading…'
              : error
              ? '—'
              : `Showing ${visibleCount} of ${totalLoaded} record${totalLoaded !== 1 ? 's' : ''}`}
          </span>
        </div>

        <DateRangeFilter
          range={range}
          setRange={setRange}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          disabled={isLoading}
        />
      </div>

      {/* ── Table ── */}
      <VitalsHistoryTable vitals={vitals} isLoading={isLoading} />

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs font-sans">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* ── Load More ── */}
      {hasMore && !isLoading && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            className="font-sans text-xs"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 size={13} className="mr-1.5 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <ChevronDown size={13} className="mr-1.5" />
                Load Older Records
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}


/* ================================================================
   Main Page Component
   ================================================================ */
export default function PatientVitalsPage() {
  const { admission } = useOutletContext();
  const admissionId = admission?.id;

  const { vitals, isLoading, error, refetch } = useVitals(admissionId, 50);

  const chronologicalVitals = useMemo(() => getChronologicalVitals(vitals), [vitals]);
  const latest = chronologicalVitals.at(-1) || null;
  const previous = chronologicalVitals.at(-2) || null;
  const status = latest ? getOverallVitalStatus(latest) : null;

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
              <Badge variant={status.badgeVariant} className={`font-sans text-[11px] uppercase tracking-wider ${status.colorClass}`}>
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

        {/* ── Vitals Trend Charts ──────────────────────────────────────── */}
        <section aria-label="Vitals trends">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-sans text-sm font-semibold text-foreground flex items-center gap-2">
              <LineChart size={14} className="text-muted-foreground" />
              Vitals Trends
            </h2>
          </div>

          {isLoading ? (
            <div className="flex flex-col space-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-border w-full">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Separator className="bg-border" />
                    <Skeleton className="h-[220px] w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col space-y-6">
              {VITAL_TREND_CONFIG.map((trend) => (
                <VitalTrendChart
                  key={trend.dataKey}
                  {...trend}
                  data={vitals}
                  layout="stacked"
                  heightClass="h-[220px]"
                />
              ))}

              <BloodPressureTrendChart
                data={vitals}
                layout="stacked"
                heightClass="h-[220px]"
                ariaLabel="Blood pressure trend chart"
              />
            </div>
          )}
        </section>

        <Separator className="bg-border" />

        {/* ── Vitals History ─────────────────────────────────────────── */}
        <VitalsHistorySection admissionId={admissionId} />
      </div>
    </TooltipProvider>
  );
}
