import { useState, useEffect, useCallback } from 'react';
import { auditService } from '../services/auditService';

/**
 * Time windows the log can be narrowed to. Must match AUDIT_RANGES in the
 * server's admin.service.js.
 *
 * The default is the last 24 hours rather than "today": since local midnight
 * leaves the page reading zero for the first hours of every day, and an ICU
 * night shift straddles midnight, so the window would reset in the middle of
 * the shift an auditor is reviewing.
 */
export const AUDIT_RANGES = [
  { value: '24h', label: 'Last 24h', scope: 'in the last 24 hours' },
  { value: 'today', label: 'Today', scope: 'today' },
  { value: '7d', label: '7 days', scope: 'in the last 7 days' },
  { value: '30d', label: '30 days', scope: 'in the last 30 days' },
  { value: 'all', label: 'All time', scope: 'all time' },
];

export const DEFAULT_AUDIT_RANGE = '24h';

/**
 * Must match AUDIT_CATEGORIES in the server's admin/auditCategories.js.
 *
 * `Treatments` and `AI` were added after the original four left five audited
 * tables — TreatmentApproval, FollowUp and the three AI tables — belonging to
 * no category at all, which made them unreachable by every filter here.
 */
export const AUDIT_CATEGORIES = [
  'All',
  'Patients',
  'Admissions',
  'Documents',
  'Treatments',
  'AI',
  'Admin',
];

export const AUDIT_LEVELS = ['All', 'Info', 'Warning', 'Critical'];

export function useAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [eventLevel, setEventLevel] = useState('All');
  const [category, setCategory] = useState('All');
  const [range, setRange] = useState(DEFAULT_AUDIT_RANGE);
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const logsData = await auditService.getAuditLogs({ search, page, limit: 10, eventLevel, category, range });

      setLogs(logsData.data || []);
      setMeta(logsData.meta || null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [search, page, eventLevel, category, range]);

  // Stats summarise the whole window, so they ignore search/level/category —
  // but they must follow `range`, or the cards would describe a different span
  // of time than the rows underneath them.
  const [statsNonce, setStatsNonce] = useState(0);
  const refetchStats = useCallback(() => setStatsNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const statsData = await auditService.getAuditLogStats({ range });
        if (!cancelled) setStats(statsData);
      } catch (err) {
        console.error('Failed to fetch audit log stats:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [statsNonce, range]);

  useEffect(() => {
    // Debounce so typing in the search box issues one request, not one per key.
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  // Changing a filter must send you back to page 1, otherwise the narrower
  // result set can have fewer pages than the page you are currently on.
  // Done in the setters rather than an effect so it happens in the same render
  // pass — an effect would queue a second render and a redundant fetch.
  const applyFilter = useCallback((setter) => (value) => {
    setter(value);
    setPage(1);
  }, []);

  return {
    logs,
    meta,
    stats,
    isLoading,
    error,
    search,
    setSearch: applyFilter(setSearch),
    eventLevel,
    setEventLevel: applyFilter(setEventLevel),
    category,
    setCategory: applyFilter(setCategory),
    range,
    setRange: applyFilter(setRange),
    // The wording for "…in the last 24 hours" under the cards, so the labels
    // cannot drift from the window actually being counted.
    rangeScope: (AUDIT_RANGES.find((r) => r.value === range) || AUDIT_RANGES[0]).scope,
    page,
    setPage,
    refetch: () => { fetchLogs(); refetchStats(); }
  };
}
