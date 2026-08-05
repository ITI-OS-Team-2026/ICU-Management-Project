import { useState, useEffect, useCallback } from 'react';
import { loginAttemptService } from '../services/loginAttemptService';

/**
 * Time windows the list can be narrowed to. Must match AUDIT_RANGE_VALUES in
 * the server's admin.schema.js (shared with the audit log's own ranges).
 */
export const LOGIN_ATTEMPT_RANGES = [
  { value: '24h', label: 'Last 24h', scope: 'in the last 24 hours' },
  { value: 'today', label: 'Today', scope: 'today' },
  { value: '7d', label: '7 days', scope: 'in the last 7 days' },
  { value: '30d', label: '30 days', scope: 'in the last 30 days' },
  { value: 'all', label: 'All time', scope: 'all time' },
];

export const DEFAULT_LOGIN_ATTEMPT_RANGE = '24h';

export const LOGIN_ATTEMPT_OUTCOMES = ['All', 'SUCCESS', 'FAILED'];

export function useLoginAttempts() {
  const [attempts, setAttempts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState('All');
  const [range, setRange] = useState(DEFAULT_LOGIN_ATTEMPT_RANGE);
  const [page, setPage] = useState(1);

  const fetchAttempts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const attemptsData = await loginAttemptService.getLoginAttempts({
        search, page, limit: 10, outcome, range,
      });

      setAttempts(attemptsData.data || []);
      setMeta(attemptsData.meta || null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch login attempts');
    } finally {
      setIsLoading(false);
    }
  }, [search, page, outcome, range]);

  // Stats summarise the whole window, so they ignore search/outcome — but
  // they must follow `range`, or the cards would describe a different span
  // of time than the rows underneath them.
  const [statsNonce, setStatsNonce] = useState(0);
  const refetchStats = useCallback(() => setStatsNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const statsData = await loginAttemptService.getLoginAttemptStats({ range });
        if (!cancelled) setStats(statsData);
      } catch (err) {
        console.error('Failed to fetch login attempt stats:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [statsNonce, range]);

  useEffect(() => {
    // Debounce so typing in the search box issues one request, not one per key.
    const timer = setTimeout(() => {
      fetchAttempts();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAttempts]);

  // Changing a filter must send you back to page 1, otherwise the narrower
  // result set can have fewer pages than the page you are currently on.
  const applyFilter = useCallback((setter) => (value) => {
    setter(value);
    setPage(1);
  }, []);

  return {
    attempts,
    meta,
    stats,
    isLoading,
    error,
    search,
    setSearch: applyFilter(setSearch),
    outcome,
    setOutcome: applyFilter(setOutcome),
    range,
    setRange: applyFilter(setRange),
    rangeScope: (LOGIN_ATTEMPT_RANGES.find((r) => r.value === range) || LOGIN_ATTEMPT_RANGES[0]).scope,
    page,
    setPage,
    refetch: () => { fetchAttempts(); refetchStats(); }
  };
}
