import { Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { landingLoader, loginLoader, requireAuthLoader, roleGuardLoader } from './authLoaders';
import { RouteError, RouteFallback } from './RouteStates';
import * as Pages from './lazyPages';

// The app shell stays in the entry bundle. Splitting a layout would only add a
// second waterfall — the page inside it cannot begin loading until its layout
// has — and every authenticated route needs MainLayout anyway.
import MainLayout from '../layouts/MainLayout';
import PatientDetailLayout from '../layouts/PatientDetailLayout';

/**
 * Wraps a code-split page in the Suspense boundary it requires.
 *
 * Lowercase on purpose: it is a helper that returns an element, not a
 * component, and naming it as one would have React tooling treat it as a
 * component boundary it is not.
 */
const page = (Component) => (
  <Suspense fallback={<RouteFallback />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  // ── Public ────────────────────────────────────────────────────────────────
  // The very first thing anyone hits. Guests see the marketing page; anyone
  // with a session is bounced straight to /dashboard by the loader.
  {
    path: '/',
    element: page(Pages.LandingPage),
    loader: landingLoader,
    errorElement: <RouteError />,
  },

  // ── Guest-only ──────────────────────────────────────────────────────────
  {
    path: '/login',
    element: page(Pages.LoginPage),
    loader: loginLoader,
    errorElement: <RouteError />,
  },

  // ── Authenticated layout ─────────────────────────────────────────────────
  // Pathless on purpose: it wraps its children in the app shell without
  // claiming a path segment of its own, so a sibling can own exact "/" for
  // the public landing page above while these children keep their existing
  // absolute paths (/dashboard, /patients, /beds, ...) unchanged.
  {
    element: <MainLayout />,
    loader: requireAuthLoader,
    errorElement: <RouteError />,
    children: [
      // Shared across all clinical roles
      {
        path: 'dashboard',
        element: page(Pages.DashboardPage),
      },
      {
        path: 'patients',
        element: page(Pages.PatientListPage),
        loader: roleGuardLoader(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },
      {
        path: 'medical-assistant',
        element: page(Pages.MedicalAssistantPage),
        loader: roleGuardLoader(['MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },

      // ── Patient detail nested layout ──────────────────────────────────────
      {
        path: 'patients/:admissionId',
        element: <PatientDetailLayout />,
        // Nurses need read access to the clinical tabs and must be able to
        // record treatment execution; per-endpoint roles are enforced server-side.
        loader: roleGuardLoader(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
        children: [
          { index: true,          element: page(Pages.PatientOverviewPage) },
          { path: 'vitals',       element: page(Pages.PatientVitalsPage) },
          { path: 'medications',  element: page(Pages.PatientMedicationsPage) },
          { path: 'diagnoses',    element: page(Pages.PatientDiagnosesPage) },
          { path: 'notes',        element: page(Pages.PatientNotesPage) },
          { path: 'timeline',     element: page(Pages.PatientTimelinePage) },
          { path: 'documents',    element: page(Pages.PatientDocumentsPage) },
          { path: 'follow-ups',    element: page(Pages.PatientFollowUpsPage) },
          { path: 'treatment-approvals', element: page(Pages.PatientTreatmentApprovalsPage) },
          { path: 'alerts',       element: page(Pages.PatientAlertsPage) },
          { path: 'ai-assistant', element: page(Pages.PatientAIAssistantPage) },
          // RAG assistant — Residents and Specialists only; the endpoints
          // enforce the same restriction server-side.
          {
            path: 'ai-chat',
            element: page(Pages.PatientRagChatPage),
            loader: roleGuardLoader(['MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
          },
        ],
      },
      { 
        path: 'patients/admit', 
        element: page(Pages.AdmitPatientPage),
        loader: roleGuardLoader(['MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },
      { 
        path: 'beds', 
        element: page(Pages.BedOverviewPage),
        loader: roleGuardLoader(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },
      { 
        path: 'vitals/monitor', 
        element: page(Pages.VitalsMonitorPage),
        loader: roleGuardLoader(['MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },
      { 
        path: 'vitals/entry', 
        element: page(Pages.VitalsEntryPage),
        loader: roleGuardLoader(['ICU_NURSE']),
      },
      {
        // Prescribing lives in the patient's own Medications tab
        // (/patients/:id/medications), not on a standalone ward-wide page.
        path: 'medications/administration',
        element: page(Pages.MedAdministrationPage),
        loader: roleGuardLoader(['ICU_NURSE']),
      },
      { 
        path: 'labs', 
        element: page(Pages.LabResultsPage),
        loader: roleGuardLoader(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },
      { 
        path: 'discharge', 
        element: page(Pages.DischargePage),
        loader: roleGuardLoader(['ICU_SPECIALIST']),
      },
      {
        path: 'nursing-notes',
        element: page(Pages.NursingNotesPage),
        loader: roleGuardLoader(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
      },
      {
        path: 'settings',
        element: page(Pages.SettingsPage),
      },
      {
        path: 'help',
        element: page(Pages.HelpPage),
      },

      // Admin-only routes — roleGuardLoader redirects non-admins to /
      {
        path: 'admin/users',
        element: page(Pages.AdminUsersPage),
        loader: roleGuardLoader(['SYSTEM_ADMIN']),
      },
      {
        path: 'admin/beds',
        element: page(Pages.AdminBedsPage),
        loader: roleGuardLoader(['SYSTEM_ADMIN']),
      },
      {
        path: 'admin/audit-logs',
        element: page(Pages.AuditLogsPage),
        loader: roleGuardLoader(['SYSTEM_ADMIN']),
      },
      {
        path: 'admin/login-attempts',
        element: page(Pages.LoginAttemptsPage),
        loader: roleGuardLoader(['SYSTEM_ADMIN']),
      },
    ],
  },
  
  // ── 404 Catch-all ────────────────────────────────────────────────────────
  {
    path: '*',
    element: page(Pages.NotFoundPage),
  },
]);
