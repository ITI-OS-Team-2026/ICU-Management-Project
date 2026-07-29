import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { vitalsService } from '../services/vitalsService';

const PAGE_SIZE = 20;

function toISODate(d) {
  return d.toISOString();
}

function getRangeDates(range, customFrom, customTo) {
  const now = new Date();
  const to = toISODate(now);
  let from;
  switch (range) {
    case '24h':
      from = toISODate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      break;
    case '7d':
      from = toISODate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      break;
    case '30d':
      from = toISODate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      break;
    case 'custom':
      from = customFrom ? toISODate(new Date(customFrom)) : undefined;
      return {
        from: from || undefined,
        to: customTo ? toISODate(new Date(customTo)) : undefined,
      };
    default:
      return {};
  }
  return { from, to };
}

export function useVitalsHistory(admissionId) {
  const [range, setRange] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [vitals, setVitals] = useState([]);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const limitRef = useRef(PAGE_SIZE);

  const dateParams = useMemo(
    () => getRangeDates(range, customFrom, customTo),
    [range, customFrom, customTo]
  );

  const fetchBatch = useCallback(
    async (limit, { append = false } = {}) => {
      if (!admissionId) return;
      try {
        const data = await vitalsService.getVitalsHistory(admissionId, {
          limit,
          ...dateParams,
        });
        const fetched = Array.isArray(data) ? data : [];

        setTotalLoaded(fetched.length);
        setHasMore(fetched.length >= limit);

        if (append) {
          setVitals((prev) => {
            const map = new Map(prev.map((v) => [v.id, v]));
            fetched.forEach((v) => map.set(v.id, v));
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.recordedAt) - new Date(a.recordedAt)
            );
          });
        } else {
          setVitals(
            fetched.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
          );
        }
      } catch (err) {
        console.error('Failed to fetch vitals history:', err);
        setError(err?.response?.data?.message || 'Failed to load vitals history');
        throw err;
      }
    },
    [admissionId, dateParams]
  );

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    limitRef.current = PAGE_SIZE;
    try {
      await fetchBatch(PAGE_SIZE, { append: false });
    } finally {
      setIsLoading(false);
    }
  }, [fetchBatch]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    limitRef.current += PAGE_SIZE;
    try {
      await fetchBatch(limitRef.current, { append: true });
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchBatch, hasMore, isLoadingMore]);

  /* Fetch initial batch when admission or date filter changes */
  useEffect(() => {
    if (!admissionId) {
      setVitals([]);
      setTotalLoaded(0);
      setHasMore(false);
      return;
    }
    loadInitial();
  }, [admissionId, dateParams, loadInitial]);

  const visibleCount = vitals.length;

  return {
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
    refresh: loadInitial,
  };
}
