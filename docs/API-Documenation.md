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
14b. RAG Assistant (`/rag`)
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
- **Description:** Multipart upload. On success the document is queued for RAG indexing out of band — the response returns immediately with `embedding_status: "PENDING"`; poll `GET /rag/documents/:id/status` for progress.
- **Request Body (multipart):** `file` (PDF, JPEG, PNG, TXT — max 10 MB), `document_type`
- **Responses:** `201 Created` — includes `mimeType`, `fileSize`, `embeddingStatus` · `404` unknown admission · `409` admission not `ACTIVE` · `413` too large · `415` unsupported type

## `GET /admissions/:id/documents`
- **Auth:** Nurse, Resident, Specialist
- **Description:** Active (non-archived) documents, newest first, each with its indexing state (`embeddingStatus`, `chunkCount`, `embeddingError`).

## `GET /documents/:id/download`
- **Auth:** Nurse, Resident, Specialist

## `DELETE /documents/:id`
- **Auth:** Resident, Specialist
- **Description:** Soft archive. Chunks are retained but excluded from retrieval immediately.
- **Responses:** `204 No Content`

*`document_embeddings` has no direct client API — it is written only by the RAG indexing pipeline and read through §14b.*

---

# 14. AI Services (Summaries & RAG Query)

## `POST /ai/summary`
- **Auth:** Resident, Specialist
- **Request Body:** `{ admission_id, summary_type }`
- **Responses:** `201 Created` — `{ id, overall_summary, generated_at }` · `503`
- **Related:** SRS FR-3.2

## `GET /admissions/:id/summaries`
- **Auth:** Nurse, Resident, Specialist

## `POST /ai/admissions/:admissionId/patient-summary`
- **Auth:** Resident, Specialist
- **Description:** Generates a full ICU handoff summary through Bedrock. Independent of the RAG assistant.
- **Responses:** `201 Created` · `503`

## `GET /ai/admissions/:admissionId/patient-context`
- **Auth:** Resident, Specialist
- **Description:** The aggregated data the summary would be built from, without invoking the LLM.

## `DELETE /ai/summaries/:summaryId` · `PATCH /ai/summaries/:summaryId/restore`
- **Auth:** Resident, Specialist
- **Responses:** `200 OK` · `404` · `409` already in that state

## `POST /ai/query`
- **Auth:** Resident, Specialist
- **Description:** Legacy alias for `POST /rag/query` — same implementation, same response shape.
- **Request Body:** `{ admission_id, question, include_history?: boolean }`
- **Responses:** `200 OK` · `404` · `503`
- **Related:** SRS FR-3.1

## `GET /admissions/:id/ai-query-logs`
- **Auth:** Resident, Specialist
- **Query:** `limit`

---

# 14b. RAG Assistant (`/rag`)

Retrieval-augmented question answering over a **single admission**. Every query embeds the question, runs a pgvector similarity search across that admission's indexed document chunks, joins the admission's structured clinical records, and asks the LLM to answer using only that context with inline citations. There is no code path that widens the scope beyond one admission (SRS FR-3.1).

## `POST /rag/query`
- **Auth:** Resident, Specialist
- **Request Body:** `{ question, mode?: "patient" | "knowledge", admission_id, include_history?: boolean, chat_id?: uuid, top_k?: 1..25 }`
  - `mode: "patient"` (default) — requires `admission_id`, rejects `chat_id`. Answers only from that admission's record and logs to `ai_query_logs`.
  - `mode: "knowledge"` — rejects `admission_id`. General medical questions against the indexed knowledge base. Pass `chat_id` to continue a saved chat; omit it and a new chat is started, whose id comes back as `data.chat_id`.
- **Responses:** `200 OK` · `400` invalid question · `404` unknown admission or chat · `503` AI service unavailable
- **Response shape:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "admission_id": "uuid",
    "question": "What did the echocardiogram show?",
    "ai_response": "The echocardiogram reported an ejection fraction of 38 percent [Document: consult.pdf, part 1].",
    "cited_sources": [
      {
        "type": "document_chunk",
        "id": "uuid",
        "document_id": "uuid",
        "chunk_index": 0,
        "label": "Document: consult.pdf, part 1",
        "excerpt": "Echocardiography reports an ejection fraction of 38 percent…",
        "score": 0.4812,
        "cited": true
      },
      {
        "type": "vital_signs",
        "id": "uuid",
        "label": "Vitals log, 30 Jul, 23:47",
        "timestamp": "2026-07-30T23:47:00.000Z",
        "excerpt": "temp 37.4°C, pulse 112 bpm, BP 96/58 mmHg, RR 22/min, SpO2 91%",
        "cited": false
      }
    ],
    "created_at": "2026-07-30T23:47:12.000Z",
    "retrieval": {
      "mode": "llm",
      "embedding_model": "local:hashed-lexical-v1",
      "document_chunks_retrieved": 1,
      "clinical_records_retrieved": 2,
      "clinical_records_available": 2,
      "top_score": 0.4812,
      "duration_ms": 8420
    }
  }
}
```
- **`retrieval.mode`:** `llm` (generated) · `retrieval_only` (no LLM configured — the top retrieved records are returned verbatim) · `no_context` (nothing recorded for this admission; `ai_response` is the explicit "Not enough recorded data…" state and no LLM call is made).
- **`cited_sources[].cited`:** `true` when the answer text references that source label, so the UI can separate referenced sources from the wider retrieval set.

## `GET /rag/admissions/:admissionId/history`
- **Auth:** Resident, Specialist
- **Query:** `limit` (1–100, default 30)
- **Description:** Conversation transcript, **oldest first** for direct chat rendering.

## `DELETE /rag/admissions/:admissionId/history`
- **Auth:** Resident, Specialist
- **Description:** Clears `ai_query_logs` for the admission. The audit trail is unaffected.
- **Responses:** `200 OK` — `{ status, message, deleted }`

## Saved assistant chats (`/rag/chats`)

Named, resumable conversations with the **Medical Knowledge Assistant** (`mode: "knowledge"`), stored in `ai_chat_sessions` / `ai_chat_messages`. Every route is scoped to the authenticated clinician — another clinician's chat returns `404`, never `403`, so ids cannot be probed. Patient-mode transcripts are **not** stored here; they stay in `ai_query_logs` as part of the admission record.

### `GET /rag/chats`
- **Auth:** Resident, Specialist
- **Query:** `limit` (1–200, default 100)
- **Description:** The caller's chats, most recently active first: `{ id, title, mode, created_at, updated_at, last_message_at, message_count }`.

### `POST /rag/chats`
- **Auth:** Resident, Specialist
- **Request Body:** `{ title? }` — defaults to `"New chat"`, replaced by the first question asked in it.
- **Responses:** `201 Created`. Optional: asking with no `chat_id` also creates one.

### `GET /rag/chats/:chatId`
- **Auth:** Resident, Specialist (owner only)
- **Description:** The chat plus `messages[]`, oldest first: `{ id, role: "user" | "assistant", content, cited_sources, retrieval, created_at }`.
- **Responses:** `200 OK` · `404` unknown or not owned

### `PATCH /rag/chats/:chatId`
- **Auth:** Resident, Specialist (owner only)
- **Request Body:** `{ title }` (1–120 chars)

### `DELETE /rag/chats/:chatId`
- **Auth:** Resident, Specialist (owner only)
- **Description:** Permanently deletes the chat and its messages. Audited as `ARCHIVE` on `AiChatSession`.
- **Responses:** `200 OK` — `{ status, message, deleted, messages_deleted }`

### `DELETE /rag/chats`
- **Auth:** Resident, Specialist
- **Description:** Deletes every chat the caller owns.
- **Responses:** `200 OK` — `{ status, message, deleted }`

## `GET /rag/admissions/:admissionId/index`
- **Auth:** Nurse, Resident, Specialist
- **Description:** Knowledge-base status for the admission: `counts` by embedding state, `indexed_chunks`, `is_searchable`, `is_busy`, `embedding_provider`, plus per-document detail.

## `POST /rag/admissions/:admissionId/reindex`
- **Auth:** Resident, Specialist
- **Description:** Re-queues every `PENDING` / `FAILED` document for the admission.
- **Responses:** `202 Accepted` — `{ queued }`

## `GET /rag/documents/:documentId/status`
- **Auth:** Nurse, Resident, Specialist
- **Description:** Poll one document's indexing progress. `is_retryable` is `true` when a re-index would help.

## `POST /rag/documents/:documentId/reindex`
- **Auth:** Resident, Specialist
- **Description:** Synchronous re-extract → re-chunk → re-embed of one document.
- **Responses:** `200 OK` · `404` · `409` already indexing

## `GET /rag/documents/:documentId/chunks`
- **Auth:** Resident, Specialist
- **Query:** `limit` (1–200, default 50)
- **Description:** The exact chunks stored for a document — lets a clinician audit what the assistant can see.

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

`approval_status` is tri-state: `null` = pending, `true` = approved, `false` = rejected.

## `POST /admissions/:id/treatment-approvals`
- **Auth:** Resident, Specialist
- **Request Body:** `{ treatment_name, clinical_justification }`
- **Responses:** `201 Created` — pending until Specialist decides
- **Errors:** `404` unknown admission · `409` admission is not `ACTIVE`
- **Side effect:** notifies every active Specialist (except the requester)

## `PATCH /treatment-approvals/:id`
- **Auth:** Specialist only
- **Request Body:** `{ approval_status: boolean }`
- **Responses:** `200 OK` — sets `approved_by`, `approved_at`
- **Errors:** `404` unknown approval · `409` already decided (decisions are final)
- **Side effect:** notifies the requester of the decision

## `PATCH /treatment-approvals/:id/execution`
- **Auth:** Nurse only
- **Description:** Bedside execution log — records that an *approved* treatment was actually carried out.
- **Request Body:** `{ execution_status: "IN_PROGRESS" | "COMPLETED", execution_notes? }`
- **Responses:** `200 OK` — stamps `started_by`/`started_at` or `completed_by`/`completed_at`
- **Errors:** `404` unknown approval · `409` not approved yet, rejected, or a backwards transition
- **Notes:** execution is forward-only (`NOT_STARTED → IN_PROGRESS → COMPLETED`). Completing straight
  from `NOT_STARTED` also stamps the start time, for short procedures.
- **Side effect:** notifies the requester and the approving specialist

## `GET /admissions/:id/treatment-approvals`
- **Auth:** Nurse, Resident, Specialist
- **Query:** `status` (`PENDING` / `APPROVED` / `REJECTED`), `execution` (`NOT_STARTED` / `IN_PROGRESS` / `COMPLETED`) — omit for all
- **Responses:** `200 OK` — newest first, each row embeds `requester`, `approver`, `starter`, `completer`

## `DELETE /treatment-approvals/:id`
- **Auth:** Resident, Specialist — requester only
- **Description:** Withdraws a still-pending request (soft archive).
- **Responses:** `204 No Content`
- **Errors:** `403` not the requester · `404` unknown approval · `409` already decided

> **ERD note:** the table carries a `requested_by` FK in addition to the ERD's `approved_by`, so the
> requesting clinician can be shown without joining the audit log.

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
| RAG | POST/GET/PATCH/DELETE | `/rag/query`, `/rag/chats`, history, index status, re-index, chunks | Resident/Specialist (+ GET index/status Nurse) |
| Alerts | GET + reviews | `/alerts` … | Clinical |
| Notifications | GET/PATCH | `/notifications` … | Own user |
| Treatment | POST/GET/PATCH/DELETE | `/treatment-approvals` … | Role-split |
| Audit | GET | `/admin/audit-logs` | Admin |

**Removed vs prior API draft:** all `/fluids` endpoints.

**Added:** medical-history, examinations, follow-ups; richer patient/admission/vitals payloads aligned to ERD.
