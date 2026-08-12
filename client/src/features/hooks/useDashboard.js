import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/dashboardService';

// Helper to determine acuity dynamically from latest vitals
const checkIsCritical = (vitals) => {
  if (!vitals) return false;
  const temp = vitals.temperature ? parseFloat(vitals.temperature) : 37.0;
  const pulse = vitals.pulse ? parseInt(vitals.pulse, 10) : 75;
  const spo2 = vitals.spo2 ? parseInt(vitals.spo2, 10) : 98;
  const sBp = vitals.systolicBp ? parseInt(vitals.systolicBp, 10) : 120;
  const dBp = vitals.diastolicBp ? parseInt(vitals.diastolicBp, 10) : 80;
  const rr = vitals.respiratoryRate ? parseInt(vitals.respiratoryRate, 10) : 16;

  let criticalCount = 0;
  if (spo2 < 90) criticalCount += 2;
  if (pulse > 130 || pulse < 45) criticalCount++;
  if (temp > 39.0 || temp < 35.5) criticalCount++;
  if (sBp > 180 || sBp < 85) criticalCount++;
  if (rr > 28 || rr < 9) criticalCount++;

  return criticalCount > 0;
};

// Renders a real elapsed time from a timestamp. Activity rows previously carried
// hardcoded labels ("2m ago") that had no relation to when the event happened.
const formatRelativeTime = (timestamp) => {
  if (!timestamp || Number.isNaN(timestamp)) return '';
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export function useDashboard() {
  const [stats, setStats] = useState({
    activePatients: 0,
    criticalCases: 0,
    pendingLabs: 0,
    aiAlerts: 0,
  });
  const [admissions, setAdmissions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Get active admissions & clinical logs concurrently
      const [activeAdmissions, clinicalLogs] = await Promise.all([
        dashboardService.getActiveAdmissions(),
        dashboardService.getClinicalLogs(),
      ]);

      let criticalCount = 0;
      let totalPendingLabs = 0;
      let totalAiAlerts = 0;

      // 2. Derive admission stats
      const enrichedAdmissions = activeAdmissions.map((admission) => {
        const vitals = admission.latestVitals || null;
        const investigations = admission.pendingInvestigations || [];

        const isCritical = checkIsCritical(vitals);
        if (isCritical) {
          criticalCount++;
          totalAiAlerts += 1;
        }

        totalPendingLabs += investigations.length;

        return {
          ...admission,
          latestVitals: vitals,
          isCritical,
          pendingInvestigations: investigations,
        };
      });

      // 3. Map real audit logs to activities
      const gatheredActivities = clinicalLogs.map((log) => {
        let dotColor = 'bg-status-available';
        if (log.action === 'ARCHIVE') dotColor = 'bg-destructive';
        else if (log.action === 'UPDATE') dotColor = 'bg-status-maintenance';
        
        if (log.targetTable === 'Medication') dotColor = 'bg-primary';
        if (log.targetTable === 'Diagnosis') dotColor = 'bg-status-occupied';
        if (log.targetTable === 'LabResult' || log.targetTable === 'InvestigationOrder') dotColor = 'bg-status-reserved';

        const type = log.targetTable.toLowerCase();
        
        let title = `${log.targetTable} ${log.action.toLowerCase()}d`;
        if (log.targetTable === 'VitalSign') title = `Vitals ${log.action.toLowerCase()}d`;
        
        let desc = `By ${log.user?.name || 'System'}`;
        if (log.patientName) {
          desc += ` for ${log.patientName}`;
        }
        if (log.targetTable === 'Medication' && log.newValues?.drugName) {
          desc += ` — ${log.newValues.drugName}`;
        }
        
        return {
          id: log.id,
          type: type === 'vitalsign' ? 'vitals' : type,
          title,
          desc,
          dotColor,
          timestamp: new Date(log.createdAt).getTime(),
          oldValues: log.oldValues,
          newValues: log.newValues,
        };
      });

      const sortedActivities = gatheredActivities
        .filter((act) => !Number.isNaN(act.timestamp))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 15)
        .map((act) => ({ ...act, time: formatRelativeTime(act.timestamp) }));

      setAdmissions(enrichedAdmissions);
      setStats({
        activePatients: activeAdmissions.length,
        criticalCases: criticalCount,
        pendingLabs: totalPendingLabs,
        aiAlerts: totalAiAlerts,
      });
      setActivities(sortedActivities);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err?.response?.data?.message || 'Failed to load dashboard stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    admissions,
    activities,
    isLoading,
    error,
    refetch: fetchDashboardData,
  };
}
