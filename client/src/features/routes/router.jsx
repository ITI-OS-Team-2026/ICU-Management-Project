import { createBrowserRouter, useRouteError } from 'react-router-dom';

import { loginLoader, requireAuthLoader, roleGuardLoader } from './authLoaders';

import MainLayout from '../layouts/MainLayout';
import PatientDetailLayout from '../layouts/PatientDetailLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import PatientListPage from '../pages/PatientListPage';
import AdmitPatientPage from '../pages/AdmitPatientPage';
import BedOverviewPage from '../pages/BedOverviewPage';
import VitalsMonitorPage from '../pages/VitalsMonitorPage';
import VitalsEntryPage from '../pages/VitalsEntryPage';
import MedicationsPage from '../pages/MedicationsPage';
import MedAdministrationPage from '../pages/MedAdministrationPage';
import LabResultsPage from '../pages/LabResultsPage';
import DischargePage from '../pages/DischargePage';
import AdminUsersPage from '../pages/AdminUsersPage';
import AdminBedsPage from '../pages/AdminBedsPage';
import NursingNotesPage from '../pages/NursingNotesPage';
import NotFoundPage from '../pages/NotFoundPage';

// Patient detail tab pages
import PatientOverviewPage    from '../pages/patient/PatientOverviewPage';
import PatientVitalsPage      from '../pages/patient/PatientVitalsPage';
import PatientMedicationsPage from '../pages/patient/PatientMedicationsPage';
import PatientDiagnosesPage   from '../pages/patient/PatientDiagnosesPage';
import PatientNotesPage       from '../pages/patient/PatientNotesPage';
import PatientDocumentsPage   from '../pages/patient/PatientDocumentsPage';
import PatientTimelinePage    from '../pages/patient/PatientTimelinePage';
import PatientAlertsPage      from '../pages/patient/PatientAlertsPage';
import PatientAIAssistantPage from '../pages/patient/PatientAIAssistantPage';

function RouteError() {
  const error = useRouteError();
  console.error("ROUTE ERROR:", error);
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We could not load this page. Refresh and try again.
        </p>
        <div className="mt-4 text-xs text-red-500 max-w-lg text-left overflow-auto p-2 bg-red-500/10 rounded">
          {error?.message || error?.statusText || "Unknown error"}
          <br/>
          {error?.stack}
        </div>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  // ── Guest-only ──────────────────────────────────────────────────────────
  {
    path: '/login',
    element: <LoginPage />,
    loader: loginLoader,
    errorElement: <RouteError />,
  },

  // ── Authenticated layout ─────────────────────────────────────────────────
  {
    path: '/',
    element: <MainLayout />,
    loader: requireAuthLoader,
    errorElement: <RouteError />,
    children: [
      // Shared across all clinical roles
      { 
        index: true, 
        element: <DashboardPage /> 
      },
      { 
        path: 'patients', 
        element: <PatientListPage />,
        loader: roleGuardLoader(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },

      // ── Patient detail nested layout ──────────────────────────────────────
      {
        path: 'patients/:admissionId',
        element: <PatientDetailLayout />,
        loader: roleGuardLoader(['MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
        children: [
          { index: true,          element: <PatientOverviewPage /> },
          { path: 'vitals',       element: <PatientVitalsPage /> },
          { path: 'medications',  element: <PatientMedicationsPage /> },
          { path: 'diagnoses',    element: <PatientDiagnosesPage /> },
          { path: 'notes',        element: <PatientNotesPage /> },
          { path: 'documents',    element: <PatientDocumentsPage /> },
          { path: 'timeline',     element: <PatientTimelinePage /> },
          { path: 'alerts',       element: <PatientAlertsPage /> },
          { path: 'ai-assistant', element: <PatientAIAssistantPage /> },
        ],
      },
      { 
        path: 'patients/admit', 
        element: <AdmitPatientPage />,
        loader: roleGuardLoader(['MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },
      { 
        path: 'beds', 
        element: <BedOverviewPage />,
        loader: roleGuardLoader(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },
      { 
        path: 'vitals/monitor', 
        element: <VitalsMonitorPage />,
        loader: roleGuardLoader(['MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },
      { 
        path: 'vitals/entry', 
        element: <VitalsEntryPage />,
        loader: roleGuardLoader(['ICU_NURSE']),
      },
      { 
        path: 'medications', 
        element: <MedicationsPage />,
        loader: roleGuardLoader(['MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },
      { 
        path: 'medications/administration', 
        element: <MedAdministrationPage />,
        loader: roleGuardLoader(['ICU_NURSE']),
      },
      { 
        path: 'labs', 
        element: <LabResultsPage />,
        loader: roleGuardLoader(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },
      { 
        path: 'discharge', 
        element: <DischargePage />,
        loader: roleGuardLoader(['ICU_SPECIALIST']),
      },

      // Admin-only routes — roleGuardLoader redirects non-admins to /
      {
        path: 'admin/users',
        element: <AdminUsersPage />,
        loader: roleGuardLoader(['SYSTEM_ADMIN']),
      },
      {
        path: 'admin/beds',
        element: <AdminBedsPage />,
        loader: roleGuardLoader(['SYSTEM_ADMIN']),
      },
    ],
  },
  
  // ── 404 Catch-all ────────────────────────────────────────────────────────
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
