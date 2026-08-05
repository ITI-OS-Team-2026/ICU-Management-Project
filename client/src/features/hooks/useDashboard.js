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

      // 1. Get active admissions
      const activeAdmissions = await dashboardService.getActiveAdmissions();

      let criticalCount = 0;
      let totalPendingLabs = 0;
      let totalAiAlerts = 0;
      const gatheredActivities = [];

      // 2. Derive everything from that one response.
      //
      // The list query carries the newest vital sign, the active diagnoses and
      // the pending investigation orders for each admission, so the dashboard
      // costs a single request rather than one per patient on top of it. From
      // Egypt against a us-east-1 database that difference is the whole load
      // time — every extra request is another Atlantic round trip.
      const enrichedAdmissions = activeAdmissions.map((admission) => {
        const vitals = admission.latestVitals || null;
        const diagnoses = admission.diagnosesList || [];
        const investigations = admission.pendingInvestigations || [];

        // Count critical cases
        const isCritical = checkIsCritical(vitals);
        if (isCritical) {
          criticalCount++;
          totalAiAlerts += 1; // Simulate alert trigger
        }

        // Count pending investigations
        totalPendingLabs += investigations.length;

        // Compile dynamic activity logs based on DB state
        const bedStr = admission.bed?.bed_number ? `Bed ${admission.bed.bed_number.split('/')[1] || admission.bed.bed_number}` : 'Bed —';
        const patName = admission.patient?.name || 'Patient';

        if (vitals) {
          const vitalsAt = new Date(vitals.recordedAt || admission.updatedAt).getTime();

          gatheredActivities.push({
            type: 'vitals',
            title: 'Vitals updated',
            desc: `${patName} — ${bedStr}`,
            dotColor: 'bg-status-available',
            timestamp: vitalsAt,
          });

          if (isCritical) {
            gatheredActivities.push({
              type: 'alert',
              title: 'Critical alert raised',
              desc: `System Alert: abnormal vitals — ${bedStr}`,
              dotColor: 'bg-destructive',
              timestamp: vitalsAt,
            });
          }
        }

        investigations.forEach((inv) => {
          gatheredActivities.push({
            type: 'lab',
            title: `${inv.type} order pending`,
            desc: `${inv.orderName} — ${bedStr}`,
            dotColor: 'bg-status-reserved',
            timestamp: new Date(inv.orderDate || admission.createdAt).getTime(),
          });
        });

        diagnoses.forEach((diag) => {
          gatheredActivities.push({
            type: 'diagnosis',
            title: 'Diagnosis updated',
            desc: `${diag.conditionName} — ${bedStr}`,
            dotColor: 'bg-status-occupied',
            timestamp: new Date(diag.diagnosedAt || admission.updatedAt).getTime(),
          });
        });

        return {
          ...admission,
          latestVitals: vitals,
          isCritical,
          pendingInvestigations: investigations,
        };
      });

      // Sort activities newest first. No placeholder rows are injected when the
      // list is empty — this is a clinical feed, so an empty state must read as
      // empty rather than showing invented patients, beds and alerts.
      const sortedActivities = gatheredActivities
        .filter((act) => !Number.isNaN(act.timestamp))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
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
