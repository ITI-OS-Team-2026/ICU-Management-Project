import { useState, useEffect, useCallback } from 'react';
import { auditService } from '../services/auditService';

export function useAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [eventLevel, setEventLevel] = useState('All');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const logsData = await auditService.getAuditLogs({ search, page, limit: 10, eventLevel, category });

      setLogs(logsData.data || []);
      setMeta(logsData.meta || null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [search, page, eventLevel, category]);

  // Stats are a global "today" summary and ignore the filters, so they are
  // fetched on mount (and on explicit retry) rather than on every keystroke.
  const [statsNonce, setStatsNonce] = useState(0);
  const refetchStats = useCallback(() => setStatsNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const statsData = await auditService.getAuditLogStats();
        if (!cancelled) setStats(statsData);
      } catch (err) {
        console.error('Failed to fetch audit log stats:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [statsNonce]);

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
    page,
    setPage,
    refetch: () => { fetchLogs(); refetchStats(); }
  };
}
