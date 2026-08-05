import { useState, useEffect, useCallback } from 'react';
import { patientsService } from '../services/patientsService';

/**
 * Server-driven patient census for the patient list screen.
 *
 * Search, acuity and unit filtering all happen in the database alongside
 * pagination — filtering only the current page would silently hide matches
 * that live on other pages. Ward totals and the unit dropdown come from a
 * separate census call for the same reason.
 */
export function usePatientCensus({ pageSize = 10, status = 'ACTIVE' } = {}) {
  const [patients, setPatients] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: pageSize, totalPages: 1 });
  const [stats, setStats] = useState({ total: 0, critical: 0, watchful: 0, stable: 0 });
  const [units, setUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [acuityFilter, setAcuityFilter] = useState('All');
  const [unitFilter, setUnitFilter] = useState('All');
  const [page, setPage] = useState(1);

  const fetchPage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await patientsService.getActiveAdmissionsPaginated({
        status,
        page,
        limit: pageSize,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(acuityFilter !== 'All' ? { acuity: acuityFilter } : {}),
        ...(unitFilter !== 'All' ? { unit: unitFilter } : {}),
      });

      const list = res?.data || [];
      setPatients(list.map((admission) => ({
        ...admission,
        latestVitals: admission.latestVitals || null,
        diagnosesList: admission.diagnosesList || [],
        nursesList: admission.nurses || [],
      })));
      setMeta(res?.meta || { total: list.length, page, limit: pageSize, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch patient census:', err);
      setError(err?.response?.data?.message || 'Failed to fetch patients list');
    } finally {
      setIsLoading(false);
    }
  }, [status, page, pageSize, search, acuityFilter, unitFilter]);

  // Ward totals ignore the filters, so they only refresh on mount and on an
  // explicit refetch rather than on every keystroke.
  const [censusNonce, setCensusNonce] = useState(0);
  const refetchCensus = useCallback(() => setCensusNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const census = await patientsService.getAdmissionCensus(status);
        if (cancelled) return;
        setStats(census.stats);
        setUnits(census.units || []);
      } catch (err) {
        console.error('Failed to fetch census stats:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [status, censusNonce]);

  useEffect(() => {
    // Debounce so typing in the search box issues one request, not one per key.
    const timer = setTimeout(fetchPage, 300);
    return () => clearTimeout(timer);
  }, [fetchPage]);

  // A narrower result set can have fewer pages than the one you're on, so any
  // filter change resets to page 1 in the same render pass.
  const applyFilter = useCallback((setter) => (value) => {
    setter(value);
    setPage(1);
  }, []);

  return {
    patients,
    meta,
    stats,
    units,
    isLoading,
    error,
    search,
    setSearch: applyFilter(setSearch),
    acuityFilter,
    setAcuityFilter: applyFilter(setAcuityFilter),
    unitFilter,
    setUnitFilter: applyFilter(setUnitFilter),
    page,
    setPage,
    refetch: () => { fetchPage(); refetchCensus(); },
  };
}
