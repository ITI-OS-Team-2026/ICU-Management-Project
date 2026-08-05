# Database Schema

# SmartCare ICU
### AI-Powered Intensive Care Unit (ICU) Management and Clinical Decision Support System

---

## Document Information

| Item | Value |
|------|-------|
| Document | Database Schema |
| Project | SmartCare ICU |
| Version | 2.0 |
| Database | PostgreSQL 16+ |
| ORM | Prisma ORM |
| Architecture | Relational Database (3NF) |
| Vector Extension | pgvector |
| UUID Strategy | UUID v4 |
| Status | Aligned to current ERD |

---

# Table of Contents

1. Introduction & Design Principles
2. PostgreSQL ENUM Types
3. Authentication & Security
4. Core Clinical Data Model
5. Clinical Recording Module
6. Clinical Documentation & Exams
7. Artificial Intelligence Module
8. System Management Module
9. Constraints, Indexes & Data Dictionary

---

# 1. Introduction & Design Principles

This document defines the PostgreSQL schema for SmartCare ICU exactly as modeled in `docs/ERD Code`. Every table, column, and relationship below must match that ERD.

## Design principles

- **Admission-centered** — clinical records attach to `admissions`, not directly to patients, so multiple ICU stays stay separated.
- **Soft delete** — tables with `is_archived` / `archived_at` never hard-delete clinical history.
- **Auditability** — significant writes produce immutable `audit_logs` rows.
- **AI-ready** — `document_embeddings` uses pgvector; AI summaries, RAG logs, and alerts are first-class tables.
- **UUID primary keys** — `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` on every table.

## Required extensions

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## High-level architecture

```text
users ──┬── login_attempts / refresh_tokens / audit_logs / notifications / password_reset_requests
        ├── ai_chat_sessions → ai_chat_messages, medical_documents (chat resources)
        │
patients ── medical_histories / allergies
        │
        └── admissions ── beds, doctor (users), admission_nurses
                 │
                 ├── diagnoses → diagnosis_acknowledgements, diagnosis_concerns
                 ├── vital_signs, medications → medication_administrations
                 ├── investigation_orders, lab_results
                 ├── clinical_examinations, clinical_notes, nursing_notes, follow_ups
                 ├── medical_documents → document_embeddings
                 ├── ai_summaries, ai_query_logs, alerts → alert_reviews
                 └── treatment_approvals
```

**Tables removed from prior schema drafts:** `fluid_records`, `system_settings`.

**Tables / fields added in this ERD:** `medical_histories`, `clinical_examinations`, `follow_ups`, richer `admissions` / `patients`, simplified `vital_signs` (`pulse` instead of GCS/MAP-centric design).

---

# 2. PostgreSQL ENUM Types

```sql
CREATE TYPE user_role AS ENUM (
  'SYSTEM_ADMIN', 'ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST'
);

CREATE TYPE marital_status AS ENUM (
  'SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER'
);

CREATE TYPE handedness AS ENUM (
  'RIGHT', 'LEFT', 'AMBIDEXTROUS', 'UNKNOWN'
);

CREATE TYPE admission_status AS ENUM (
  'ACTIVE', 'DISCHARGED', 'ARCHIVED'
);

CREATE TYPE bed_status AS ENUM (
  'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'
);

CREATE TYPE diagnosis_status AS ENUM (
  'SUSPECTED', 'CONFIRMED', 'RULED_OUT', 'RESOLVED'
);

CREATE TYPE alert_severity AS ENUM ('P0', 'P1');

CREATE TYPE alert_status AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED');

CREATE TYPE notification_status AS ENUM ('UNREAD', 'READ');

CREATE TYPE ai_summary_type AS ENUM ('24_HOUR', 'ON_DEMAND');

CREATE TYPE embedding_status AS ENUM (
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
);

CREATE TYPE investigation_type AS ENUM ('Lab', 'Radiology', 'Other');

CREATE TYPE investigation_order_status AS ENUM ('Pending', 'Completed');

CREATE TYPE diagnosis_type AS ENUM ('PRIMARY', 'SECONDARY', 'COMORBIDITY', 'COMPLICATION');

CREATE TYPE concern_status AS ENUM ('OPEN', 'ADDRESSED', 'DISMISSED');

CREATE TYPE medication_frequency AS ENUM (
  'OD', 'BD', 'TDS', 'QDS', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'PRN', 'STAT', 'CONTINUOUS', 'OTHER'
);

CREATE TYPE medication_route AS ENUM ('IV', 'PO', 'IM', 'SC', 'INH', 'TOPICAL', 'PR', 'NG');

CREATE TYPE notification_type AS ENUM ('INFO', 'ALERT', 'SUMMON');

CREATE TYPE ai_chat_mode AS ENUM ('KNOWLEDGE', 'PATIENT');

CREATE TYPE ai_chat_role AS ENUM ('USER', 'ASSISTANT');

CREATE TYPE password_reset_status AS ENUM ('PENDING', 'RESOLVED');

CREATE TYPE audit_action AS ENUM (
  'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'ARCHIVE', 'VIEW', 'ACCOUNT_LOCKED',
  'GENERATE_SUMMARY', 'QUERY_RAG'
);
```

`users.status`, `patients.gender`, `allergies.severity`, and several free-form status strings may be stored as `VARCHAR`/`TEXT` with application-level validation if not promoted to ENUMs in migration.

---

# 3. Authentication & Security

## 3.1 users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | User identifier |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| email | CITEXT | UNIQUE, NOT NULL | Login email |
| password_hash | TEXT | NOT NULL | bcrypt hash |
| role | user_role | NOT NULL | RBAC role |
| status | VARCHAR(50) | NOT NULL | ACTIVE / INACTIVE / LOCKED / SUSPENDED |
| auth_provider | VARCHAR(20) | DEFAULT 'LOCAL' | Login mechanism (local-only today) |
| phone | VARCHAR(50) | NULL | Contact number |
| profile_image | TEXT | NULL | Avatar URL |
| last_login | TIMESTAMPTZ | NULL | Most recent successful login |
| failed_login_attempts | INTEGER | DEFAULT 0 | Consecutive failures since last success |
| locked_until | TIMESTAMPTZ | NULL | Account lock expiry, set after repeated failures |

## 3.2 login_attempts

Every login attempt — success or failure — is logged here, keyed by the email typed rather than the resolved user, so unknown-email attempts are still auditable.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Attempt id |
| user_id | UUID | FK → users, `ON DELETE SET NULL` | Nullable if email unknown |
| email | VARCHAR(255) | NOT NULL | Email as typed |
| ip_address | VARCHAR(45) | NOT NULL | Client IP |
| user_agent | TEXT | NULL | Client user agent string |
| success | BOOLEAN | NOT NULL | Login result |
| failure_reason | VARCHAR(100) | NULL | e.g. `INVALID_PASSWORD`, `ACCOUNT_LOCKED`, `UNKNOWN_EMAIL` |
| attempted_at | TIMESTAMPTZ | DEFAULT NOW() | When attempted |

Read via `GET /admin/login-attempts` and `GET /admin/login-attempts/stats` (Admin only) — see API docs §2b.

## 3.3 refresh_tokens

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Token id |
| user_id | UUID | FK → users, NOT NULL | Owner |
| token | TEXT | NOT NULL | Stored token / hash |
| expires_at | TIMESTAMPTZ | NOT NULL | Expiry |
| is_revoked | BOOLEAN | DEFAULT FALSE | Revocation flag |

## 3.4 audit_logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Audit id |
| user_id | UUID | FK → users, `ON DELETE SET NULL` | Actor |
| action | audit_action | NOT NULL | Enum — see below |
| target_table | VARCHAR(100) | NOT NULL | Affected table |
| target_id | UUID | NULL | Affected row id |
| old_values | JSONB | NULL | Before snapshot |
| new_values | JSONB | NULL | After snapshot |
| ip_address | VARCHAR(45) | NULL | Actor's IP at time of action |
| user_agent | TEXT | NULL | Actor's user agent |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Event time |

`audit_action` ENUM: `LOGIN` · `LOGOUT` · `CREATE` · `UPDATE` · `ARCHIVE` · `VIEW` · `ACCOUNT_LOCKED` · `GENERATE_SUMMARY` · `QUERY_RAG`.

Append-only. Never update or delete audit rows.

## 3.5 password_reset_requests

In-app assisted password reset workflow — separate from the login-lockout flow above. A locked-out or forgetful clinician asks an admin to reset their password; an admin resolves the request with a temporary password sent back through `admin_reply`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Request id |
| requester_id | UUID | FK → users, NOT NULL, `ON DELETE CASCADE` | Who asked |
| message | TEXT | NULL | Optional note from the requester to the admin |
| status | password_reset_status | DEFAULT 'PENDING' | `PENDING` / `RESOLVED` |
| admin_reply | TEXT | NULL | Admin's reply (e.g. the new temporary password) |
| resolved_by_id | UUID | FK → users, `ON DELETE SET NULL` | Admin who resolved it |
| resolved_at | TIMESTAMPTZ | NULL | Resolution time |
| seen_by_user | BOOLEAN | DEFAULT FALSE | Whether the requester has seen the resolution |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Request time |

`password_reset_status` ENUM: `PENDING` · `RESOLVED`.

Created via `POST /password-reset-requests` (authenticated) or `POST /password-reset-requests/public` (unauthenticated, rate-limited by IP+email, response never reveals whether the email matched an account). Resolved via `POST /admin/password-reset-requests/:id/resolve`. See API docs §2c.

**Relationships:** `users.id` → `login_attempts`, `refresh_tokens`, `audit_logs`, `notifications`, `password_reset_requests` (as requester and as resolver).

---

# 4. Core Clinical Data Model

## 4.1 patients

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Patient id |
| mrn | VARCHAR(50) | UNIQUE, NOT NULL | Medical record number |
| national_id | VARCHAR(50) | NULL | Government ID |
| name | VARCHAR(200) | NOT NULL | Full name |
| age | INTEGER | NOT NULL | Age in years |
| gender | VARCHAR(30) | NULL | Gender |
| residence | TEXT | NULL | Residence |
| occupation | TEXT | NULL | Occupation |
| marital_status | marital_status | NULL | Marital status |
| handedness | handedness | NULL | Handedness |
| children_count | INTEGER | NULL | Number of children |
| youngest_child_age | VARCHAR(50) | NULL | Age of youngest child (free text, e.g. "6 months") |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

## 4.2 medical_histories

Patient-scoped structured history — `patient_id` is `UNIQUE` (true 1:1 with `patients`).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | History id |
| patient_id | UUID | FK → patients, UNIQUE, NOT NULL | Patient |
| diabetes_dm | BOOLEAN | DEFAULT FALSE | Diabetes |
| hypertension_htn | BOOLEAN | DEFAULT FALSE | Hypertension |
| past_similar_conditions | TEXT | NULL | Prior similar illness |
| past_diseases | JSONB | NULL | Past diseases list |
| previous_operations | BOOLEAN | DEFAULT FALSE | Prior surgery |
| operations_details | TEXT | NULL | Surgery details |
| has_allergies | BOOLEAN | DEFAULT FALSE | Allergy flag |
| traveled_abroad | BOOLEAN | DEFAULT FALSE | Travel history |
| consanguinity | BOOLEAN | DEFAULT FALSE | Consanguinity |
| family_similar_conditions | TEXT | NULL | Family history |
| inherited_diseases | JSONB | NULL | Inherited diseases |
| free_text | TEXT | NULL | Free-text history not covered by structured fields |
| custom_fields | JSONB | NULL | Ad-hoc key/value additions the form doesn't hard-code |
| special_habits | TEXT | NULL | Smoking, alcohol, substance use, etc. |
| blood_transfusion | BOOLEAN | DEFAULT FALSE | Prior blood transfusion |
| menstrual_history | JSONB | NULL | Structured menstrual history |
| obstetric_history | JSONB | NULL | Structured obstetric (pregnancy) history |

## 4.3 allergies

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Allergy id |
| patient_id | UUID | FK → patients, NOT NULL | Patient |
| allergen | VARCHAR(200) | NOT NULL | Allergen name |
| severity | VARCHAR(50) | NULL | Severity |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

## 4.4 beds

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Bed id |
| bed_number | VARCHAR(20) | UNIQUE, NOT NULL | Bed label |
| status | bed_status | DEFAULT 'AVAILABLE' | Availability |

## 4.5 admissions

Central clinical hub. `doctor_id` is the attending physician (`users`).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Admission id |
| patient_id | UUID | FK → patients, NOT NULL | Patient |
| bed_id | UUID | FK → beds, NOT NULL | Assigned bed |
| doctor_id | UUID | FK → users, NOT NULL | Attending doctor |
| transfer_reason | TEXT | NULL | Reason for ICU / transfer (formerly `admission_reason`) |
| place_of_transfer | TEXT | NULL | Transfer origin |
| transfer_doctor_name | TEXT | NULL | Referring doctor name |
| chief_complaint | TEXT | NULL | Chief complaint |
| complaint_analysis | TEXT | NULL | Structured analysis of the chief complaint |
| symptoms_related_system | TEXT | NULL | System-related symptoms |
| symptoms_other_systems | TEXT | NULL | Other symptoms |
| previous_investigations | JSONB | NULL | Prior investigations (structured, not free text) |
| previous_treatments | TEXT | NULL | Prior treatments |
| provisional_diagnosis | TEXT | NULL | Provisional diagnosis |
| status | admission_status | DEFAULT 'ACTIVE' | Lifecycle state |
| admitted_at | TIMESTAMPTZ | DEFAULT NOW() | Admission time |
| discharged_at | TIMESTAMPTZ | NULL | Discharge time |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

**Rules:** only one `ACTIVE` admission per bed (`UNIQUE` partial index on `bed_id WHERE status = 'ACTIVE'`). Discharged admissions are clinically read-only.

## 4.6 admission_nurses

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Assignment id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| nurse_id | UUID | FK → users, NOT NULL | Nurse |
| assigned_at | TIMESTAMPTZ | DEFAULT NOW() | Assignment start |
| unassigned_at | TIMESTAMPTZ | NULL | When care ended |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

Multiple nurses over time are allowed; `unassigned_at` records handover history.

## 4.7 diagnoses

A diagnosis starts `SUSPECTED` and either gets `CONFIRMED` by evidence or `RULED_OUT`; a confirmed condition can later `RESOLVE`. Amendments to wording/type/reasoning archive-and-recreate the row (preserving `original_diagnosed_by`) rather than mutating history in place.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Diagnosis id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| condition_name | VARCHAR(255) | NOT NULL | Condition |
| type | diagnosis_type | DEFAULT 'SECONDARY' | `PRIMARY` / `SECONDARY` / `COMORBIDITY` / `COMPLICATION` |
| status | diagnosis_status | DEFAULT 'SUSPECTED' | `SUSPECTED` / `CONFIRMED` / `RULED_OUT` / `RESOLVED` |
| clinical_notes | TEXT | NULL | Reasoning behind the diagnosis |
| diagnosed_by | UUID | FK → users, NOT NULL | Clinician who wrote the current version |
| original_diagnosed_by | UUID | FK → users, NULL | Clinician who wrote the original version, survives amendments |
| diagnosed_at | TIMESTAMPTZ | DEFAULT NOW() | When diagnosed |
| ruled_out_reason | TEXT | NULL | Why ruled out, if applicable |
| resolved_at | TIMESTAMPTZ | NULL | When resolved |
| resolution_reason | TEXT | NULL | Why resolved |
| status_changed_by | UUID | FK → users, NULL | Who last moved the status |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

`diagnosis_type` ENUM: `PRIMARY` · `SECONDARY` · `COMORBIDITY` · `COMPLICATION`.
`diagnosis_status` ENUM: `SUSPECTED` · `CONFIRMED` · `RULED_OUT` · `RESOLVED`.

## 4.8 diagnosis_acknowledgements

Proof that the bedside nurse has seen a diagnosis (or an amended version of it — an amendment creates a new `diagnosis_id`, so it must be re-acknowledged). One row per nurse per diagnosis version.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Acknowledgement id |
| diagnosis_id | UUID | FK → diagnoses, NOT NULL, `ON DELETE CASCADE` | Diagnosis version |
| nurse_id | UUID | FK → users, NOT NULL | Acknowledging nurse |
| acknowledged_at | TIMESTAMPTZ | DEFAULT NOW() | When seen |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Row creation time |

`UNIQUE(diagnosis_id, nurse_id)` — one acknowledgement per nurse per diagnosis version.

## 4.9 diagnosis_concerns

A nursing observation that the patient's presentation doesn't fit the recorded diagnosis. Nurses raise concerns; only a doctor (Resident/Specialist) can respond and close them.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Concern id |
| diagnosis_id | UUID | FK → diagnoses, NOT NULL, `ON DELETE CASCADE` | Diagnosis in question |
| raised_by | UUID | FK → users, NOT NULL | Nurse who raised it |
| note | TEXT | NOT NULL | The concern |
| status | concern_status | DEFAULT 'OPEN' | `OPEN` / `ADDRESSED` / `DISMISSED` |
| response_note | TEXT | NULL | Doctor's response |
| responded_by | UUID | FK → users, NULL | Doctor who responded |
| responded_at | TIMESTAMPTZ | NULL | When responded |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Raised at |
| updated_at | TIMESTAMPTZ | ON UPDATE NOW() | Last change |

`concern_status` ENUM: `OPEN` · `ADDRESSED` · `DISMISSED`.

---

# 5. Clinical Recording Module

## 5.1 vital_signs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Vitals id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| recorded_by | UUID | FK → users, NOT NULL | Recorder |
| temperature | NUMERIC(4,1) | CHECK 35–45 | °C |
| pulse | INTEGER | NULL | Heart rate (bpm) |
| systolic_bp | INTEGER | NULL | Systolic mmHg |
| diastolic_bp | INTEGER | NULL | Diastolic mmHg |
| respiratory_rate | INTEGER | NULL | Breaths/min |
| spo2 | INTEGER | NULL | Oxygen saturation % |
| is_override | BOOLEAN | DEFAULT FALSE | Emergency override |
| override_reason | TEXT | NULL | Required if override |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Measurement time |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

```sql
CHECK (temperature IS NULL OR (temperature BETWEEN 35.0 AND 45.0))
CHECK (is_override = FALSE OR override_reason IS NOT NULL)
```

## 5.2 medications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Order id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| prescribed_by | UUID | FK → users, NOT NULL | Prescriber of the current version |
| original_prescriber_id | UUID | FK → users, NULL | Prescriber of the original order, survives amendments |
| drug_name | VARCHAR(200) | NOT NULL | Drug |
| dosage | VARCHAR(100) | NOT NULL | Dose |
| frequency | medication_frequency | DEFAULT 'OTHER' | `OD`/`BD`/`TDS`/`QDS`/`Q4H`/`Q6H`/`Q8H`/`Q12H`/`PRN`/`STAT`/`CONTINUOUS`/`OTHER` |
| frequency_text | VARCHAR(100) | NULL | Free-text frequency when `frequency = OTHER` |
| route | medication_route | NULL | `IV`/`PO`/`IM`/`SC`/`INH`/`TOPICAL`/`PR`/`NG` |
| instructions | TEXT | NULL | Additional prescriber instructions |
| start_date | TIMESTAMPTZ | NULL | Start |
| end_date | TIMESTAMPTZ | NULL | End |
| prescribed_at | TIMESTAMPTZ | DEFAULT NOW() | Order time |
| is_active | BOOLEAN | DEFAULT TRUE | Still active |
| allergy_acknowledged | BOOLEAN | DEFAULT FALSE | Prescriber acknowledged a matching patient allergy at order time |
| discontinued_by | UUID | FK → users, NULL | Who discontinued the order |
| discontinued_at | TIMESTAMPTZ | NULL | When discontinued |
| discontinue_reason | TEXT | NULL | Why discontinued |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

`medication_frequency` ENUM: `OD` · `BD` · `TDS` · `QDS` · `Q4H` · `Q6H` · `Q8H` · `Q12H` · `PRN` · `STAT` · `CONTINUOUS` · `OTHER`.
`medication_route` ENUM: `IV` · `PO` · `IM` · `SC` · `INH` · `TOPICAL` · `PR` · `NG`.

## 5.3 medication_administrations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Admin id |
| medication_id | UUID | FK → medications, NOT NULL | Order |
| administered_by | UUID | FK → users, NOT NULL | Nurse |
| administered_dose | VARCHAR(100) | NULL | Dose given (null if refused) |
| status | VARCHAR(50) | NOT NULL | ADMINISTERED/REFUSED/HELD/MISSED |
| notes | TEXT | NULL | Reason if not administered |
| scheduled_time | TIMESTAMPTZ | NOT NULL | Scheduled time |
| administered_at | TIMESTAMPTZ | NULL | Attempt time |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

## 5.4 investigation_orders

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Order id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| ordered_by | UUID | FK → users, NOT NULL | Ordering clinician |
| order_name | VARCHAR(255) | NOT NULL | Investigation name |
| type | VARCHAR(50) | NOT NULL | Lab / Radiology / … |
| status | VARCHAR(50) | DEFAULT 'Pending' | Pending / Completed |
| order_date | TIMESTAMPTZ | DEFAULT NOW() | Ordered at |

## 5.5 lab_results

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Result id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| recorded_by | UUID | FK → users, NOT NULL | Recorder |
| test_name | VARCHAR(150) | NOT NULL | Test name |
| result_value | VARCHAR(100) | NOT NULL | Result |
| abnormal | BOOLEAN | DEFAULT FALSE | Abnormal flag |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Result time |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

---

# 6. Clinical Documentation & Exams

## 6.1 clinical_examinations

Structured checkbox-style exams (admission workup steps).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Exam id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| examiner_id | UUID | FK → users, NOT NULL | Examiner |
| general_exams | JSONB | NULL | Built, nutrition, skin, head & neck, … |
| local_exams | JSONB | NULL | Inspection, palpation, percussion, auscultation |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Exam time |

## 6.2 clinical_notes

Free-text physician notes (`content` only — SOAP belongs in `follow_ups`).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Note id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| author_id | UUID | FK → users, NOT NULL | Author |
| content | TEXT | NOT NULL | Note body |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Clinical time |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

## 6.3 nursing_notes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Note id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| author_id | UUID | FK → users, NOT NULL | Nurse |
| note | TEXT | NOT NULL | Nursing note |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Clinical time |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

## 6.4 follow_ups

Daily SOAP-style progress documentation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Follow-up id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| author_id | UUID | FK → users, NOT NULL | Author |
| objective | TEXT | NULL | Objective |
| subjective | TEXT | NULL | Subjective |
| assessment | TEXT | NULL | Assessment |
| plan | TEXT | NULL | Plan |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Clinical time |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

## 6.5 medical_documents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Document id |
| admission_id | UUID | FK → admissions, NULL | Admission (null for assistant chat resources — see below) |
| chat_session_id | UUID | FK → ai_chat_sessions, NULL | Chat this file was attached to as a reference resource |
| message_id | UUID | FK → ai_chat_messages, NULL, `ON DELETE SET NULL` | Chat message it was sent with; null while still staged in the composer |
| uploaded_by | UUID | FK → users, NOT NULL | Uploader |
| document_type | VARCHAR(100) | NOT NULL | Category |
| original_filename | VARCHAR(255) | NOT NULL | Original name |
| file_path | TEXT | NULL | Storage path (local storage mode) |
| mime_type | VARCHAR(150) | NULL | Mime type captured at upload; selects the text extractor |
| file_size | INTEGER | NULL | Size in bytes |
| embedding_status | embedding_status | DEFAULT 'PENDING' | RAG pipeline state — see below |
| embedding_error | TEXT | NULL | Human-readable reason for `FAILED` / `SKIPPED` |
| embedding_model | VARCHAR(150) | NULL | Provider + model that produced the chunks |
| chunk_count | INTEGER | DEFAULT 0 | Number of indexed chunks |
| embedded_at | TIMESTAMPTZ | NULL | When indexing last completed |
| is_knowledge_base | BOOLEAN | DEFAULT FALSE | Marks a general knowledge-base document (vs. patient/chat-scoped) |
| storage_type | VARCHAR(50) | DEFAULT 'local' | `local` (DB blob) or `cloudinary` |
| cloudinary_url | TEXT | NULL | Cloudinary secure URL, when `storage_type = 'cloudinary'` |
| cloudinary_public_id | VARCHAR(255) | NULL | Cloudinary asset id, used to delete the original |
| file_content | BYTEA | NULL | Raw file bytes, when `storage_type = 'local'` |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Upload time |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

Exactly one of `admission_id` / `chat_session_id` is set — patient documents belong to an admission, chat resources belong to a Medical Knowledge Assistant chat.

`embedding_status` lifecycle: `PENDING` → `PROCESSING` → `COMPLETED` \| `SKIPPED` \| `FAILED`.
`SKIPPED` means the file carries no extractable text (e.g. a scanned image with no OCR) — retrying will not help. `FAILED` is technical and retryable via `POST /rag/documents/:id/reindex`.

## 6.6 document_embeddings

Written and read exclusively by the RAG pipeline (`src/modules/rag`) using raw SQL — Prisma cannot map the pgvector type.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Chunk id |
| document_id | UUID | FK → medical_documents, NOT NULL | Source doc |
| admission_id | UUID | FK → admissions, NOT NULL | Scope for RAG — every query filters on this |
| chunk_index | INTEGER | DEFAULT 0, UNIQUE with document_id | Position within the document |
| chunk_text | TEXT | NOT NULL | Extracted chunk |
| char_count | INTEGER | DEFAULT 0 | Chunk length |
| embedding_model | VARCHAR(150) | NULL | Provider + model that produced the vector |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Index time |
| embedding | VECTOR(1024) | NOT NULL | Embedding vector |

The vector width must match `EMBEDDING_DIMENSIONS`. 1024 is the native output of both the Bedrock-reachable embedding models (Titan Text Embeddings V2, Cohere Embed v4) and the built-in local provider.

---

# 7. Artificial Intelligence Module

## 7.1 ai_summaries

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Summary id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| requested_by | UUID | FK → users, NOT NULL | Requester |
| summary_type | ai_summary_type | NOT NULL | 24h / on-demand |
| overall_summary | TEXT | NOT NULL | Generated text |
| generated_at | TIMESTAMPTZ | DEFAULT NOW() | Generation time |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

## 7.2 ai_query_logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Query id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| asked_by | UUID | FK → users, NOT NULL | Asker |
| question | TEXT | NOT NULL | User question |
| ai_response | TEXT | NOT NULL | Model answer |
| cited_sources | JSONB | NULL | Source refs |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Query time |

## 7.3 alerts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Alert id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| severity | alert_severity | NOT NULL | P0 / P1 |
| title | VARCHAR(255) | NOT NULL | Alert title |
| triggering_metrics | JSONB | NULL | Trigger values |
| clinical_reasoning | TEXT | NULL | AI reasoning |
| status | alert_status | DEFAULT 'OPEN' | Lifecycle |
| generated_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

## 7.4 alert_reviews

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Review id |
| alert_id | UUID | FK → alerts, NOT NULL, `ON DELETE CASCADE` | Alert |
| reviewer_id | UUID | FK → users, NOT NULL, `ON DELETE CASCADE` | Reviewer |
| review_notes | TEXT | NULL | Clinician notes |
| accepted | BOOLEAN | DEFAULT TRUE | Whether the reviewer accepted the alert's finding |
| reviewed_at | TIMESTAMPTZ | DEFAULT NOW() | Review time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Row creation time |

## 7.5 notifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Notification id |
| user_id | UUID | FK → users, NOT NULL, `ON DELETE CASCADE` | Recipient |
| title | VARCHAR(255) | NOT NULL | Title |
| message | TEXT | NOT NULL | Body |
| type | notification_type | DEFAULT 'INFO' | `INFO` / `ALERT` / `SUMMON` |
| status | notification_status | DEFAULT 'UNREAD' | Read state |
| metadata | JSONB | NULL | Extra structured payload (e.g. deep-link ids) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| updated_at | TIMESTAMPTZ | ON UPDATE NOW() | Last change |

`notification_type` ENUM: `INFO` · `ALERT` · `SUMMON`.

## 7.6 ai_chat_sessions

Named, resumable conversations with the Medical Knowledge Assistant (`mode: "knowledge"`) — separate from the admission-scoped `ai_query_logs`. Owned by one clinician; only the author can list, resume, rename, or delete their chats.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Chat id |
| user_id | UUID | FK → users, NOT NULL, `ON DELETE CASCADE` | Owner |
| title | VARCHAR(120) | NOT NULL | Chat title, defaults to "New chat" then replaced by the first question |
| mode | ai_chat_mode | DEFAULT 'KNOWLEDGE' | `KNOWLEDGE` / `PATIENT` |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| updated_at | TIMESTAMPTZ | ON UPDATE NOW() | Last change |
| last_message_at | TIMESTAMPTZ | NULL | Most recent message time, for sidebar ordering |

`ai_chat_mode` ENUM: `KNOWLEDGE` · `PATIENT`.

## 7.7 ai_chat_messages

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Message id |
| session_id | UUID | FK → ai_chat_sessions, NOT NULL, `ON DELETE CASCADE` | Chat |
| role | ai_chat_role | NOT NULL | `USER` / `ASSISTANT` |
| content | TEXT | NOT NULL | Message text |
| cited_sources | JSONB | NULL | Source refs (assistant messages) |
| retrieval | JSONB | NULL | Retrieval metadata (assistant messages) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Sent at |

`ai_chat_role` ENUM: `USER` · `ASSISTANT`. Files a clinician attaches to a chat are `medical_documents` rows with `chat_session_id` set and, once sent, `message_id` pointing here.

---

# 8. System Management Module

## 8.1 treatment_approvals

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Approval id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| requested_by | UUID | FK → users, NOT NULL | Requesting clinician |
| approved_by | UUID | FK → users | Approving specialist |
| treatment_name | VARCHAR(255) | NOT NULL | Treatment |
| clinical_justification | TEXT | NULL | Justification |
| approval_status | BOOLEAN | NULL | Approved / rejected |
| requested_at | TIMESTAMPTZ | DEFAULT NOW() | Request time |
| approved_at | TIMESTAMPTZ | NULL | Decision time |
| execution_status | treatment_execution_status | DEFAULT 'NOT_STARTED' | Bedside execution state |
| started_by | UUID | FK → users | Nurse who started the treatment |
| started_at | TIMESTAMPTZ | NULL | Execution start time |
| completed_by | UUID | FK → users | Nurse who completed the treatment |
| completed_at | TIMESTAMPTZ | NULL | Execution completion time |
| execution_notes | TEXT | NULL | Bedside notes from the nurse |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft-delete flag (withdrawn request) |
| archived_at | TIMESTAMPTZ | NULL | Withdrawal time |

`treatment_execution_status` ENUM: `NOT_STARTED` · `IN_PROGRESS` · `COMPLETED` (forward-only).

There is **no** `system_settings` table in the current ERD.

---

# 9. Constraints, Indexes & Data Dictionary

## 9.1 Referential integrity (from ERD)

```text
users ← login_attempts, refresh_tokens, audit_logs, notifications, password_reset_requests
users ← admissions.doctor_id, admission_nurses.nurse_id, diagnoses.diagnosed_by
users ← vital_signs.recorded_by, medications.prescribed_by,
        medication_administrations.administered_by,
        investigation_orders.ordered_by, lab_results.recorded_by
users ← nursing_notes.author_id, follow_ups.author_id,
        clinical_examinations.examiner_id, clinical_notes.author_id,
        medical_documents.uploaded_by, ai_summaries.requested_by,
        ai_query_logs.asked_by, alert_reviews.reviewer_id,
        treatment_approvals.approved_by, ai_chat_sessions.user_id

patients ← admissions, allergies, medical_histories
beds ← admissions
admissions ← admission_nurses, diagnoses, vital_signs, medications,
             investigation_orders, lab_results, nursing_notes, follow_ups,
             clinical_examinations, clinical_notes, medical_documents,
             document_embeddings, ai_summaries, ai_query_logs, alerts,
             treatment_approvals
diagnoses ← diagnosis_acknowledgements, diagnosis_concerns
medications ← medication_administrations
medical_documents ← document_embeddings
ai_chat_sessions ← ai_chat_messages, medical_documents (chat resources)
alerts ← alert_reviews
```

Parent deletes use `RESTRICT` for clinical parents; user FKs on audit/login may use `SET NULL`.

## 9.2 Unique & partial constraints

```sql
UNIQUE (users.email)
UNIQUE (patients.mrn)
UNIQUE (beds.bed_number)

CREATE UNIQUE INDEX uq_active_bed
  ON admissions(bed_id)
  WHERE status = 'ACTIVE';
```

## 9.3 Recommended indexes

```sql
-- Lookups
CREATE INDEX idx_patients_mrn ON patients(mrn);
CREATE INDEX idx_admissions_patient ON admissions(patient_id);
CREATE INDEX idx_admissions_status ON admissions(status);
CREATE INDEX idx_admissions_doctor ON admissions(doctor_id);
CREATE INDEX idx_vitals_admission_time ON vital_signs(admission_id, recorded_at DESC);
CREATE INDEX idx_labs_admission ON lab_results(admission_id, recorded_at DESC);
CREATE INDEX idx_meds_admission ON medications(admission_id) WHERE is_active = TRUE;
CREATE INDEX idx_alerts_open ON alerts(admission_id) WHERE status = 'OPEN';
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE status = 'UNREAD';
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- Vectors (HNSW — better recall than ivfflat at ICU-scale corpora, and needs no
-- training pass, so it works from the first inserted row)
CREATE INDEX document_embeddings_embedding_hnsw_idx
  ON document_embeddings USING hnsw (embedding vector_cosine_ops);
```

## 9.4 Soft-delete tables

patients, allergies, admissions, admission_nurses, diagnoses, vital_signs, medications, medication_administrations, lab_results, clinical_notes, nursing_notes, follow_ups, medical_documents, ai_summaries, alerts, treatment_approvals.

## 9.5 Data dictionary summary

| Category | Tables |
|----------|--------|
| Auth & Security | users, login_attempts, refresh_tokens, audit_logs, password_reset_requests |
| Core Clinical | patients, medical_histories, allergies, beds, admissions, admission_nurses, diagnoses, diagnosis_acknowledgements, diagnosis_concerns |
| Clinical Recording | vital_signs, medications, medication_administrations, investigation_orders, lab_results |
| Clinical Documentation | clinical_examinations, clinical_notes, nursing_notes, follow_ups, medical_documents, document_embeddings |
| AI | ai_summaries, ai_query_logs, ai_chat_sessions, ai_chat_messages, alerts, alert_reviews, notifications |
| System | treatment_approvals |

| Metric | Value |
|--------|------:|
| Tables | 34 |
| Soft-delete tables | 16 |
| pgvector columns | 1 (`document_embeddings.embedding`) |
| JSONB clinical columns | medical_histories.past_diseases / inherited_diseases / menstrual_history / obstetric_history / custom_fields, admissions.previous_investigations, clinical_examinations.*, alerts.triggering_metrics, ai_query_logs.cited_sources, ai_chat_messages.cited_sources / retrieval, notifications.metadata, audit_logs old/new |

---

# Design Summary

Schema v2.0 is normalized, admission-scoped, soft-delete aware, and aligned to the current ERD: structured medical history and examinations, SOAP follow-ups, simplified vitals (`pulse` + BP + RR + SpO2 + temperature), investigation orders, and AI/RAG support via pgvector — without fluid I/O or system_settings tables. Since v2.0, the schema has grown to cover a fuller diagnosis workflow (typed diagnoses, nurse acknowledgements, and nurse-raised concerns), richer medication ordering (frequency/route enums, allergy acknowledgement, discontinue tracking), a login-attempt and account-lockout audit trail, an in-app assisted password reset workflow, and saved Medical Knowledge Assistant chat sessions with attachable reference documents.
