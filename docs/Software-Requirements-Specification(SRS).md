# Software Requirements Specification (SRS)

# SmartCare ICU
### AI-Powered Intensive Care Unit Management and Clinical Decision Support System

**Document Version:** 1.0
**Status:** MVP Baseline

---

# 1. Introduction

## 1.1 Purpose

This document specifies the functional and non-functional requirements for SmartCare ICU, a paperless ICU management platform with integrated AI clinical decision support. It is intended for the development team, project supervisors, and evaluators to establish a shared, unambiguous understanding of what the system must do before implementation begins.

## 1.2 Scope

SmartCare ICU centralizes patient data — admissions, vital signs, fluid balance, laboratory results, medications, and clinical notes — into a single, role-secure dashboard, and augments clinical workflows with AI-generated summaries, a conversational retrieval-augmented (RAG) assistant, and an autonomous monitoring agent that produces explainable alerts.

The system manages patients within a single ICU. It does not cover hospital-wide administration, billing, insurance, appointment scheduling, pharmacy inventory, or multi-hospital operation in this MVP.

## 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| ICU | Intensive Care Unit |
| RAG | Retrieval-Augmented Generation |
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token |
| GCS | Glasgow Coma Scale |
| MAP | Mean Arterial Pressure |
| SpO2 | Peripheral Oxygen Saturation |
| I/O | Fluid Intake and Output |
| MRN | Medical Record Number |
| P0 / P1 | Alert severity tiers — P0: Emergency, immediate bedside attention; P1: Clinical warning |
| MVP | Minimum Viable Product |

## 1.4 References

- SmartCare ICU Project Proposal (v1.0)
- SmartCare ICU Software Development Life Cycle document (v1.0)

## 1.5 Overview

Section 2 describes the system at a high level. Section 3 defines detailed functional requirements grouped by build phase. Section 4 covers external interfaces. Section 5 covers non-functional requirements. Section 6 defines data and compliance requirements. Section 7 lists use cases in tabular form.

---

# 2. Overall Description

## 2.1 Product Perspective

SmartCare ICU is a new, standalone web application. It is not a modification of an existing hospital system and does not integrate with an external Electronic Health Record (EHR) in this MVP. It consists of a browser-based frontend, a REST API backend, a relational database, and an AI orchestration layer.

## 2.2 Product Functions

At a high level, the system:

- Authenticates users and enforces role-based permissions.
- Manages patient admission, bed assignment, and discharge.
- Records and validates vital signs, fluid I/O, GCS scores, medications, lab results, and clinical/nursing notes.
- Presents a unified, role-adaptive patient dashboard with a persistent context header and trend visualizations.
- Generates one-click AI summaries of a patient's recent clinical course.
- Answers natural-language clinical questions via a RAG assistant with source citations.
- Continuously monitors incoming vitals and raises explainable, severity-ranked alerts.
- Preserves full data history through non-destructive (soft) deletion and immutable audit logging.

## 2.3 User Classes and Characteristics

| Role | Characteristics | Primary Goal |
|---|---|---|
| System Admin | IT/administrative staff, non-clinical | Manage accounts, roles, and system health; no clinical data access |
| ICU Nurse | Bedside staff, time-constrained, often on a tablet cart | Fast, accurate structured data entry |
| Medical Resident | Manages patients across full shifts | Deep read/write access, AI querying, alert triage |
| ICU Specialist | Senior decision-maker, rounds-based | Rapid situational overview, final treatment/discharge authority |

## 2.4 Operating Environment

- **Frontend:** Modern browsers on desktop hospital workstations (1080p–4K) and bedside tablet carts (≥1024px width, touch-first).
- **Backend:** Node.js server environment.
- **Database:** PostgreSQL, with pgvector extension for embedding storage and similarity search.
- **AI orchestration:** n8n workflows communicating with external LLM providers (Gemini Pro / GPT-4o) over HTTPS.

## 2.5 Design and Implementation Constraints

- All patient-facing clinical data must be scoped to specific ICU admissions, not just patients, to correctly support multiple admissions per patient over time.
- No clinical record may ever be permanently deleted — only archived (soft delete).
- JWTs must be delivered exclusively via `HttpOnly`, `Secure`, `SameSite=Strict` cookies; storage in `localStorage` is prohibited.
- The System Admin role must be technically prevented from querying unblinded clinical/vitals data, not merely restricted by UI hiding.
- AI-generated alerts must never silently modify clinical records; they may only write to the alerts/notifications tables.

## 2.6 Assumptions and Dependencies

- Reliable network connectivity is available within the ICU for real-time dashboard updates (offline support is out of MVP scope).
- The external LLM provider (Gemini Pro / GPT-4o) is reachable via API; a graceful fallback path is required if it is not.
- Users are pre-provisioned with valid professional credentials by the System Admin; public self-registration is out of scope.

---

# 3. Functional Requirements

Requirements are grouped into the three build phases used across the project's planning documents. Each requirement below defines not only *what* the system does, but the exact conditions under which it acts, the step-by-step behavior, what the user or caller receives back, the resulting system state, and how failure cases are handled — so that "done" is verifiable rather than a matter of interpretation.

## 3.1 Phase 1 — Foundation & Data Integrity

### FR-1.1 Secure Authentication & Role-Based Authorization

**Priority:** Critical (blocking — no other feature is accessible without this)
**Actors:** All roles

**Preconditions:** The user has a pre-provisioned account created by a System Admin.

**System Behavior:**
1. The user submits email and password via the login form over HTTPS.
2. The backend looks up the account by email. If no account matches, the system returns a generic "invalid credentials" error — it must not reveal whether the email exists.
3. The backend compares the submitted password against the stored `bcrypt` hash.
4. On success, the backend generates a JWT containing the user's `id` and `role`, signs it, and sets it inside an `HttpOnly`, `Secure`, `SameSite=Strict` cookie with a 12-hour expiry.
5. The frontend requests the current user's profile to populate the `useAuthStore` session state and conditionally render the role-appropriate navigation.
6. On every subsequent request to a protected route, backend middleware (`verifyToken`) validates the cookie's signature and expiry before the route handler executes.
7. A second middleware (`requireRole([...allowedRoles])`) checks the decoded role against the route's allowed-role list.

**Outputs:** An authenticated session (cookie) on success; an authorization decision (`200`/`401`/`403`) on every subsequent request.

**Postconditions:** The user has an active session valid for 12 hours, and the audit log contains a `LOGIN` event.

**Exception Handling:**
- Invalid credentials → `401 Unauthorized`, generic message, no account-existence hint, failed attempt logged.
- Expired or tampered token on a later request → `401 Unauthorized`, session cleared client-side, user redirected to login.
- Valid token but disallowed role for the requested route → `403 Forbidden`, attempt recorded in the audit log with user ID, role, and target route.
- More than 5 failed login attempts for one account within 15 minutes → account temporarily locked and a warning logged for System Admin review.

---

### FR-1.2 Smart Input Validation & Physiological Boundary Checks

**Priority:** Critical
**Actors:** Nurse, Resident, Specialist

**Preconditions:** The user is authenticated and viewing a vitals/GCS entry form for an active (non-discharged) admission.

**System Behavior:**
1. As the user types or leaves a numeric field, the frontend validates the value against its defined clinical range (Heart Rate 20–300 bpm, MAP 20–200 mmHg, SpO2 50–100%, Temperature 30.0–45.0°C, GCS 3–15) within 50ms of blur.
2. If out of range, the field is marked `aria-invalid="true"` with a visible, descriptive error and an `aria-describedby` explanation — the form is not silently blocked.
3. If the clinician marks the value as a confirmed emergency override, the value is accepted with a flag (`is_override: true`) stored alongside it.
4. On submit, the backend independently re-validates every field against the same ranges using a schema validator (Zod/Joi), regardless of what the frontend already checked.
5. On backend validation failure, the request is rejected before any database write occurs.

**Outputs:** Inline field-level validation feedback; on submit, either a persisted record or a structured `400` error listing every failing field.

**Postconditions:** No vitals record exists in the database with a value outside its defined range unless explicitly flagged as an override.

**Exception Handling:**
- Non-numeric input (`NaN`) → rejected at both layers, field-level error shown, no partial record created.
- Frontend/backend disagreement (e.g., a modified client bypassing frontend checks) → backend rejection is authoritative; the record is never written.
- Override flag present without a corresponding reason/comment → request rejected, reason field required for any override.

---

### FR-1.3 Soft Deletion & Action Audit Logging

**Priority:** Critical
**Actors:** Nurse, Resident, Specialist (initiate archival); System Admin (reviews audit log)

**Preconditions:** A target record (patient, vitals entry, note, document, etc.) exists and is not already archived.

**System Behavior:**
1. A delete/archive request is submitted for a specific record ID.
2. Middleware intercepts the request before the route handler runs and prepares an audit entry (actor, action type, target ID, timestamp, IP).
3. Instead of a `DELETE` SQL statement, the system executes an `UPDATE` setting `is_archived = true` and `archived_at = NOW()`.
4. All standard read queries (dashboard, timeline, reports) apply a default `WHERE is_archived = false` filter, so archived records disappear from normal views immediately.
5. The audit entry is committed to the `audit_logs` table in the same transaction as the archive action, guaranteeing the two never diverge.
6. Every other write action (create, update, AI query) follows the same audit-logging path, even when no archival is involved.

**Outputs:** A `200` confirmation to the caller; a new immutable row in `audit_logs`.

**Postconditions:** The record is hidden from standard views but fully recoverable; the audit trail has grown by exactly one entry per action, with no way to edit or remove prior entries.

**Exception Handling:**
- Attempt to archive an already-archived record → `409 Conflict`, no duplicate archive timestamp written.
- Audit log write failure → the entire transaction (including the archive action) is rolled back; an archive can never succeed without its corresponding audit entry.
- Attempt to hard-delete via direct database access is outside application control but is explicitly excluded from all application-level code paths — no endpoint issues a `DELETE`.

---

### FR-1.4 Paperless ICU Workflow CRUD Endpoints

**Priority:** Critical
**Actors:** Nurse, Resident, Specialist

**Preconditions:** The user holds a role authorized for the specific endpoint (see Access Control Matrix, Section 8).

**System Behavior:**
1. **`POST /api/patients`** — creates a patient admission profile (name, age, MRN, blood type, allergies, code status, attending specialist). The system checks MRN uniqueness among active admissions before insert; a returning patient (existing MRN, prior discharge) creates a new admission record linked to the existing patient rather than a duplicate patient.
2. **`POST /api/vitals`** — logs a vitals/GCS entry against an active admission ID, with the recording nurse's ID and a server-generated timestamp (client-supplied timestamps are not trusted).
3. **`POST /api/vitals/fluid`** — logs an intake or output entry in milliliters, tagged with type (IV infusion, enteral feed, urine, drain) and timestamp.
4. **`POST /api/documents`** — accepts a lab/radiology file via `multer`, stores it, and creates a `medical_documents` record linked to the admission; large files are streamed rather than buffered fully in memory.
5. All four endpoints run through the FR-1.1 auth/role middleware and the FR-1.3 audit-logging middleware before their handler logic executes.

**Outputs:** The created resource's ID and canonical representation, returned as JSON with `201 Created`.

**Postconditions:** A new row exists in the relevant table, correctly linked to its admission; an audit log entry exists for the creation.

**Exception Handling:**
- Vitals/document submitted against a discharged or archived admission → `409 Conflict`, write refused.
- MRN collision on new patient creation → `409 Conflict` with a suggestion to search existing patients instead.
- Unsupported file type or file exceeding size limit on document upload → `413`/`415` with a specific reason, no partial file left on disk.

---

## 3.2 Phase 2 — Core UX & Clinical Visualization

### FR-2.1 Unified Patient Dashboard

**Priority:** High
**Actors:** Nurse, Resident, Specialist

**Preconditions:** The user is authenticated and has selected a patient from the census/quick-switcher.

**System Behavior:**
1. On patient selection, the frontend requests a consolidated payload (or parallel requests resolved together) covering the latest vitals, active fluid balance, unarchived documents, and recent notes for the selected admission.
2. The dashboard renders five zones: sticky context header, live vitals panel, fluid balance tracker, lab/document repository, and clinical notes history.
3. Long lists (e.g., historical vitals) are virtualized so only visible rows are mounted, keeping the view responsive as history grows.
4. Zones update independently and reactively (via the relevant Zustand store slice) as new data arrives, without a full-page reload.

**Outputs:** A fully populated dashboard reflecting the current state of the selected admission.

**Postconditions:** The dashboard accurately reflects the database state at time of load; stale data is not silently displayed after a write elsewhere in the same session.

**Exception Handling:**
- Selected admission has been discharged/archived since the list was loaded → dashboard shows a clear "this admission has been discharged" state rather than a partially-populated or broken view.
- One data zone fails to load (e.g., document service timeout) → that zone shows a scoped error state; the rest of the dashboard remains usable.

---

### FR-2.2 Sticky Clinical Context Bar

**Priority:** High
**Actors:** Nurse, Resident, Specialist

**System Behavior:**
1. The header renders patient name, MRN, age/gender, blood type, allergy pill(s) in high-contrast styling, code status, and attending specialist.
2. The header is pinned (`position: sticky; top: 0`) and remains visible across all scroll positions and dashboard tabs.
3. The quick-switcher control opens a searchable list of active ICU beds/patients; selecting one navigates directly to that patient's dashboard without returning to a census screen first.

**Outputs:** A persistently visible identity/safety summary and a working bed-to-bed navigation shortcut.

**Exception Handling:**
- Patient has no recorded allergies → the pill area shows an explicit "No known allergies" state rather than an empty gap, so absence of data is never ambiguous with a loading failure.

---

### FR-2.3 Visual Trend Sparklines

**Priority:** Medium
**Actors:** Nurse, Resident, Specialist

**System Behavior:**
1. For each of Heart Rate, MAP, SpO2, and GCS, the system fetches the last 12–24 hours of recorded values for the current admission.
2. Each metric is rendered as an inline SVG sparkline directly beside its current numeric value in the vitals table.
3. Data points outside the metric's normal range are rendered with a distinct marker (filled circle, high-contrast) and an icon tooltip on focus/click (not hover-only, per accessibility constraints).
4. Sparklines load asynchronously and do not block the rest of the vitals table from rendering.

**Outputs:** A compact visual trend alongside every trended metric.

**Exception Handling:**
- Fewer than 2 data points available (e.g., patient just admitted) → sparkline area shows a neutral "insufficient history yet" placeholder rather than a broken or empty chart.

---

## 3.3 Phase 3 — Intelligence & AI Automation

### FR-3.1 Conversational RAG Interface

**Priority:** High
**Actors:** Resident, Specialist

**Preconditions:** The target admission has at least one vitals/note/document record to query against.

**System Behavior:**
1. The user submits a natural-language question scoped to the currently open admission.
2. The backend calls an n8n webhook, passing the admission ID and question text.
3. The n8n workflow retrieves relevant structured data (vitals, fluid balance, labs) and performs a pgvector similarity search over embedded document/note chunks for that admission only — never across other patients.
4. Retrieved context is passed to the LLM along with the question; the LLM's answer is returned to the backend, which relays it to the frontend.
5. The response is displayed with exact source timestamps and record references (e.g., "[Vitals log, 04:15 AM]") so the clinician can verify the answer against the original entry.

**Outputs:** A natural-language answer with inline source citations, or a clear no-answer state if nothing relevant is found.

**Postconditions:** The query and response are recorded in the audit log as a `QUERY_RAG` action.

**Exception Handling:**
- n8n/LLM unreachable or exceeds 6 seconds → the chat shows "AI assistant temporarily unavailable — try again shortly," and the rest of the dashboard remains fully functional (see FR-7.3 graceful degradation).
- Retrieved context is insufficient to answer confidently → the system returns an explicit "not enough recorded data to answer this" response rather than an unsupported guess.
- Question is outside the current admission's data (e.g., asks about a different patient) → the system does not cross reference other admissions and returns a scoped "no data" response.

---

### FR-3.2 Instant AI Summarization

**Priority:** High
**Actors:** Resident, Specialist

**System Behavior:**
1. The user clicks "Instant 24h Summary" on the dashboard.
2. The backend aggregates all vitals trends, fluid balances, lab changes, and nursing/clinical entries from the past 24 hours for the admission.
3. This structured data is sent to the LLM with an instruction to categorize findings under Hemodynamic Status, Respiratory & Ventilator State, Renal/Fluid Balance, and Neurological Status.
4. The generated summary is displayed and persisted as an `ai_summaries` record linked to the admission.

**Outputs:** A structured, four-category clinical summary, rendered within 5 seconds.

**Postconditions:** The summary is stored and retrievable later from the patient timeline, not regenerated silently on every view.

**Exception Handling:**
- Insufficient data for one or more categories (e.g., no lab draws in 24h) → that category explicitly states "no data recorded in this period" rather than being omitted or fabricated.
- Generation exceeds 5 seconds → the UI shows a progress indicator past that point rather than appearing frozen, and still returns the result rather than aborting, unless the LLM call itself times out (see FR-3.1 degradation behavior).

---

### FR-3.3 Autonomous Monitoring Agent & Alerting

**Priority:** Critical
**Actors:** System (background agent); Nurse and Resident (recipients)

**System Behavior:**
1. A scheduled job polls newly recorded vitals for all active admissions on a fixed interval.
2. Each new reading is evaluated against both single-variable thresholds and known multi-variable deterioration patterns (e.g., falling MAP + rising HR + rising temperature suggesting early septic shock; falling SpO2 + rising respiratory rate suggesting respiratory failure).
3. When a pattern is matched, the agent creates an `alerts` record with a severity tier (P0 Emergency or P1 Clinical Warning) and a generated explanation (see FR-3.4).
4. The new alert is pushed to the dashboard's top alert banner in real time for the assigned Nurse and Resident, and appears in their notification list.
5. Alerts remain visible and actionable (dismissible only after being explicitly reviewed) until a Resident or Specialist reviews them.

**Outputs:** A real-time, severity-tagged alert with an audit trail of when it was raised and when/by whom it was reviewed.

**Postconditions:** No alert is ever silently auto-dismissed; every alert has a terminal state of either "reviewed" or "still open," visible to all authorized viewers of that admission.

**Exception Handling:**
- Sensor/entry noise causing a single transient out-of-range reading → the agent requires the pattern to hold across more than one consecutive reading before raising an alert, to reduce false positives (exact debounce window to be finalized in design).
- Duplicate pattern detected while a matching alert is already open and unreviewed → the existing alert is updated/escalated rather than a duplicate being created.

---

### FR-3.4 Clinical Reasoning Explanations

**Priority:** High
**Actors:** Resident, Specialist

**System Behavior:**
1. Whenever FR-3.2 or FR-3.3 produces a conclusion, the system generates an accompanying "Clinical Reasoning & Differential" panel.
2. The panel states, explicitly: (a) the exact triggering metrics and their values/trend (e.g., "MAP dropped from 78 to 58 mmHg while urine output fell below 15 mL/hr over 2 hours"), (b) the primary differential hypotheses (e.g., "consider early septic shock or hypovolemic deficit"), and (c) recommended next diagnostic steps (e.g., "suggest checking arterial blood gas and serum lactate").
3. The panel is reachable without any hover interaction — it expands on click/tap and remains open until explicitly closed.

**Outputs:** A structured, always-visible-on-demand rationale attached to every AI conclusion.

**Postconditions:** No AI alert or summary exists in the system without an attached reasoning explanation — the two are always created together, never separately.

**Exception Handling:**
- The underlying LLM call for the reasoning explanation fails while the alert/summary itself succeeded → the alert is still shown (safety-critical), with the reasoning panel showing "detailed reasoning temporarily unavailable" rather than blocking the alert entirely.

# 4. External Interface Requirements

## 4.1 User Interfaces

- Responsive web interface supporting desktop workstations and touch-first bedside tablets.
- Minimum touch target size of 48×48px for vitals entry and AI trigger controls.
- No critical information may be hidden behind hover-only interactions.
- Strict WCAG AA contrast compliance (≥4.5:1 body text, ≥3:1 large bold metrics ≥18px).

## 4.2 Hardware Interfaces

- No direct medical device integration in this MVP; all data is entered manually or via document upload.

## 4.3 Software Interfaces

- PostgreSQL database accessed via Prisma or Drizzle ORM.
- n8n workflow engine, communicating with the backend via webhooks.
- External LLM APIs (Gemini Pro / GPT-4o) accessed over HTTPS by n8n.

## 4.4 Communication Interfaces

- All client-server traffic encrypted via TLS/HTTPS.
- REST API over HTTP(S) between frontend and backend.
- Webhook-based communication between backend and n8n.

---

# 5. Non-Functional Requirements

## 5.1 Performance

| Metric | Target |
|---|---|
| Frontend input validation feedback | < 50ms |
| Dashboard first contentful paint | < 500ms |
| CRUD endpoint latency (95th percentile) | < 150ms |
| RAG query end-to-end | < 3 seconds |
| AI 24-hour summarization | < 5 seconds |

## 5.2 Security

- No API keys, JWT secrets, or unblinded patient data may appear in client-side bundles or browser storage.
- All protected routes must pass through authentication and role-verification middleware.
- Unauthorized access attempts must be logged to the audit trail.

## 5.3 Reliability & Availability

- Target uptime of 99.9% during clinical shift hours.
- If the AI orchestration layer (n8n/LLM) is unreachable or exceeds a 6-second timeout, the system shall degrade gracefully: raw historical data remains fully available, with a clear non-disruptive status banner indicating AI features are temporarily offline.

## 5.4 Usability & Accessibility

- Full keyboard navigability (Tab, Shift+Tab, Enter, Space) with visible focus indicators across all modals and forms.
- Support for `prefers-reduced-motion`, disabling sparkline and alert animations in favor of static indicators.
- Interface must remain legible under both bright fluorescent lighting and dimmed night-shift conditions.

## 5.5 Compliance

- Full audit traceability of all clinical data actions, suitable for legal and clinical review.
- No physical deletion of clinical records under any circumstance.

---

# 6. Data Requirements

- All primary identifiers shall use UUIDs.
- The database shall be normalized to Third Normal Form (3NF).
- Every clinical entity (vitals, labs, notes, medications, alerts, AI summaries) shall be scoped to a specific admission, not directly to a patient, to correctly support multiple admissions per patient over time.
- Document uploads shall be chunked and embedded for retrieval; embeddings shall be stored alongside a reference to their source document.

---

# 7. Use Case Summary

| ID | Use Case | Primary Actor |
|---|---|---|
| UC-1 | Manage user accounts and roles | System Admin |
| UC-2 | Admit patient and assign bed | Nurse / Resident / Specialist |
| UC-3 | Record vital signs, fluid I/O, GCS | Nurse |
| UC-4 | Upload lab/radiology documents | Nurse / Resident / Specialist |
| UC-5 | Write comprehensive medical history | Resident / Specialist |
| UC-6 | Query RAG assistant | Resident / Specialist |
| UC-7 | Trigger instant AI summary | Resident / Specialist |
| UC-8 | Review AI-generated alert and reasoning | Resident / Specialist |
| UC-9 | Approve treatment plan / discharge | Specialist |
| UC-10 | Archive (soft-delete) a record | Nurse / Resident / Specialist |

---

# 8. Access Control Matrix

| Feature / Action | System Admin | ICU Nurse | Medical Resident | ICU Specialist |
|---|:---:|:---:|:---:|:---:|
| Manage users & role assignments | Yes | No | No | No |
| Create patient profile (admission) | No | Yes | Yes | Yes |
| Input vitals, fluid I/O, GCS | No | Yes | Yes | Yes |
| Upload lab/radiology documents | No | Yes | Yes | Yes |
| Write comprehensive medical history | No | No | Yes | Yes |
| View unified patient dashboard | No | Yes | Yes | Yes |
| Query RAG assistant | No | No | Yes | Yes |
| Trigger instant AI summary | No | No | Yes | Yes |
| Approve treatment / discharge | No | No | No | Yes |
