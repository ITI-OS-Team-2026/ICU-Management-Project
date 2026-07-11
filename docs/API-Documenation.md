# SmartCare ICU — API Documentation

**Format:** Swagger/OpenAPI-style reference, written in Markdown for direct readability during implementation.
**Base URL:** `/api`
**Auth:** All endpoints except `POST /auth/login` require a valid session (`HttpOnly` JWT cookie). Every endpoint below lists which role(s) may call it — enforced by `verifyToken` + `requireRole([...])` middleware in that order.
**Conventions:** All IDs are UUIDs. All timestamps are server-generated, ISO 8601, UTC. All list endpoints exclude archived records by default (`is_archived = false`) unless `?include_archived=true` is explicitly passed by an authorized role.

---

# Table of Contents

1. Authentication & Security
2. Admin — Users & Beds
3. Patients & Allergies
4. Admissions & Nurse Assignment
5. Diagnoses
6. Vital Signs
7. Fluid Records
8. Medications & Administrations
9. Lab Results
10. Clinical & Nursing Notes
11. Medical Documents
12. AI Services (Summaries & RAG Query)
13. Alerts & Alert Reviews
14. Notifications
15. Treatment Approvals
16. Audit Logs (Admin, Read-Only)
17. Summary

---

# 1. Authentication & Security

## `POST /auth/login`
- **Tags:** Auth
- **Auth:** None (public)
- **Description:** Authenticates a user and issues a session cookie.
- **Request Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | |
| `password` | string | yes | |

- **Responses:**
  - `200 OK` — sets `HttpOnly`, `Secure`, `SameSite=Strict` cookie, 12h expiry. Body: `{ id, first_name, last_name, role }`
  - `401 Unauthorized` — generic "invalid credentials" (never reveals whether the email exists)
  - `423 Locked` — account temporarily locked after 5 failed attempts in 15 minutes
- **Related:** SRS FR-1.1

## `POST /auth/logout`
- **Tags:** Auth
- **Auth:** Any authenticated role
- **Description:** Invalidates the current session. Sets the matching `refresh_tokens.is_revoked = true` and clears the cookie.
- **Responses:** `204 No Content`

## `GET /auth/me`
- **Tags:** Auth
- **Auth:** Any authenticated role
- **Description:** Returns the current session's user profile, used by the frontend to populate role-based UI state.
- **Responses:** `200 OK` — `{ id, first_name, last_name, email, role }` · `401 Unauthorized`

## `GET /admin/audit-logs` *(see Section 16)*

---

# 2. Admin — Users & Beds

## `POST /admin/users`
- **Tags:** Admin
- **Auth:** Admin only
- **Description:** Provisions a new staff account with a temporary password.
- **Request Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `first_name` | string | yes | |
| `last_name` | string | yes | |
| `email` | string | yes | must be unique |
| `role` | enum | yes | `nurse`, `resident`, `specialist`, `admin` |

- **Responses:** `201 Created` · `409 Conflict` (email exists) · `403 Forbidden`
- **Related:** SRS Section 3 (System Admin)

## `GET /admin/users`
- **Tags:** Admin
- **Auth:** Admin only
- **Query Params:** `role`, `status`, `page`, `limit`
- **Responses:** `200 OK` — paginated list

## `GET /admin/users/:id`
- **Tags:** Admin
- **Auth:** Admin only
- **Responses:** `200 OK` · `404 Not Found`

## `PATCH /admin/users/:id`
- **Tags:** Admin
- **Auth:** Admin only
- **Description:** Updates role or status (e.g., temporarily promoting a Resident, deactivating a departed staff member).
- **Request Body:** any of `role`, `status`
- **Responses:** `200 OK` · `404 Not Found`
- **Note:** Recorded in `audit_logs` as `UPDATE_USER_ROLE` when `role` changes.

## `DELETE /admin/users/:id`
- **Tags:** Admin
- **Auth:** Admin only
- **Description:** Soft-deletes (deactivates) a user account. Does not physically remove the row.
- **Responses:** `204 No Content` · `409 Conflict` (already archived)

## `POST /admin/beds`
- **Tags:** Admin
- **Auth:** Admin only
- **Request Body:** `{ bed_number }` — `status` defaults to `available`
- **Responses:** `201 Created` · `409 Conflict` (bed_number exists)

## `GET /admin/beds`
- **Tags:** Admin
- **Auth:** Admin, Nurse, Resident, Specialist (read-only for clinical roles — used by the quick-switcher)
- **Query Params:** `status`
- **Responses:** `200 OK`

## `PATCH /admin/beds/:id`
- **Tags:** Admin
- **Auth:** Admin only (manual override; status also changes automatically on admission/discharge)
- **Request Body:** `{ status }` — `available` / `occupied` / `maintenance`
- **Responses:** `200 OK` · `404 Not Found`

---

# 3. Patients & Allergies

## `POST /patients`
- **Tags:** Patients
- **Auth:** Nurse, Resident, Specialist
- **Description:** Creates a patient profile. If the MRN already exists, no duplicate patient is created — use `POST /admissions` to create a new admission for an existing patient instead.
- **Request Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `mrn` | string | yes | must be unique |
| `first_name` | string | yes | |
| `last_name` | string | yes | |
| `date_of_birth` | date | yes | |
| `gender` | string | no | |
| `weight` | decimal | no | |
| `height` | decimal | no | |
| `blood_type` | string | no | |

- **Responses:** `201 Created` · `409 Conflict` (MRN exists — client should call `GET /patients?mrn=` instead)
- **Related:** SRS FR-1.4, System Flows 4.1

## `GET /patients`
- **Tags:** Patients
- **Auth:** Nurse, Resident, Specialist
- **Query Params:** `mrn`, `name`
- **Responses:** `200 OK`

## `GET /patients/:id`
- **Tags:** Patients
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK` · `404 Not Found`

## `DELETE /patients/:id`
- **Tags:** Patients
- **Auth:** Specialist only
- **Description:** Soft-deletes a patient record (rare — e.g., duplicate entry).
- **Responses:** `204 No Content` · `409 Conflict`

## `POST /patients/:id/allergies`
- **Tags:** Patients
- **Auth:** Nurse, Resident, Specialist
- **Request Body:** `{ allergen, severity }`
- **Responses:** `201 Created`

## `GET /patients/:id/allergies`
- **Tags:** Patients
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK` — used to populate the sticky context bar's allergy pills
- **Related:** System Flows 4.6 / SRS FR-2.2

## `DELETE /allergies/:id`
- **Tags:** Patients
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

---

# 4. Admissions & Nurse Assignment

## `POST /admissions`
- **Tags:** Admissions
- **Auth:** Nurse, Resident, Specialist
- **Description:** Creates a new admission for an existing patient (looked up by `patient_id`) and assigns a bed and attending specialist.
- **Request Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `patient_id` | uuid | yes | |
| `bed_id` | uuid | yes | must currently be `available` |
| `doctor_id` | uuid | yes | attending specialist |
| `admission_reason` | jsonb | no | structured admission context |

- **Responses:** `201 Created` — also sets `beds.status = occupied` · `409 Conflict` (bed already has an active admission)
- **Related:** SRS FR-1.4, System Flows 4.1, ERD unique constraint `uq_bed_single_active_admission`

## `GET /admissions`
- **Tags:** Admissions
- **Auth:** Nurse, Resident, Specialist
- **Description:** Census view — active admissions, used by the quick-switcher.
- **Query Params:** `status`, `bed_id`
- **Responses:** `200 OK`

## `GET /admissions/:id`
- **Tags:** Admissions
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK` · `404 Not Found`

## `PATCH /admissions/:id/discharge`
- **Tags:** Admissions
- **Auth:** Specialist only
- **Description:** Sets `status = discharged`, `discharged_at = now()`, frees the bed, generates the final ICU report.
- **Responses:** `200 OK` · `409 Conflict` (already discharged)
- **Related:** System Flows 6.3

## `DELETE /admissions/:id`
- **Tags:** Admissions
- **Auth:** Specialist only
- **Description:** Soft-deletes an admission (e.g., duplicate entry).
- **Responses:** `204 No Content` · `409 Conflict`

## `POST /admissions/:id/nurses`
- **Tags:** Admissions
- **Auth:** Nurse (self-assignment), Specialist (reassignment)
- **Description:** Assigns a nurse to the admission. Recommended: enforce one active primary nurse at a time (see open design item below).
- **Request Body:** `{ nurse_id }`
- **Responses:** `201 Created`
- **Open design item:** current schema allows multiple simultaneous rows with no "primary" flag — recommend adding `is_primary` + `unassigned_at` and a partial unique index before implementing, per the earlier design discussion, to prevent silent double-assignment.

## `GET /admissions/:id/nurses`
- **Tags:** Admissions
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK` — current and historical nurse assignments

## `DELETE /admissions/:id/nurses/:nurseId`
- **Tags:** Admissions
- **Auth:** Nurse (self), Specialist
- **Description:** Ends a nurse's assignment (handover).
- **Responses:** `204 No Content`

---

# 5. Diagnoses

## `POST /admissions/:id/diagnoses`
- **Tags:** Clinical
- **Auth:** Resident, Specialist
- **Request Body:** `{ description }`
- **Responses:** `201 Created` — `diagnosed_by` set from session, `diagnosed_at` server-generated

## `GET /admissions/:id/diagnoses`
- **Tags:** Clinical
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK`

## `DELETE /diagnoses/:id`
- **Tags:** Clinical
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

---

# 6. Vital Signs

## `POST /admissions/:id/vitals`
- **Tags:** Clinical Recording
- **Auth:** Nurse, Resident, Specialist
- **Description:** Logs a vitals/GCS entry. Boundary-validated both client and server side.
- **Request Body:**

| Field | Type | Required | Range |
|---|---|---|---|
| `heart_rate` | integer | no | 20–300 |
| `systolic_bp` | integer | no | |
| `diastolic_bp` | integer | no | |
| `map_mmhg` | integer | no | 20–200 |
| `respiratory_rate` | integer | no | |
| `spo2` | integer | no | 50–100 |
| `temperature` | decimal | no | 30.0–45.0 |
| `gcs_total` | integer | no | 3–15 |
| `is_override` | boolean | no | requires `override_reason` if true |
| `override_reason` | string | conditional | required if `is_override = true` |

- **Responses:** `201 Created` · `400 Bad Request` (out of range and not overridden, or override without reason) · `409 Conflict` (admission not active)
- **Related:** SRS FR-1.2, System Flows 4.2

## `GET /admissions/:id/vitals`
- **Tags:** Clinical Recording
- **Auth:** Nurse, Resident, Specialist
- **Query Params:** `from`, `to`, `limit` — used for sparkline trend rendering (last 12–24h)
- **Responses:** `200 OK`

## `DELETE /vitals/:id`
- **Tags:** Clinical Recording
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

---

# 7. Fluid Records

## `POST /admissions/:id/fluids`
- **Tags:** Clinical Recording
- **Auth:** Nurse, Resident, Specialist
- **Request Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `direction` | enum | yes | `in` / `out` |
| `type` | string | yes | e.g. IV infusion, enteral feed, urine, drain |
| `volume_ml` | integer | yes | must be ≥ 0 |

- **Responses:** `201 Created`
- **Related:** SRS FR-1.4, System Flows 4.3

## `GET /admissions/:id/fluids`
- **Tags:** Clinical Recording
- **Auth:** Nurse, Resident, Specialist
- **Query Params:** `from`, `to`
- **Responses:** `200 OK`

## `DELETE /fluids/:id`
- **Tags:** Clinical Recording
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

---

# 8. Medications & Administrations

## `POST /admissions/:id/medications`
- **Tags:** Medications
- **Auth:** Resident, Specialist
- **Description:** Creates a medication order. `prescribed_by` set from session.
- **Request Body:** `{ drug_name, dosage, frequency }`
- **Responses:** `201 Created`

## `GET /admissions/:id/medications`
- **Tags:** Medications
- **Auth:** Nurse, Resident, Specialist
- **Query Params:** `is_active`
- **Responses:** `200 OK`

## `PATCH /medications/:id`
- **Tags:** Medications
- **Auth:** Resident, Specialist
- **Description:** Marks an order inactive (discontinued).
- **Request Body:** `{ is_active: false }`
- **Responses:** `200 OK`

## `DELETE /medications/:id`
- **Tags:** Medications
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

## `POST /medications/:id/administrations`
- **Tags:** Medications
- **Auth:** Nurse only
- **Description:** Logs an actual dose given against an existing order.
- **Request Body:** `{ administered_dose }`
- **Responses:** `201 Created` — `administered_by` from session, `administered_at` server-generated
- **Related:** earlier design discussion — this is the medication administration record (MAR)

## `GET /medications/:id/administrations`
- **Tags:** Medications
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK` — full dose history for one order

## `DELETE /medication-administrations/:id`
- **Tags:** Medications
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

---

# 9. Lab Results

## `POST /admissions/:id/labs`
- **Tags:** Clinical Recording
- **Auth:** Nurse, Resident, Specialist
- **Request Body:** `{ test_name, result_value, abnormal }`
- **Responses:** `201 Created`

## `GET /admissions/:id/labs`
- **Tags:** Clinical Recording
- **Auth:** Nurse, Resident, Specialist
- **Query Params:** `from`, `to`, `abnormal`
- **Responses:** `200 OK`

## `DELETE /labs/:id`
- **Tags:** Clinical Recording
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

---

# 10. Clinical & Nursing Notes

## `POST /admissions/:id/notes/clinical`
- **Tags:** Notes
- **Auth:** Resident, Specialist
- **Request Body:** `{ assessment, plan }`
- **Responses:** `201 Created` — `author_id` from session

## `GET /admissions/:id/notes/clinical`
- **Tags:** Notes
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK`

## `POST /admissions/:id/notes/nursing`
- **Tags:** Notes
- **Auth:** Nurse only
- **Request Body:** `{ note }`
- **Responses:** `201 Created` — `author_id` from session
- **Note:** the ERD's `author_id` field on `nursing_notes` currently has no drawn relationship line to `users` — confirm this before implementation; it should reference `users.id` exactly like `clinical_notes.author_id` does.

## `GET /admissions/:id/notes/nursing`
- **Tags:** Notes
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK`

## `DELETE /notes/clinical/:id` · `DELETE /notes/nursing/:id`
- **Tags:** Notes
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

---

# 11. Medical Documents

## `POST /admissions/:id/documents`
- **Tags:** Documents
- **Auth:** Nurse, Resident, Specialist
- **Description:** Multipart upload. Streamed, not buffered fully in memory. Triggers an async embedding job on success.
- **Request Body (multipart):** `file`, `document_type`
- **Responses:** `201 Created` (`embedding_status: pending`) · `413 Payload Too Large` · `415 Unsupported Media Type`
- **Related:** SRS FR-1.4, System Flows 4.4

## `GET /admissions/:id/documents`
- **Tags:** Documents
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK`

## `GET /documents/:id/download`
- **Tags:** Documents
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK` (file stream) · `404 Not Found`

## `DELETE /documents/:id`
- **Tags:** Documents
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

*(Note: `document_embeddings` has no direct API — it is written only by the AI orchestration layer's async embedding job, never by a client request.)*

---

# 12. AI Services (Summaries & RAG Query)

## `POST /ai/summary`
- **Tags:** AI
- **Auth:** Resident, Specialist
- **Description:** Triggers a 24-hour synthesis for an admission. Completes within 5 seconds under normal conditions.
- **Request Body:** `{ admission_id, summary_type }`
- **Responses:** `201 Created` — `{ id, overall_summary, generated_at }` · `503 Service Unavailable` (AI layer timeout — core system unaffected)
- **Related:** SRS FR-3.2, System Flows 5.3

## `GET /admissions/:id/summaries`
- **Tags:** AI
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK` — summary history for this admission

## `POST /ai/query`
- **Tags:** AI
- **Auth:** Resident, Specialist
- **Description:** Natural-language RAG query, scoped strictly to the given `admission_id`. Optionally includes recent `ai_query_logs` history for the same admission as conversation context.
- **Request Body:** `{ admission_id, question, include_history: boolean }`
- **Responses:** `200 OK` — `{ id, ai_response, cited_sources }` · `503 Service Unavailable`
- **Related:** SRS FR-3.1, System Flows 5.2

## `GET /admissions/:id/ai-query-logs`
- **Tags:** AI
- **Auth:** Resident, Specialist
- **Query Params:** `limit` (for conversation-history context window)
- **Responses:** `200 OK` — full question/answer/citation history for this admission

---

# 13. Alerts & Alert Reviews

## `GET /admissions/:id/alerts`
- **Tags:** Alerts
- **Auth:** Nurse, Resident, Specialist
- **Query Params:** `status`
- **Responses:** `200 OK`

## `GET /alerts`
- **Tags:** Alerts
- **Auth:** Nurse, Resident, Specialist
- **Description:** Cross-patient alert feed for the dashboard banner (assigned patients only).
- **Query Params:** `status`, `severity`
- **Responses:** `200 OK`
- **Note:** alerts themselves are only ever created by the monitoring agent (system-internal), never via a client-facing `POST` endpoint.

## `POST /alerts/:id/reviews`
- **Tags:** Alerts
- **Auth:** Resident, Specialist
- **Description:** Records a review of an alert. Separate table from `alerts.status` — confirm whether `alerts.status` should also flip to `reviewed` automatically when a review row is created, or remain independently managed.
- **Request Body:** `{ review_notes, accepted }`
- **Responses:** `201 Created` — `reviewer_id` from session, `reviewed_at` server-generated
- **Related:** SRS FR-3.3/3.4, System Flows 5.4

## `GET /alerts/:id/reviews`
- **Tags:** Alerts
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK`

---

# 14. Notifications

## `GET /notifications`
- **Tags:** Notifications
- **Auth:** Any authenticated role
- **Description:** Returns the current user's notification inbox.
- **Query Params:** `is_read`
- **Responses:** `200 OK`
- **Note:** the current schema's `notifications` table has no `alert_id` link back to the triggering alert — recommend adding it back so a notification can deep-link to its source alert.

## `PATCH /notifications/:id/read`
- **Tags:** Notifications
- **Auth:** Any authenticated role (own notifications only)
- **Responses:** `200 OK`

---

# 15. Treatment Approvals

## `POST /admissions/:id/treatment-approvals`
- **Tags:** Treatment
- **Auth:** Resident, Specialist (request); only a Specialist's approval is authoritative
- **Request Body:** `{ treatment_name, clinical_justification }`
- **Responses:** `201 Created` — `approval_status: null` until decided

## `PATCH /treatment-approvals/:id`
- **Tags:** Treatment
- **Auth:** Specialist only
- **Request Body:** `{ approval_status: boolean }`
- **Responses:** `200 OK` — sets `approved_by`, `approved_at`
- **Related:** System Flows 6.2

## `GET /admissions/:id/treatment-approvals`
- **Tags:** Treatment
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK`

---

# 16. Audit Logs (Admin, Read-Only)

## `GET /admin/audit-logs`
- **Tags:** Admin
- **Auth:** Admin only
- **Description:** Read-only, explicitly excludes clinical field values — shows *that* an action occurred and *by whom*, never the clinical content itself (enforces the Admin's "no clinical data" boundary at the API layer).
- **Query Params:** `user_id`, `action`, `target_table`, `from`, `to`, `page`, `limit`
- **Responses:** `200 OK`
- **Related:** SRS Section 3.3, System Flows 3.3

---

# Appendix: Open Items Found During This Pass

These surfaced while mapping the ERD to endpoints — worth resolving before implementation, not silently assumed:

1. **`nursing_notes.author_id`** has no drawn FK relationship in the current ERD, unlike `clinical_notes.author_id`. Almost certainly an oversight — should reference `users.id`.
2. **`notifications` lost its `alert_id` column** in this ERD version (present in an earlier draft). Without it, a notification can't deep-link to the alert that triggered it.
3. **`admissions` lost `code_status`** (Full Code / DNR-DNI) in this version — this was called out as a safety-critical sticky-header field in the Proposal/SRS. Confirm whether this was an intentional simplification or should be restored.
4. **Nurse assignment has no "one primary nurse" guarantee** — `admission_nurses` allows multiple simultaneous rows with no flag distinguishing current vs. historical assignment, as discussed earlier.
5. **`alerts.status` vs `alert_reviews`** — two possible sources of truth for "has this alert been handled." Recommend deciding whether creating an `alert_reviews` row should automatically update `alerts.status`, or whether they're deliberately independent.

---

# Endpoint Summary

| Module | Method | Path | Allowed Roles |
|---|---|---|---|
| Auth | POST | `/auth/login` | None (public) |
| Auth | POST | `/auth/logout` | Any authenticated |
| Auth | GET | `/auth/me` | Any authenticated |
| Admin | POST | `/admin/users` | Admin |
| Admin | GET | `/admin/users` | Admin |
| Admin | GET | `/admin/users/:id` | Admin |
| Admin | PATCH | `/admin/users/:id` | Admin |
| Admin | DELETE | `/admin/users/:id` | Admin |
| Admin | POST | `/admin/beds` | Admin |
| Admin | GET | `/admin/beds` | Admin, Nurse, Resident, Specialist |
| Admin | PATCH | `/admin/beds/:id` | Admin |
| Patients | POST | `/patients` | Nurse, Resident, Specialist |
| Patients | GET | `/patients` | Nurse, Resident, Specialist |
| Patients | GET | `/patients/:id` | Nurse, Resident, Specialist |
| Patients | DELETE | `/patients/:id` | Specialist |
| Patients | POST | `/patients/:id/allergies` | Nurse, Resident, Specialist |
| Patients | GET | `/patients/:id/allergies` | Nurse, Resident, Specialist |
| Patients | DELETE | `/allergies/:id` | Resident, Specialist |
| Admissions | POST | `/admissions` | Nurse, Resident, Specialist |
| Admissions | GET | `/admissions` | Nurse, Resident, Specialist |
| Admissions | GET | `/admissions/:id` | Nurse, Resident, Specialist |
| Admissions | PATCH | `/admissions/:id/discharge` | Specialist |
| Admissions | DELETE | `/admissions/:id` | Specialist |
| Admissions | POST | `/admissions/:id/nurses` | Nurse, Specialist |
| Admissions | GET | `/admissions/:id/nurses` | Nurse, Resident, Specialist |
| Admissions | DELETE | `/admissions/:id/nurses/:nurseId` | Nurse, Specialist |
| Diagnoses | POST | `/admissions/:id/diagnoses` | Resident, Specialist |
| Diagnoses | GET | `/admissions/:id/diagnoses` | Nurse, Resident, Specialist |
| Diagnoses | DELETE | `/diagnoses/:id` | Resident, Specialist |
| Vitals | POST | `/admissions/:id/vitals` | Nurse, Resident, Specialist |
| Vitals | GET | `/admissions/:id/vitals` | Nurse, Resident, Specialist |
| Vitals | DELETE | `/vitals/:id` | Resident, Specialist |
| Fluids | POST | `/admissions/:id/fluids` | Nurse, Resident, Specialist |
| Fluids | GET | `/admissions/:id/fluids` | Nurse, Resident, Specialist |
| Fluids | DELETE | `/fluids/:id` | Resident, Specialist |
| Medications | POST | `/admissions/:id/medications` | Resident, Specialist |
| Medications | GET | `/admissions/:id/medications` | Nurse, Resident, Specialist |
| Medications | PATCH | `/medications/:id` | Resident, Specialist |
| Medications | DELETE | `/medications/:id` | Resident, Specialist |
| Medications | POST | `/medications/:id/administrations` | Nurse |
| Medications | GET | `/medications/:id/administrations` | Nurse, Resident, Specialist |
| Medications | DELETE | `/medication-administrations/:id` | Resident, Specialist |
| Labs | POST | `/admissions/:id/labs` | Nurse, Resident, Specialist |
| Labs | GET | `/admissions/:id/labs` | Nurse, Resident, Specialist |
| Labs | DELETE | `/labs/:id` | Resident, Specialist |
| Notes | POST | `/admissions/:id/notes/clinical` | Resident, Specialist |
| Notes | GET | `/admissions/:id/notes/clinical` | Nurse, Resident, Specialist |
| Notes | POST | `/admissions/:id/notes/nursing` | Nurse |
| Notes | GET | `/admissions/:id/notes/nursing` | Nurse, Resident, Specialist |
| Notes | DELETE | `/notes/clinical/:id` | Resident, Specialist |
| Notes | DELETE | `/notes/nursing/:id` | Resident, Specialist |
| Documents | POST | `/admissions/:id/documents` | Nurse, Resident, Specialist |
| Documents | GET | `/admissions/:id/documents` | Nurse, Resident, Specialist |
| Documents | GET | `/documents/:id/download` | Nurse, Resident, Specialist |
| Documents | DELETE | `/documents/:id` | Resident, Specialist |
| AI | POST | `/ai/summary` | Resident, Specialist |
| AI | GET | `/admissions/:id/summaries` | Nurse, Resident, Specialist |
| AI | POST | `/ai/query` | Resident, Specialist |
| AI | GET | `/admissions/:id/ai-query-logs` | Resident, Specialist |
| Alerts | GET | `/admissions/:id/alerts` | Nurse, Resident, Specialist |
| Alerts | GET | `/alerts` | Nurse, Resident, Specialist |
| Alerts | POST | `/alerts/:id/reviews` | Resident, Specialist |
| Alerts | GET | `/alerts/:id/reviews` | Nurse, Resident, Specialist |
| Notifications | GET | `/notifications` | Any authenticated |
| Notifications | PATCH | `/notifications/:id/read` | Any authenticated |
| Treatment | POST | `/admissions/:id/treatment-approvals` | Resident, Specialist |
| Treatment | PATCH | `/treatment-approvals/:id` | Specialist |
| Treatment | GET | `/admissions/:id/treatment-approvals` | Nurse, Resident, Specialist |
| Audit | GET | `/admin/audit-logs` | Admin |

**Total: 64 endpoints across 16 modules.**
