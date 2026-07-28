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
      
      const [logsData, statsData] = await Promise.all([
        auditService.getAuditLogs({ search, page, limit: 10, eventLevel, category }),
        auditService.getAuditLogStats()
      ]);
      
      setLogs(logsData.data || []);
      setMeta(logsData.meta || null);
      setStats(statsData);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [search, page, eventLevel, category]);

  useEffect(() => {
    // Basic debounce for search if needed, but for now we fetch directly
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  // Reset page to 1 when search or filters change
  useEffect(() => {
    setPage(1);
  }, [search, eventLevel, category]);

  return { 
    logs, 
    meta,
    stats, 
    isLoading, 
    error, 
    search, 
    setSearch, 
    eventLevel,
    setEventLevel,
    category,
    setCategory,
    page,
    setPage,
    refetch: fetchLogs 
  };
}
