import { useState, useEffect, useCallback } from 'react';
import { vitalsService } from '../services/vitalsService';

export function useVitals(admissionId, limit = 50) {
  const [vitals, setVitals] = useState([]);
  const [isLoading, setIsLoading] = useState(!!admissionId);
  const [error, setError] = useState(null);

  const fetchVitals = useCallback(async () => {
    if (!admissionId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await vitalsService.getVitalsHistory(admissionId, { limit });
      setVitals(data);
    } catch (err) {
      console.error('Failed to fetch vitals:', err);
      setError(err?.response?.data?.message || 'Failed to load vitals data');
    } finally {
      setIsLoading(false);
    }
  }, [admissionId, limit]);

  useEffect(() => {
    if (!admissionId) return;
    const timer = setTimeout(() => fetchVitals(), 0);
    return () => clearTimeout(timer);
  }, [admissionId, fetchVitals]);

  return {
    vitals,
    isLoading,
    error,
    refetch: fetchVitals,
  };
}

