/* eslint-disable react-refresh/only-export-components */
import { memo, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getVitalStatus, getVitalValue } from '@/features/utils/vitalStatus';

const MIN_POINTS = 3;

export const TIME_RANGE_OPTIONS = [
  { id: '24h', label: '24h', fullLabel: '24 Hours' },
  { id: '7d', label: '7d', fullLabel: '7 Days' },
  { id: '30d', label: '30d', fullLabel: '30 Days' },
  { id: 'all', label: 'All', fullLabel: 'All Time' },
];

export function TimeRangeSelector({ value, onChange, className = '' }) {
  return (
    <div className={`inline-flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border ${className}`}>
      {TIME_RANGE_OPTIONS.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <Button
            key={opt.id}
            type="button"
            variant={isSelected ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onChange(opt.id)}
            className={`h-5 px-1.5 text-[10px] font-medium transition-colors ${
              isSelected
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={`Filter by ${opt.fullLabel}`}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

function formatTimestamp(timestamp, pattern) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : format(date, pattern);
}

function getDefaultDateFormat(range) {
  if (range === '24h') return 'HH:mm';
  if (range === '7d') return 'MMM d, HH:mm';
  if (range === '30d') return 'MMM d';
  return 'MMM d, HH:mm';
}

function filterTrendData(allData, range) {
  if (!allData || !allData.length || range === 'all') return allData;

  const latestTime = Math.max(...allData.map((item) => item.timestamp));

  let cutoffMs = 0;
  if (range === '24h') cutoffMs = 24 * 60 * 60 * 1000;
  else if (range === '7d') cutoffMs = 7 * 24 * 60 * 60 * 1000;
  else if (range === '30d') cutoffMs = 30 * 24 * 60 * 60 * 1000;

  if (!cutoffMs) return allData;

  const filtered = allData.filter((item) => item.timestamp >= latestTime - cutoffMs);
  return filtered.length >= MIN_POINTS ? filtered : allData;
}

function createTrendData(readings, getValue) {
  return (readings || [])
    .map((reading) => {
      const timestamp = new Date(reading?.recordedAt).getTime();
      const value = getValue(reading);

      if (!Number.isFinite(timestamp) || !Number.isFinite(value)) return null;

      return {
        timestamp,
        label: formatTimestamp(timestamp, 'MMM d, h:mm a'),
        value,
        reading,
      };
    })
    .filter(Boolean)
    .sort((first, second) => first.timestamp - second.timestamp);
}

function ClinicalChartTooltip({ active, payload, unit, formatValue, dataKey, fallbackColorClass }) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;
  const status = dataKey ? getVitalStatus(dataKey, point.value ?? point.systolic, point.reading) : null;
  const colorClass = status?.colorClass || fallbackColorClass || 'text-foreground';

  return (
    <Card className="border-border bg-popover shadow-sm">
      <CardContent className="p-2">
        <p className="font-sans text-[10px] text-muted-foreground">{point.label}</p>
        <p className={`font-tnum text-sm font-bold ${colorClass}`}>
          {formatValue(point)} {unit}
        </p>
      </CardContent>
    </Card>
  );
}

function ChartHeader({ Icon, title, unit, status, readingCount, timeRange, onTimeRangeChange, showTimeFilter = true }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {Icon && <Icon size={14} className={status.colorClass} aria-hidden="true" />}
          <h3 className="truncate font-sans text-xs font-semibold uppercase tracking-wider text-foreground">
            {title}
          </h3>
        </div>
        <span className="shrink-0 font-sans text-[10px] uppercase tracking-wide text-muted-foreground">{unit}</span>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant={status.badgeVariant} className={`font-sans text-[10px] uppercase tracking-wide ${status.colorClass}`}>
          {status.label}
        </Badge>
        <div className="flex items-center gap-2">
          {showTimeFilter && onTimeRangeChange && (
            <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
          )}
          <span className="shrink-0 font-sans text-[10px] text-muted-foreground">{readingCount} readings</span>
        </div>
      </div>
    </>
  );
}

function StackedChartHeader({ Icon, title, unit, status, latestValue, readingCount, timeRange, onTimeRangeChange, showTimeFilter = true }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={16} className={status.colorClass} aria-hidden="true" />}
        <h3 className="truncate font-sans text-sm font-semibold text-foreground">
          {title} ({unit}) — Vitals Trend
        </h3>
        <Badge variant={status.badgeVariant} className={`font-sans text-[10px] uppercase tracking-wide ${status.colorClass}`}>
          {status.label}
        </Badge>
      </div>
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        {showTimeFilter && onTimeRangeChange && (
          <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
        )}
        <span className="font-sans text-xs text-muted-foreground">{readingCount} readings</span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-sans text-xs text-muted-foreground">Latest:</span>
          <span className={`font-tnum text-base font-bold ${status.colorClass}`}>
            {latestValue}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyTrendCard({ Icon, title, unit, ariaLabel, layout = 'compact', timeRange, onTimeRangeChange, showTimeFilter = true }) {
  return (
    <Card className="border-border" aria-label={ariaLabel}>
      <CardContent className="space-y-3 p-4">
        {layout === 'stacked' ? (
          <StackedChartHeader
            Icon={Icon}
            title={title}
            unit={unit}
            status={getVitalStatus('unknown')}
            latestValue="—"
            readingCount={0}
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
            showTimeFilter={showTimeFilter}
          />
        ) : (
          <ChartHeader
            Icon={Icon}
            title={title}
            unit={unit}
            status={getVitalStatus('unknown')}
            readingCount={0}
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
            showTimeFilter={showTimeFilter}
          />
        )}
        <Separator className="bg-border" />
        <div className="flex h-[120px] items-center justify-center font-sans text-xs text-muted-foreground">
          Insufficient data for trend
        </div>
      </CardContent>
    </Card>
  );
}

export const VitalTrendChart = memo(function VitalTrendChart({
  title,
  unit,
  icon,
  data,
  dataKey,
  ariaLabel,
  layout = 'compact',
  heightClass,
  dateFormat,
  timeRange: controlledTimeRange,
  onTimeRangeChange,
  showTimeFilter = true,
}) {
  const [internalTimeRange, setInternalTimeRange] = useState('all');
  const activeTimeRange = controlledTimeRange !== undefined ? controlledTimeRange : internalTimeRange;
  const handleRangeChange = onTimeRangeChange || setInternalTimeRange;

  const rawChartData = useMemo(
    () => createTrendData(data, (reading) => getVitalValue(reading, dataKey)),
    [data, dataKey],
  );

  const chartData = useMemo(
    () => filterTrendData(rawChartData, activeTimeRange),
    [rawChartData, activeTimeRange],
  );

  const latestPoint = chartData.at(-1);
  const latestStatus = getVitalStatus(dataKey, latestPoint?.value, latestPoint?.reading);
  const actualHeight = heightClass || (layout === 'stacked' ? 'h-[220px]' : 'h-[180px]');
  const resolvedDateFormat = dateFormat || getDefaultDateFormat(activeTimeRange);

  if (chartData.length < MIN_POINTS) {
    return (
      <EmptyTrendCard
        Icon={icon}
        title={title}
        unit={unit}
        ariaLabel={ariaLabel}
        layout={layout}
        timeRange={activeTimeRange}
        onTimeRangeChange={handleRangeChange}
        showTimeFilter={showTimeFilter}
      />
    );
  }

  const formattedValue = dataKey === 'temperature' ? latestPoint.value.toFixed(1) : latestPoint.value;

  return (
    <Card className="border-border w-full" aria-label={ariaLabel}>
      <CardContent className="space-y-3 p-4">
        {layout === 'stacked' ? (
          <StackedChartHeader
            Icon={icon}
            title={title}
            unit={unit}
            status={latestStatus}
            latestValue={formattedValue}
            readingCount={chartData.length}
            timeRange={activeTimeRange}
            onTimeRangeChange={handleRangeChange}
            showTimeFilter={showTimeFilter}
          />
        ) : (
          <>
            <ChartHeader
              Icon={icon}
              title={title}
              unit={unit}
              status={latestStatus}
              readingCount={chartData.length}
              timeRange={activeTimeRange}
              onTimeRangeChange={handleRangeChange}
              showTimeFilter={showTimeFilter}
            />
            <div className={`font-tnum text-2xl font-bold leading-none ${latestStatus.colorClass}`}>
              {formattedValue}
            </div>
          </>
        )}
        <Separator className="bg-border" />
        <div className={`${actualHeight} w-full`} role="img" aria-label={`${ariaLabel}. Latest ${latestPoint.value} ${unit}, ${latestStatus.label.toLowerCase()}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 24, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(timestamp) => formatTimestamp(timestamp, resolvedDateFormat)}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
                tickLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
                minTickGap={32}
                height={24}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={36}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={
                  <ClinicalChartTooltip
                    unit={unit}
                    dataKey={dataKey}
                    fallbackColorClass={latestStatus.colorClass}
                    formatValue={(point) => (dataKey === 'temperature' ? point.value?.toFixed(1) : point.value)}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={latestStatus.stroke}
                fill={latestStatus.stroke}
                fillOpacity={0.12}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--background)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

export const BloodPressureTrendChart = memo(function BloodPressureTrendChart({
  data,
  ariaLabel,
  layout = 'compact',
  heightClass,
  dateFormat,
  timeRange: controlledTimeRange,
  onTimeRangeChange,
  showTimeFilter = true,
}) {
  const [internalTimeRange, setInternalTimeRange] = useState('all');
  const activeTimeRange = controlledTimeRange !== undefined ? controlledTimeRange : internalTimeRange;
  const handleRangeChange = onTimeRangeChange || setInternalTimeRange;

  const rawChartData = useMemo(
    () => createTrendData(data, (reading) => {
      const systolic = Number(reading?.systolicBp);
      const diastolic = Number(reading?.diastolicBp);
      return Number.isFinite(systolic) && Number.isFinite(diastolic) ? systolic : Number.NaN;
    }).map((point) => ({
      ...point,
      systolic: Number(point.reading.systolicBp),
      diastolic: Number(point.reading.diastolicBp),
    })),
    [data],
  );

  const chartData = useMemo(
    () => filterTrendData(rawChartData, activeTimeRange),
    [rawChartData, activeTimeRange],
  );

  const latestPoint = chartData.at(-1);
  const latestStatus = getVitalStatus('bloodPressure', null, latestPoint?.reading);
  const actualHeight = heightClass || (layout === 'stacked' ? 'h-[220px]' : 'h-[180px]');
  const resolvedDateFormat = dateFormat || getDefaultDateFormat(activeTimeRange);

  if (chartData.length < MIN_POINTS) {
    return (
      <EmptyTrendCard
        title="Blood Pressure"
        unit="mmHg"
        ariaLabel={ariaLabel}
        layout={layout}
        timeRange={activeTimeRange}
        onTimeRangeChange={handleRangeChange}
        showTimeFilter={showTimeFilter}
      />
    );
  }

  const bpValue = `${latestPoint.systolic}/${latestPoint.diastolic}`;

  return (
    <Card className="border-border w-full" aria-label={ariaLabel}>
      <CardContent className="space-y-3 p-4">
        {layout === 'stacked' ? (
          <StackedChartHeader
            title="Blood Pressure"
            unit="mmHg"
            status={latestStatus}
            latestValue={bpValue}
            readingCount={chartData.length}
            timeRange={activeTimeRange}
            onTimeRangeChange={handleRangeChange}
            showTimeFilter={showTimeFilter}
          />
        ) : (
          <>
            <ChartHeader
              title="Blood Pressure"
              unit="mmHg"
              status={latestStatus}
              readingCount={chartData.length}
              timeRange={activeTimeRange}
              onTimeRangeChange={handleRangeChange}
              showTimeFilter={showTimeFilter}
            />
            <div className={`font-tnum text-2xl font-bold leading-none ${latestStatus.colorClass}`}>
              {bpValue}
            </div>
            <div className="font-sans text-[10px] text-muted-foreground">Systolic — solid · Diastolic — dashed</div>
          </>
        )}
        <Separator className="bg-border" />
        <div className={`${actualHeight} w-full`} role="img" aria-label={`${ariaLabel}. Latest ${latestPoint.systolic}/${latestPoint.diastolic} mmHg, ${latestStatus.label.toLowerCase()}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 24, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(timestamp) => formatTimestamp(timestamp, resolvedDateFormat)}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
                tickLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
                minTickGap={32}
                height={24}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={36}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={
                  <ClinicalChartTooltip
                    unit="mmHg"
                    dataKey="bloodPressure"
                    fallbackColorClass={latestStatus.colorClass}
                    formatValue={(point) => `${point.systolic}/${point.diastolic}`}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="systolic"
                stroke={latestStatus.stroke}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--background)' }}
              />
              <Line
                type="monotone"
                dataKey="diastolic"
                stroke={latestStatus.stroke}
                strokeDasharray="4 3"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 1.5, stroke: 'var(--background)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
