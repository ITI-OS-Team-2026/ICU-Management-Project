import { lazy } from 'react';

/**
 * Code-split route components.
 *
 * Each entry becomes its own bundle chunk, fetched the first time someone
 * visits that route and cached from then on. Before this, every page shipped
 * in a single 1.7 MB file — a nurse opening the login screen also downloaded
 * the admission wizard, the audit log viewer and the charting library, none of
 * which their role can reach.
 *
 * These live apart from `router.jsx` because that module's export is the
 * router config, not a component, and mixing the two breaks Fast Refresh.
 */

export const LandingPage = lazy(() => import('../pages/LandingPage'));
export const LoginPage = lazy(() => import('../pages/LoginPage'));
export const DashboardPage = lazy(() => import('../pages/DashboardPage'));
export const PatientListPage = lazy(() => import('../pages/PatientListPage'));
export const AdmitPatientPage = lazy(() => import('../pages/AdmitPatientPage'));
export const BedOverviewPage = lazy(() => import('../pages/BedOverviewPage'));
export const VitalsMonitorPage = lazy(() => import('../pages/VitalsMonitorPage'));
export const VitalsEntryPage = lazy(() => import('../pages/VitalsEntryPage'));
export const MedAdministrationPage = lazy(() => import('../pages/MedAdministrationPage'));
export const LabResultsPage = lazy(() => import('../pages/LabResultsPage'));
export const DischargePage = lazy(() => import('../pages/DischargePage'));
export const AdminUsersPage = lazy(() => import('../pages/AdminUsersPage'));
export const AdminBedsPage = lazy(() => import('../pages/AdminBedsPage'));
export const AuditLogsPage = lazy(() => import('../pages/AuditLogsPage'));
export const LoginAttemptsPage = lazy(() => import('../pages/LoginAttemptsPage'));
export const NursingNotesPage = lazy(() => import('../pages/NursingNotesPage'));
export const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
export const SettingsPage = lazy(() => import('../pages/SettingsPage'));
export const HelpPage = lazy(() => import('../pages/HelpPage'));
export const MedicalAssistantPage = lazy(() => import('../pages/MedicalAssistantPage'));

// Patient detail tab pages
export const PatientOverviewPage = lazy(() => import('../pages/patient/PatientOverviewPage'));
export const PatientVitalsPage = lazy(() => import('../pages/patient/PatientVitalsPage'));
export const PatientMedicationsPage = lazy(() => import('../pages/patient/PatientMedicationsPage'));
export const PatientDiagnosesPage = lazy(() => import('../pages/patient/PatientDiagnosesPage'));
export const PatientNotesPage = lazy(() => import('../pages/patient/PatientNotesPage'));
export const PatientTimelinePage = lazy(() => import('../pages/patient/PatientTimelinePage'));
export const PatientDocumentsPage = lazy(() => import('../pages/patient/PatientDocumentsPage'));
export const PatientFollowUpsPage = lazy(() => import('../pages/patient/PatientFollowUpsPage'));
export const PatientAlertsPage = lazy(() => import('../pages/patient/PatientAlertsPage'));
export const PatientTreatmentApprovalsPage = lazy(() =>
  import('../pages/patient/PatientTreatmentApprovalsPage')
);
export const PatientAIAssistantPage = lazy(() => import('../pages/patient/PatientAIAssistantPage'));
export const PatientRagChatPage = lazy(() => import('../pages/patient/PatientRagChatPage'));
