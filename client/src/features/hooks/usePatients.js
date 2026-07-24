import { useState, useEffect, useCallback } from 'react';
import { patientsService } from '../services/patientsService';

export function usePatients() {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPatientsCensus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch active admissions
      const admissions = await patientsService.getActiveAdmissions();

      // 2. Fetch vitals, diagnoses, and nurses in parallel for each active admission
      const enrichedAdmissions = await Promise.all(
        admissions.map(async (admission) => {
          try {
            const [vitals, diagnoses, nurses] = await Promise.all([
              patientsService.getLatestVitals(admission.id),
              patientsService.getDiagnoses(admission.id),
              patientsService.getAdmissionNurses(admission.id),
            ]);

            return {
              ...admission,
              latestVitals: vitals,
              diagnosesList: diagnoses,
              nursesList: nurses,
            };
          } catch (err) {
            console.error(`Failed to fetch details for admission ${admission.id}:`, err);
            // Return admission with fallback empty details if one request fails
            return {
              ...admission,
              latestVitals: null,
              diagnosesList: [],
              nursesList: [],
            };
          }
        })
      );

      setPatients(enrichedAdmissions);
    } catch (err) {
      console.error('Failed to fetch patient census:', err);
      setError(err?.response?.data?.message || 'Failed to fetch patients list');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatientsCensus();
  }, [fetchPatientsCensus]);

  return {
    patients,
    isLoading,
    error,
    refetch: fetchPatientsCensus,
  };
}
