import { useState, useEffect, useCallback } from 'react';
import { bedsService } from '../services/bedsService';

/**
 * Beds list. Pass a `pageSize` to page on the server — the endpoint then
 * returns { data, meta } instead of a bare array. Callers that need every bed
 * (bed pickers, dashboards) omit it and keep the full list.
 *
 * A caller that varies `status` should call setPage(1) alongside it, otherwise
 * a narrower filter can leave you past the last page.
 */
export function useBeds(status, { pageSize } = {}) {
  const paginated = Boolean(pageSize);

  const [beds, setBeds] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: pageSize || 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({ total: 0, occupied: 0, available: 0, maintenance: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!paginated) return;
    try {
      setStats(await bedsService.getBedStats());
    } catch (err) {
      console.error('Failed to fetch bed stats:', err);
    }
  }, [paginated]);

  const fetchBeds = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await bedsService.getBeds(status, paginated ? { page, limit: pageSize } : undefined);
      if (paginated) {
        setBeds(res?.data || []);
        setMeta(res?.meta || { total: 0, page, limit: pageSize, totalPages: 1 });
      } else {
        setBeds(Array.isArray(res) ? res : res?.data || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch beds');
    } finally {
      setIsLoading(false);
    }
  }, [status, paginated, page, pageSize]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBeds();
  }, [fetchBeds]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchBeds(), fetchStats()]);
  }, [fetchBeds, fetchStats]);

  const createBed = async (data) => {
    const newBed = await bedsService.createBed(data);
    await refetch();
    return newBed;
  };

  const updateBedStatus = async (id, newStatus) => {
    const updatedBed = await bedsService.updateBedStatus(id, newStatus);
    await refetch();
    return updatedBed;
  };

  return { beds, meta, stats, page, setPage, isLoading, error, refetch, createBed, updateBedStatus };
}
