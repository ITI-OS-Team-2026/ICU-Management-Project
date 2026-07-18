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
users ──┬── login_attempts / refresh_tokens / audit_logs / notifications
        │
patients ── medical_histories / allergies
        │
        └── admissions ── beds, doctor (users), admission_nurses
                 │
                 ├── diagnoses, vital_signs, medications → medication_administrations
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
  'PROVISIONAL', 'CONFIRMED', 'RESOLVED', 'RULED_OUT'
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

## 3.2 login_attempts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Attempt id |
| user_id | UUID | FK → users | Nullable if email unknown |
| success | BOOLEAN | NOT NULL | Login result |
| ip_address | VARCHAR(45) | NULL | Client IP |
| attempted_at | TIMESTAMPTZ | DEFAULT NOW() | When attempted |

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
| user_id | UUID | FK → users | Actor |
| action | VARCHAR(100) | NOT NULL | Action type |
| target_table | VARCHAR(100) | NOT NULL | Affected table |
| old_values | JSONB | NULL | Before snapshot |
| new_values | JSONB | NULL | After snapshot |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Event time |

Append-only. Never update or delete audit rows.

**Relationships:** `users.id` → `login_attempts`, `refresh_tokens`, `audit_logs`, `notifications`.

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
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

## 4.2 medical_histories

Patient-scoped structured history (one logical history record per patient; enforce uniqueness in application or with `UNIQUE(patient_id)` if 1:1 is required).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | History id |
| patient_id | UUID | FK → patients, NOT NULL | Patient |
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
| admission_reason | TEXT | NULL | Reason for ICU |
| place_of_transfer | TEXT | NULL | Transfer origin |
| transfer_doctor_name | TEXT | NULL | Referring doctor name |
| chief_complaint | TEXT | NULL | Chief complaint |
| symptoms_related_system | TEXT | NULL | System-related symptoms |
| symptoms_other_systems | TEXT | NULL | Other symptoms |
| previous_investigations | TEXT | NULL | Prior investigations |
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

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Diagnosis id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| condition_name | TEXT | NOT NULL | Condition |
| status | diagnosis_status | NOT NULL | Diagnosis state |
| diagnosed_by | UUID | FK → users, NOT NULL | Clinician |
| diagnosed_at | TIMESTAMPTZ | DEFAULT NOW() | When diagnosed |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

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
| prescribed_by | UUID | FK → users, NOT NULL | Prescriber |
| drug_name | VARCHAR(200) | NOT NULL | Drug |
| dosage | VARCHAR(100) | NOT NULL | Dose |
| frequency | VARCHAR(100) | NOT NULL | Frequency |
| start_date | TIMESTAMPTZ | NULL | Start |
| end_date | TIMESTAMPTZ | NULL | End |
| prescribed_at | TIMESTAMPTZ | DEFAULT NOW() | Order time |
| is_active | BOOLEAN | DEFAULT TRUE | Still active |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

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
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| uploaded_by | UUID | FK → users, NOT NULL | Uploader |
| document_type | VARCHAR(100) | NOT NULL | Category |
| original_filename | VARCHAR(255) | NOT NULL | Original name |
| file_path | TEXT | NOT NULL | Storage path |
| embedding_status | embedding_status | DEFAULT 'PENDING' | AI pipeline state |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Upload time |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive time |

## 6.6 document_embeddings

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Chunk id |
| document_id | UUID | FK → medical_documents, NOT NULL | Source doc |
| admission_id | UUID | FK → admissions, NOT NULL | Scope for RAG |
| chunk_text | TEXT | NOT NULL | Extracted chunk |
| embedding | VECTOR(768) | NOT NULL | Embedding vector |

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
| alert_id | UUID | FK → alerts, NOT NULL | Alert |
| reviewer_id | UUID | FK → users, NOT NULL | Reviewer |
| review_notes | TEXT | NULL | Clinician notes |
| accepted | BOOLEAN | NULL | Accepted? |
| reviewed_at | TIMESTAMPTZ | DEFAULT NOW() | Review time |

## 7.5 notifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Notification id |
| user_id | UUID | FK → users, NOT NULL | Recipient |
| title | VARCHAR(255) | NOT NULL | Title |
| message | TEXT | NOT NULL | Body |
| status | notification_status | DEFAULT 'UNREAD' | Read state |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |

---

# 8. System Management Module

## 8.1 treatment_approvals

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Approval id |
| admission_id | UUID | FK → admissions, NOT NULL | Admission |
| approved_by | UUID | FK → users | Approving specialist |
| treatment_name | VARCHAR(255) | NOT NULL | Treatment |
| clinical_justification | TEXT | NULL | Justification |
| approval_status | BOOLEAN | NULL | Approved / rejected |
| requested_at | TIMESTAMPTZ | DEFAULT NOW() | Request time |
| approved_at | TIMESTAMPTZ | NULL | Decision time |

There is **no** `system_settings` table in the current ERD.

---

# 9. Constraints, Indexes & Data Dictionary

## 9.1 Referential integrity (from ERD)

```text
users ← login_attempts, refresh_tokens, audit_logs, notifications
users ← admissions.doctor_id, admission_nurses.nurse_id, diagnoses.diagnosed_by
users ← vital_signs.recorded_by, medications.prescribed_by,
        medication_administrations.administered_by,
        investigation_orders.ordered_by, lab_results.recorded_by
users ← nursing_notes.author_id, follow_ups.author_id,
        clinical_examinations.examiner_id, clinical_notes.author_id,
        medical_documents.uploaded_by, ai_summaries.requested_by,
        ai_query_logs.asked_by, alert_reviews.reviewer_id,
        treatment_approvals.approved_by

patients ← admissions, allergies, medical_histories
beds ← admissions
admissions ← admission_nurses, diagnoses, vital_signs, medications,
             investigation_orders, lab_results, nursing_notes, follow_ups,
             clinical_examinations, clinical_notes, medical_documents,
             document_embeddings, ai_summaries, ai_query_logs, alerts,
             treatment_approvals
medications ← medication_administrations
medical_documents ← document_embeddings
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

-- Vectors
CREATE INDEX idx_document_embeddings_vector
  ON document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## 9.4 Soft-delete tables

patients, allergies, admissions, admission_nurses, diagnoses, vital_signs, medications, medication_administrations, lab_results, clinical_notes, nursing_notes, follow_ups, medical_documents, ai_summaries, alerts.

## 9.5 Data dictionary summary

| Category | Tables |
|----------|--------|
| Auth & Security | users, login_attempts, refresh_tokens, audit_logs |
| Core Clinical | patients, medical_histories, allergies, beds, admissions, admission_nurses, diagnoses |
| Clinical Recording | vital_signs, medications, medication_administrations, investigation_orders, lab_results |
| Clinical Documentation | clinical_examinations, clinical_notes, nursing_notes, follow_ups, medical_documents, document_embeddings |
| AI | ai_summaries, ai_query_logs, alerts, alert_reviews, notifications |
| System | treatment_approvals |

| Metric | Value |
|--------|------:|
| Tables | 28 |
| Soft-delete tables | 15 |
| pgvector columns | 1 (`document_embeddings.embedding`) |
| JSONB clinical columns | medical_histories.past_diseases / inherited_diseases, clinical_examinations.*, alerts.triggering_metrics, ai_query_logs.cited_sources, audit_logs old/new |

---

# Design Summary

Schema v2.0 is normalized, admission-scoped, soft-delete aware, and aligned to the current ERD: structured medical history and examinations, SOAP follow-ups, simplified vitals (`pulse` + BP + RR + SpO2 + temperature), investigation orders, and AI/RAG support via pgvector — without fluid I/O or system_settings tables.
