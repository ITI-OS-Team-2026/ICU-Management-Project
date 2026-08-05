# API Implementation Order

# SmartCare ICU
### Build sequence for the endpoints defined in the API Documentation

**Document Version:** 1.1
**Purpose:** Defines the order in which endpoints should be implemented, based on data dependency — not the order they appear in the API documentation. An endpoint cannot be built or meaningfully tested before the things it depends on exist.

---

# The Dependency Logic

Trace any endpoint backward and the order falls out naturally. For example: `POST /admissions/:id/vitals` needs an `admission_id` to exist → which needs `POST /admissions` → which needs a `patient_id`, `bed_id`, and `doctor_id` → which needs `POST /patients`, `POST /admin/beds`, and a Specialist account → which needs `POST /admin/users` → which needs `POST /auth/login` to even be testable. Everything cascades outward from authentication.

The build order below groups endpoints into 11 waves. Endpoints within the same wave are generally safe to build in parallel; a wave should not start until the wave before it is functional.

---

# Wave 0 — Auth Foundation

**Endpoints:** `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`

**Also build in this wave (not endpoints, but hard prerequisites):**
- Authorization middleware (`verifyToken` + `requireRole([...])`)
- Audit-logging middleware (transactional, wraps every write from Wave 1 onward)

**Why first:** every endpoint in every later wave passes through these two middleware functions. Building them here means they never need to be retrofitted.

---

# Wave 1 — Admin Setup

**Endpoints:** `POST/GET/PATCH/DELETE /admin/users`, `POST/GET/PATCH /admin/beds`

**Why here:** you need at least one Nurse, one Resident, one Specialist, and some beds provisioned before any clinical endpoint is testable at all.

**Nurse assignment model:** the ERD supports multiple nurses per admission via `admission_nurses`, with `unassigned_at` recording when a nurse stops caring for the patient. Treat this as handover history — more than one active or historical assignment per admission is expected and correct.

---

# Wave 2 — Patients & Medical History

**Endpoints:**
- Patients: `POST/GET /patients`, `GET /patients/:id`, `DELETE /patients/:id`, `POST/GET/DELETE /patients/:id/allergies`
- Medical history: `POST/GET/PATCH /patients/:id/medical-history`

**Why here:** no admission can exist without a patient to attach it to. Medical history is patient-scoped (`medical_histories.patient_id`), so it belongs in this wave immediately after patient CRUD — before admissions and the clinical recording that depends on them.

---

# Wave 3 — Admissions (the scoping backbone)

**Endpoints:** `POST /admissions`, `GET /admissions`, `GET /admissions/:id`, `POST/GET/DELETE /admissions/:id/nurses`

**Why this is the most important wave:** nearly every clinical table's foreign key points to `admission_id`, not `patient_id`. Every wave after this one depends directly on admissions existing and being correctly scoped. Nurse assignment uses `admission_nurses` with `assigned_at` / `unassigned_at` for handover history.

---

# Wave 4 — Core Clinical Recording

**Endpoints:**
- Vitals: `POST/GET/DELETE /admissions/:id/vitals`, `/vitals/:id`
- Labs: `POST/GET/DELETE /admissions/:id/labs`, `/labs/:id`
- Diagnoses: `POST/GET/DELETE /admissions/:id/diagnoses`, `/diagnoses/:id`
- Medications + administrations: `/medications`, `/medications/:id`, `/medications/:id/administrations`
- Notes: `/notes/clinical`, `/notes/nursing`
- Clinical examinations: `POST/GET /admissions/:id/examinations`
- Follow-ups (SOAP): `POST/GET/DELETE /admissions/:id/follow-ups`, `/follow-ups/:id`
- Investigation orders: `POST/GET/PATCH /admissions/:id/investigation-orders`

**Why here:** all depend on Wave 3, but are mostly independent of each other — safe to build in parallel within this wave. Vitals store temperature, pulse, systolic/diastolic BP, respiratory rate, and SpO2 (with override flags). Clinical notes carry free-text `content` only; SOAP structured documentation lives in follow-ups.

---

# Wave 5 — Documents

**Endpoints:** `POST/GET /admissions/:id/documents`, `GET /documents/:id/download`, `DELETE /documents/:id`

**Why after Wave 4, not with it:** document upload triggers the async embedding job. There's no point building that trigger before real clinical data exists (Wave 4) to eventually summarize alongside embedded documents in Wave 7.

---

# Wave 6 — Discharge & Treatment Approval

**Endpoints:** `PATCH /admissions/:id/discharge`, `POST/PATCH/GET /admissions/:id/treatment-approvals`

**Why here:** these are only meaningfully testable once an admission has real clinical data in it — discharging an empty admission isn't a useful test case.

---

# Wave 7 — AI Summarization & RAG

**Endpoints:**
- Patient summaries: `POST /ai/summary`, `GET /admissions/:id/summaries`, `DELETE/PATCH /ai/summaries/:summaryId`, `POST /ai/admissions/:admissionId/patient-summary`, `GET /ai/admissions/:admissionId/patient-context`
- Legacy query log: `POST /ai/query`, `GET /admissions/:id/ai-query-logs`
- RAG assistant: `POST /rag/query`, `GET/DELETE /rag/admissions/:admissionId/history`, `GET /rag/admissions/:admissionId/index`, `POST /rag/admissions/:admissionId/reindex`, `GET/POST /rag/documents/:documentId/status|reindex|chunks`
- Saved assistant chats: `GET/POST/DELETE /rag/chats`, `GET/PATCH/DELETE /rag/chats/:chatId`, `GET/POST/DELETE /rag/chats/:chatId/resources`

**Why deliberately this late:** these endpoints have nothing to summarize or retrieve until Wave 4's clinical data and Wave 5's embedded documents actually exist. Saved chats and chat resources are the last thing in this wave — they're a UX layer on top of the RAG query endpoint above, not a data dependency for anything else.

---

# Wave 8 — Monitoring Agent & Alerts

**Endpoints:** the background monitoring agent (not a client-facing endpoint), `GET /admissions/:id/alerts`, `GET /alerts`, `POST/GET /alerts/:id/reviews`

**Why here:** pattern/threshold detection can't be tested against an empty vitals table — this wave depends on Wave 4's vitals flowing in continuously.

---

# Wave 9 — Notifications

**Endpoints:** `GET /notifications`, `PATCH /notifications/:id/read`

**Why last of the "real" features:** notifications are a side effect of alerts (Wave 8). Building them earlier just produces an inbox with nothing to show.

---

# Wave 10 — Admin Audit Log Viewer

**Endpoints:** `GET /admin/audit-logs`, `GET /admin/audit-logs/stats`

**Why last:** the audit-logging *middleware* was already built in Wave 0 and has been silently collecting correct data since then. This wave is only the reporting view on top of it — lowest priority because no other feature depends on it.

---

# Wave 11 — Login Attempts & Assisted Password Reset

**Endpoints:**
- `GET /admin/login-attempts`, `GET /admin/login-attempts/stats`
- `POST /password-reset-requests`, `POST /password-reset-requests/public`, `GET /password-reset-requests/my`, `POST /password-reset-requests/mark-seen`, `GET /password-reset-requests/unseen-count`
- `GET /admin/password-reset-requests`, `GET /admin/password-reset-requests/pending-count`, `POST /admin/password-reset-requests/:id/resolve`

**Why last:** like Wave 10, the data these endpoints read (`login_attempts`) has been written since Wave 0 — `POST /auth/login` logs every attempt regardless of whether this wave has been built yet. This wave is the admin-facing reporting/resolution layer on top of that existing data, plus the self-contained password-reset-request workflow, which depends only on Wave 0's `users` table and auth middleware — it could technically move earlier, but there's no reason to prioritize it over clinical features.

---

# Summary Table

| Wave | Focus | Depends On |
|---|---|---|
| 0 | Auth + middleware | Nothing |
| 1 | Admin: users, beds | Wave 0 |
| 2 | Patients, allergies, medical history | Wave 1 |
| 3 | Admissions, nurse assignment | Wave 2 |
| 4 | Vitals, labs, diagnoses, medications, notes, examinations, follow-ups, investigation orders | Wave 3 |
| 5 | Documents + embedding trigger | Wave 4 |
| 6 | Discharge, treatment approval | Wave 4 |
| 7 | AI summary, RAG query, saved assistant chats | Waves 4, 5 |
| 8 | Monitoring agent, alerts | Wave 4 |
| 9 | Notifications | Wave 8 |
| 10 | Audit log viewer | Wave 0 (data), built last |
| 11 | Login attempts, assisted password reset | Wave 0 (data), built last |
