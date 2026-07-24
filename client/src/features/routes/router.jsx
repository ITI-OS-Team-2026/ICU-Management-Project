import { createBrowserRouter } from 'react-router-dom';

import { loginLoader, requireAuthLoader, roleGuardLoader } from './authLoaders';

import MainLayout from '../layouts/MainLayout';
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

function RouteError() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We could not load this page. Refresh and try again.
        </p>
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
      { index: true,                      element: <DashboardPage /> },
      { path: 'patients',                 element: <PatientListPage /> },
      { path: 'patients/admit',           element: <AdmitPatientPage /> },
      { path: 'beds',                     element: <BedOverviewPage /> },
      { path: 'vitals/monitor',           element: <VitalsMonitorPage /> },
      { path: 'vitals/entry',             element: <VitalsEntryPage /> },
      { path: 'medications',              element: <MedicationsPage /> },
      { path: 'medications/administration', element: <MedAdministrationPage /> },
      { path: 'labs',                     element: <LabResultsPage /> },
      { path: 'discharge',               element: <DischargePage /> },

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
]);
