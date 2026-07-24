import { useState, useEffect, useCallback } from 'react';
import { bedsService } from '../services/bedsService';

export function useBeds(status) {
  const [beds, setBeds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBeds = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await bedsService.getBeds(status);
      setBeds(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch beds');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchBeds();
  }, [fetchBeds]);

  return { beds, isLoading, error, refetch: fetchBeds };
}
