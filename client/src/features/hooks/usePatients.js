import { useState, useEffect, useCallback } from 'react';
import { patientsService } from '../services/patientsService';

export function usePatients(params = {}) {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use a stringified version of params in deps to avoid infinite loops if an object is passed inline
  const paramsStr = JSON.stringify(params);

  const fetchPatientsCensus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const parsedParams = JSON.parse(paramsStr);
      // Fetch active admissions (now optimized from backend to include latestVitals, diagnosesList, and nurses)
      const admissions = await patientsService.getActiveAdmissions(parsedParams);

      // Ensure data maps exactly to what components expect
      const enrichedAdmissions = admissions.map((admission) => ({
        ...admission,
        latestVitals: admission.latestVitals || null,
        diagnosesList: admission.diagnosesList || [],
        nursesList: admission.nurses || [],
      }));

      setPatients(enrichedAdmissions);
    } catch (err) {
      console.error('Failed to fetch patient census:', err);
      setError(err?.response?.data?.message || 'Failed to fetch patients list');
    } finally {
      setIsLoading(false);
    }
  }, [paramsStr]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPatientsCensus();
  }, [fetchPatientsCensus]);

  return {
    patients,
    isLoading,
    error,
    refetch: fetchPatientsCensus,
  };
}
