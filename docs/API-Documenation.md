# SmartCare ICU — API Documentation

**Format:** Swagger/OpenAPI-style reference, written in Markdown for direct readability during implementation.
**Version:** 2.0 — Aligned to updated ERD
**Base URL:** `/api`
**Auth:** All endpoints except `POST /auth/login` require a valid session (`HttpOnly` JWT cookie). Every endpoint lists which role(s) may call it — enforced by `verifyToken` + `requireRole([...])`.
**Conventions:** All IDs are UUIDs. All timestamps are server-generated, ISO 8601, UTC. List endpoints exclude archived records by default (`is_archived = false`) unless `?include_archived=true` is passed by an authorized role.

---

# Table of Contents

1. Authentication & Security
2. Admin — Users & Beds
3. Patients, Allergies & Medical History
4. Admissions & Nurse Assignment
5. Diagnoses
6. Vital Signs
7. Medications & Administrations
8. Investigation Orders
9. Lab Results
10. Clinical Examinations
11. Clinical & Nursing Notes
12. Follow-ups (SOAP)
13. Medical Documents
14. AI Services (Summaries & RAG Query)
15. Alerts & Alert Reviews
16. Notifications
17. Treatment Approvals
18. Audit Logs (Admin, Read-Only)
19. Endpoint Summary

---

# 1. Authentication & Security

## `POST /auth/login`
- **Auth:** None (public)
- **Request Body:** `email`, `password`
- **Responses:**
  - `200 OK` — sets `HttpOnly`, `Secure`, `SameSite=Strict` cookie (12h). Body: `{ id, first_name, last_name, role }`
  - `401 Unauthorized` — generic invalid credentials
  - `423 Locked` — after 5 failed attempts in 15 minutes
- **Related:** SRS FR-1.1

## `POST /auth/logout`
- **Auth:** Any authenticated role
- **Description:** Sets matching `refresh_tokens.is_revoked = true` and clears the cookie.
- **Responses:** `204 No Content`

## `GET /auth/me`
- **Auth:** Any authenticated role
- **Responses:** `200 OK` — `{ id, first_name, last_name, email, role }` · `401 Unauthorized`

---

# 2. Admin — Users & Beds

## `POST /admin/users`
- **Auth:** Admin only
- **Request Body:** `first_name`, `last_name`, `email`, `role` (`nurse` | `resident` | `specialist` | `admin`)
- **Responses:** `201 Created` · `409 Conflict` (email exists)

## `GET /admin/users`
- **Auth:** Admin only
- **Query:** `role`, `status`, `page`, `limit`

## `GET /admin/users/:id`
- **Auth:** Admin only

## `PATCH /admin/users/:id`
- **Auth:** Admin only
- **Request Body:** any of `role`, `status`
- **Note:** Role changes audited as `UPDATE_USER_ROLE`

## `DELETE /admin/users/:id`
- **Auth:** Admin only
- **Description:** Deactivates account (status change / soft deactivate).
- **Responses:** `204 No Content`

## `POST /admin/beds`
- **Auth:** Admin only
- **Request Body:** `{ bed_number }` — `status` defaults to `available`
- **Responses:** `201 Created` · `409 Conflict`

## `GET /admin/beds`
- **Auth:** Admin, Nurse, Resident, Specialist
- **Query:** `status`

## `PATCH /admin/beds/:id`
- **Auth:** Admin only
- **Request Body:** `{ status }` — `available` / `occupied` / `maintenance`

---

# 3. Patients, Allergies & Medical History

## `POST /patients`
- **Auth:** Nurse, Resident, Specialist
- **Description:** Creates a patient profile. If MRN exists, do not duplicate — create a new admission instead.
- **Request Body:**

| Field | Type | Required |
|---|---|---|
| `mrn` | string | yes |
| `national_id` | string | no |
| `name` | string | yes |
| `age` | integer | yes |
| `gender` | string | no |
| `residence` | string | no |
| `occupation` | string | no |
| `marital_status` | enum | no |
| `handedness` | enum | no |

- **Responses:** `201 Created` · `409 Conflict` (MRN exists)
- **Related:** SRS FR-1.4

## `GET /patients`
- **Auth:** Nurse, Resident, Specialist
- **Query:** `mrn`, `name`

## `GET /patients/:id`
- **Auth:** Nurse, Resident, Specialist

## `DELETE /patients/:id`
- **Auth:** Specialist only
- **Description:** Soft-archives patient.
- **Responses:** `204 No Content`

## `POST /patients/:id/allergies`
- **Auth:** Nurse, Resident, Specialist
- **Request Body:** `{ allergen, severity }`
- **Responses:** `201 Created`

## `GET /patients/:id/allergies`
- **Auth:** Nurse, Resident, Specialist
- **Related:** sticky context allergy pills (FR-2.2)

## `DELETE /allergies/:id`
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content` (soft archive)

## `POST /patients/:id/medical-history`
- **Auth:** Resident, Specialist
- **Description:** Creates structured medical history for the patient (`medical_histories`).
- **Request Body:**

| Field | Type | Notes |
|---|---|---|
| `diabetes_dm` | boolean | |
| `hypertension_htn` | boolean | |
| `past_similar_conditions` | string | |
| `past_diseases` | object/array | JSONB |
| `previous_operations` | boolean | |
| `operations_details` | string | |
| `has_allergies` | boolean | |
| `traveled_abroad` | boolean | |
| `consanguinity` | boolean | |
| `family_similar_conditions` | string | |
| `inherited_diseases` | object/array | JSONB |

- **Responses:** `201 Created` · `409 Conflict` if a history row already exists (prefer PATCH)

## `GET /patients/:id/medical-history`
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK` · `404 Not Found`

## `PATCH /patients/:id/medical-history`
- **Auth:** Resident, Specialist
- **Request Body:** any subset of medical-history fields
- **Responses:** `200 OK`

---

# 4. Admissions & Nurse Assignment

## `POST /admissions`
- **Auth:** Nurse, Resident, Specialist
- **Request Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `patient_id` | uuid | yes | |
| `bed_id` | uuid | yes | must be `available` |
| `doctor_id` | uuid | yes | attending specialist |
| `admission_reason` | string | no | |
| `place_of_transfer` | string | no | |
| `transfer_doctor_name` | string | no | |
| `chief_complaint` | string | no | |
| `symptoms_related_system` | string | no | |
| `symptoms_other_systems` | string | no | |
| `previous_investigations` | string | no | |
| `previous_treatments` | string | no | |
| `provisional_diagnosis` | string | no | |

- **Responses:** `201 Created` — sets `beds.status = occupied` · `409 Conflict` (bed already ACTIVE)
- **Related:** unique partial index one ACTIVE admission per bed

## `GET /admissions`
- **Auth:** Nurse, Resident, Specialist
- **Query:** `status`, `bed_id`

## `GET /admissions/:id`
- **Auth:** Nurse, Resident, Specialist

## `PATCH /admissions/:id/discharge`
- **Auth:** Specialist only
- **Description:** `status = discharged`, `discharged_at = now()`, frees bed.
- **Responses:** `200 OK` · `409 Conflict`

## `DELETE /admissions/:id`
- **Auth:** Specialist only
- **Description:** Soft-archives admission.
- **Responses:** `204 No Content`

## `POST /admissions/:id/nurses`
- **Auth:** Nurse (self), Specialist
- **Request Body:** `{ nurse_id }`
- **Description:** Assigns a nurse. Multiple assignments are allowed; set `unassigned_at` on handover via DELETE.
- **Responses:** `201 Created`

## `GET /admissions/:id/nurses`
- **Auth:** Nurse, Resident, Specialist
- **Responses:** `200 OK` — current and historical assignments

## `DELETE /admissions/:id/nurses/:nurseId`
- **Auth:** Nurse (self), Specialist
- **Description:** Ends assignment (`unassigned_at = now()`).
- **Responses:** `204 No Content`

---

# 5. Diagnoses

## `POST /admissions/:id/diagnoses`
- **Auth:** Resident, Specialist
- **Request Body:** `{ condition_name, status }`
- **Responses:** `201 Created` — `diagnosed_by` from session, `diagnosed_at` server-generated

## `GET /admissions/:id/diagnoses`
- **Auth:** Nurse, Resident, Specialist

## `PATCH /diagnoses/:id`
- **Auth:** Resident, Specialist

## `DELETE /diagnoses/:id`
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content` (soft archive)

---

# 6. Vital Signs

## `POST /admissions/:id/vitals`
- **Auth:** Nurse, Resident, Specialist
- **Description:** Logs vitals with range validation and optional emergency override.
- **Request Body:**

| Field | Type | Required | Range / Notes |
|---|---|---|---|
| `temperature` | decimal | no | 35.0–45.0 |
| `pulse` | integer | no | bpm |
| `systolic_bp` | integer | no | mmHg |
| `diastolic_bp` | integer | no | mmHg |
| `respiratory_rate` | integer | no | breaths/min |
| `spo2` | integer | no | % |
| `is_override` | boolean | no | requires `override_reason` if true |
| `override_reason` | string | conditional | required if override |

- **Responses:** `201 Created` · `400 Bad Request` · `409 Conflict` (admission not active)
- **Related:** SRS FR-1.2

## `GET /admissions/:id/vitals`
- **Auth:** Nurse, Resident, Specialist
- **Query:** `from`, `to`, `limit` — sparkline trends

## `DELETE /vitals/:id`
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

---

# 7. Medications & Administrations

## `POST /admissions/:id/medications`
- **Auth:** Resident, Specialist
- **Request Body:** `{ drug_name, dosage, frequency, start_date?, end_date? }`
- **Responses:** `201 Created` — `prescribed_by` from session

## `GET /admissions/:id/medications`
- **Auth:** Nurse, Resident, Specialist
- **Query:** `is_active`

## `PATCH /medications/:id`
- **Auth:** Resident, Specialist
- **Request Body:** `{ is_active: false }` to discontinue, OR append-only updates `{ drug_name, dosage, frequency }` to correct mistakes.

## `DELETE /medications/:id`
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

## `POST /medications/:id/administrations`
- **Auth:** Nurse only
- **Request Body:** `{ status, administered_dose?, notes?, scheduled_time, administered_at? }`
- **Notes:** `status` must be `ADMINISTERED`, `REFUSED`, `HELD`, or `MISSED`. `notes` is required if status is not `ADMINISTERED`.
- **Responses:** `201 Created` — MAR entry

## `GET /medications/:id/administrations`
- **Auth:** Nurse, Resident, Specialist

## `PATCH /medication-administrations/:id`
- **Auth:** Nurse, Resident, Specialist
- **Request Body:** `{ administered_dose, modification_reason, status, notes, ... }`
- **Notes:** Append-only correction for MAR logs. `modification_reason` is required.

## `DELETE /medication-administrations/:id`
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

---

# 8. Investigation Orders

## `POST /admissions/:id/investigation-orders`
- **Auth:** Resident, Specialist
- **Request Body:** `{ order_name, type }` — type e.g. `Lab`, `Radiology`
- **Responses:** `201 Created` — status defaults to `Pending`

## `GET /admissions/:id/investigation-orders`
- **Auth:** Nurse, Resident, Specialist

## `PATCH /investigation-orders/:id`
- **Auth:** Resident, Specialist
- **Request Body:** `{ status }` — `Pending` | `Completed`
- **Responses:** `200 OK`

---

# 9. Lab Results

## `POST /admissions/:id/labs`
- **Auth:** Nurse, Resident, Specialist
- **Request Body:** `{ test_name, result_value, abnormal }`
- **Responses:** `201 Created` — `recorded_by` from session

## `GET /admissions/:id/labs`
- **Auth:** Nurse, Resident, Specialist
- **Query:** `from`, `to`, `abnormal`

## `DELETE /labs/:id`
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

---

# 10. Clinical Examinations

## `POST /admissions/:id/examinations`
- **Auth:** Resident, Specialist
- **Description:** Rigid structured exams (general + local).
- **Request Body:** `{ general_exams, local_exams }` — JSON objects
- **Responses:** `201 Created` — `examiner_id` from session

## `GET /admissions/:id/examinations`
- **Auth:** Nurse, Resident, Specialist

---

# 11. Clinical & Nursing Notes

## `POST /admissions/:id/notes/clinical`
- **Auth:** Resident, Specialist
- **Request Body:** `{ content }` — free-text only (SOAP → follow-ups)
- **Responses:** `201 Created`

## `GET /admissions/:id/notes/clinical`
- **Auth:** Nurse, Resident, Specialist

## `POST /admissions/:id/notes/nursing`
- **Auth:** Nurse only
- **Request Body:** `{ note }`
- **Responses:** `201 Created` — `author_id` from session

## `GET /admissions/:id/notes/nursing`
- **Auth:** Nurse, Resident, Specialist

## `DELETE /notes/clinical/:id` · `DELETE /notes/nursing/:id`
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

---

# 12. Follow-ups (SOAP)

## `POST /admissions/:id/follow-ups`
- **Auth:** Resident, Specialist
- **Request Body:** `{ subjective, objective, assessment, plan }`
- **Responses:** `201 Created` — `author_id` from session

## `GET /admissions/:id/follow-ups`
- **Auth:** Nurse, Resident, Specialist

## `DELETE /follow-ups/:id`
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

---

# 13. Medical Documents

## `POST /admissions/:id/documents`
- **Auth:** Nurse, Resident, Specialist
- **Description:** Multipart upload; triggers async embedding job.
- **Request Body (multipart):** `file`, `document_type`
- **Responses:** `201 Created` (`embedding_status: pending`) · `413` · `415`

## `GET /admissions/:id/documents`
- **Auth:** Nurse, Resident, Specialist

## `GET /documents/:id/download`
- **Auth:** Nurse, Resident, Specialist

## `DELETE /documents/:id`
- **Auth:** Resident, Specialist
- **Responses:** `204 No Content`

*`document_embeddings` has no client API — written only by the embedding job.*

---

# 14. AI Services (Summaries & RAG Query)

## `POST /ai/summary`
- **Auth:** Resident, Specialist
- **Request Body:** `{ admission_id, summary_type }`
- **Responses:** `201 Created` — `{ id, overall_summary, generated_at }` · `503`
- **Related:** SRS FR-3.2

## `GET /admissions/:id/summaries`
- **Auth:** Nurse, Resident, Specialist

## `POST /ai/query`
- **Auth:** Resident, Specialist
- **Request Body:** `{ admission_id, question, include_history?: boolean }`
- **Responses:** `200 OK` — `{ id, ai_response, cited_sources }` · `503`
- **Related:** SRS FR-3.1

## `GET /admissions/:id/ai-query-logs`
- **Auth:** Resident, Specialist
- **Query:** `limit`

---

# 15. Alerts & Alert Reviews

## `GET /admissions/:id/alerts`
- **Auth:** Nurse, Resident, Specialist
- **Query:** `status`

## `GET /alerts`
- **Auth:** Nurse, Resident, Specialist
- **Query:** `status`, `severity`
- **Note:** Alerts are created only by the monitoring agent — no client `POST`.

## `POST /alerts/:id/reviews`
- **Auth:** Resident, Specialist
- **Request Body:** `{ review_notes, accepted }`
- **Responses:** `201 Created` — recommend also flipping `alerts.status` to `REVIEWED`

## `GET /alerts/:id/reviews`
- **Auth:** Nurse, Resident, Specialist

---

# 16. Notifications

## `GET /notifications`
- **Auth:** Any authenticated role
- **Query:** `status` (`UNREAD` / `READ`)
- **Note:** ERD `notifications` has no `alert_id`; deep-linking is application-level (title/message) unless schema is extended later.

## `PATCH /notifications/:id/read`
- **Auth:** Own notifications only
- **Responses:** `200 OK` — sets status `READ`

---

# 17. Treatment Approvals

## `POST /admissions/:id/treatment-approvals`
- **Auth:** Resident, Specialist
- **Request Body:** `{ treatment_name, clinical_justification }`
- **Responses:** `201 Created` — pending until Specialist decides

## `PATCH /treatment-approvals/:id`
- **Auth:** Specialist only
- **Request Body:** `{ approval_status: boolean }`
- **Responses:** `200 OK` — sets `approved_by`, `approved_at`

## `GET /admissions/:id/treatment-approvals`
- **Auth:** Nurse, Resident, Specialist

---

# 18. Audit Logs (Admin, Read-Only)

## `GET /admin/audit-logs`
- **Auth:** Admin only
- **Description:** Read-only; excludes clinical field values — shows that an action occurred and by whom.
- **Query:** `user_id`, `action`, `target_table`, `from`, `to`, `page`, `limit`

---

# Appendix — Remaining intentional ERD notes

1. **`notifications` has no `alert_id`** — deep-link optional; not present in current ERD.
2. **`code_status` / `blood_type` / fluid I/O** — intentionally removed from this ERD draft; do not reintroduce via API.
3. **`alerts.status` vs `alert_reviews`** — decide whether creating a review auto-updates alert status.

---

# Endpoint Summary

| Module | Method | Path | Allowed Roles |
|---|---|---|---|
| Auth | POST | `/auth/login` | Public |
| Auth | POST | `/auth/logout` | Any authenticated |
| Auth | GET | `/auth/me` | Any authenticated |
| Admin | POST/GET/PATCH/DELETE | `/admin/users` … | Admin |
| Admin | POST/GET/PATCH | `/admin/beds` … | Admin (+ read for clinical) |
| Patients | POST/GET/DELETE | `/patients` … | Nurse/Resident/Specialist |
| Patients | POST/GET/DELETE | `/patients/:id/allergies`, `/allergies/:id` | Clinical |
| Patients | POST/GET/PATCH | `/patients/:id/medical-history` | Resident/Specialist (GET all clinical) |
| Admissions | POST/GET/DELETE | `/admissions` … | Clinical |
| Admissions | PATCH | `/admissions/:id/discharge` | Specialist |
| Admissions | POST/GET/DELETE | `/admissions/:id/nurses` … | Nurse/Specialist |
| Diagnoses | POST/GET/DELETE | `/admissions/:id/diagnoses`, `/diagnoses/:id` | Clinical |
| Vitals | POST/GET/DELETE | `/admissions/:id/vitals`, `/vitals/:id` | Clinical |
| Medications | CRUD + administrations | `/medications` … | Role-split (see above) |
| Investigations | POST/GET/PATCH | `/investigation-orders` … | Clinical |
| Labs | POST/GET/DELETE | `/labs` … | Clinical |
| Examinations | POST/GET | `/admissions/:id/examinations` | Clinical |
| Notes | POST/GET/DELETE | `/notes/clinical`, `/notes/nursing` | Role-split |
| Follow-ups | POST/GET/DELETE | `/follow-ups` … | Clinical |
| Documents | POST/GET/DELETE + download | `/documents` … | Clinical |
| AI | POST/GET | `/ai/summary`, `/ai/query`, logs | Resident/Specialist (+ GET summaries Nurse) |
| Alerts | GET + reviews | `/alerts` … | Clinical |
| Notifications | GET/PATCH | `/notifications` … | Own user |
| Treatment | POST/PATCH/GET | `/treatment-approvals` … | Role-split |
| Audit | GET | `/admin/audit-logs` | Admin |

**Removed vs prior API draft:** all `/fluids` endpoints.

**Added:** medical-history, examinations, follow-ups; richer patient/admission/vitals payloads aligned to ERD.
