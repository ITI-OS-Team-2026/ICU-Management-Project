# Database Schema

# SmartCare ICU
### AI-Powered Intensive Care Unit (ICU) Management and Clinical Decision Support System

---

## Document Information

| Item | Value |
|------|-------|
| Document | Database Schema |
| Project | SmartCare ICU |
| Version | 1.0 |
| Database | PostgreSQL 16+ |
| ORM | Prisma ORM / Drizzle ORM |
| Architecture | Relational Database (3NF) |
| Vector Extension | pgvector |
| UUID Strategy | UUID v4 |
| Status | MVP Baseline |

---

# Table of Contents

1. **Introduction**
   - 1.1 Purpose
   - 1.2 Scope
   - 1.3 Design Principles

2. **Database Technology Stack**
   - 2.1 Database Management System
   - 2.2 PostgreSQL Extensions
   - 2.3 Database Features

3. **Database Foundation**
   - 3.1 Naming Conventions
   - 3.2 PostgreSQL ENUM Types
   - 3.3 Common Design Standards

4. **Core Clinical Data Model**
   - 4.1 patients
   - 4.2 beds
   - 4.3 admissions

5. **Clinical Recording Module**
   - 5.1 vital_signs
   - 5.2 fluid_records
   - 5.3 medications
   - 5.4 medication_administrations
   - 5.5 lab_results

6. **Clinical Documentation Module**
   - 6.1 nursing_notes
   - 6.2 clinical_notes
   - 6.3 medical_documents
   - 6.4 document_embeddings

7. **Artificial Intelligence Module**
   - 7.1 ai_summaries
   - 7.2 ai_query_logs
   - 7.3 alerts
   - 7.4 alert_reviews
   - 7.5 notifications

8. **System Management Module**
   - 8.1 treatment_approvals
   - 8.2 system_settings

9. **Database Constraints & Integrity Rules**
   - 9.1 Primary Key Rules
   - 9.2 Foreign Key Constraints
   - 9.3 Referential Actions
   - 9.4 Unique Constraints
   - 9.5 CHECK Constraints
   - 9.6 NOT NULL Rules
   - 9.7 Default Values
   - 9.8 Soft Delete Rules
   - 9.9 Timestamp Rules
   - 9.10 JSONB Usage
   - 9.11 Data Retention Policy
   - 9.12 Integrity Rules Summary

10. **Database Indexing & Performance Strategy**
    - 10.1 Indexing Strategy
    - 10.2 Standard B-Tree Indexes
    - 10.3 Composite Indexes
    - 10.4 Partial Indexes
    - 10.5 JSONB Indexes
    - 10.6 pgvector Index
    - 10.7 Full-Text Search
    - 10.8 Expected Query Performance
    - 10.9 Query Optimization Guidelines
    - 10.10 Table Partitioning
    - 10.11 Performance Monitoring
    - 10.12 Backup & Recovery Recommendations

11. **Complete Database Data Dictionary**
    - 11.1 Database Summary
    - 11.2 Authentication & Security Tables
    - 11.3 Core Clinical Tables
    - 11.4 Clinical Recording Tables
    - 11.5 Clinical Documentation Tables
    - 11.6 Artificial Intelligence Tables
    - 11.7 System Management Tables
    - 11.8 Database Statistics
    - 11.9 Database Design Summary

---

# 1. Database Overview

## 1.1 Purpose

This document defines the complete database schema for the SmartCare ICU system. It specifies the structure of every database object required to support the ICU workflow, including patient management, clinical documentation, AI-powered decision support, audit logging, and role-based access control.

The schema is designed directly from the Project Proposal, Software Requirements Specification (SRS), Software Development Life Cycle (SDLC), and System Flow documents. Every table, relationship, and constraint is intended to satisfy one or more functional requirements described within those documents.

This document serves as the implementation reference for backend developers, database administrators, and future system maintainers.

---

# 1.2 Database Objectives

The database has been designed to satisfy the following objectives:

- Maintain complete patient information throughout multiple ICU admissions.
- Prevent data duplication through normalization.
- Preserve historical clinical records permanently.
- Support secure role-based access control.
- Store all clinical activities with immutable audit trails.
- Provide efficient retrieval of patient history.
- Support AI-powered Retrieval-Augmented Generation (RAG).
- Enable autonomous monitoring and alert generation.
- Support high-performance querying for dashboards.
- Allow future expansion without structural redesign.

---

# 1.3 Database Management System

The system uses PostgreSQL as its primary relational database management system.

### Reasons for Choosing PostgreSQL

- ACID compliant transactions
- Excellent support for relational integrity
- Native JSONB support
- Advanced indexing
- Full-text search
- pgvector extension for AI embeddings
- Strong security model
- Mature ecosystem
- Excellent Prisma/Drizzle support

---

# 1.4 PostgreSQL Extensions

The following extensions are required before creating the database.

| Extension | Purpose |
|------------|----------|
| uuid-ossp | Generate UUID primary keys |
| pgcrypto | UUID generation and cryptographic functions |
| vector | AI embedding storage (pgvector) |
| pg_trgm | Fast fuzzy searching |
| btree_gin | Advanced indexing |
| citext | Case-insensitive email storage |

Example:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS citext;
```

---

# 1.5 Database Design Principles

The database follows several fundamental design principles.

## Normalization

The schema is normalized to Third Normal Form (3NF).

Benefits include:

- No duplicated clinical information
- Reduced storage requirements
- Simplified updates
- Improved consistency
- Better scalability

---

## UUID Primary Keys

Every table uses UUID version 4 as its primary key.

Advantages:

- Globally unique identifiers
- Better security than sequential integers
- Safe distributed generation
- Easier data synchronization

Example

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

---

## Admission-Centered Design

The database is designed around **Admissions**, not Patients.

Reason:

A patient may visit the ICU multiple times throughout their life.

Incorrect:

```
Patient
    └── Vitals
```

Correct:

```
Patient
    └── Admission #1
            ├──Vitals
            ├──Notes
            ├──Documents

    └── Admission #2
            ├──Vitals
            ├──Notes
            ├──Documents
```

This preserves historical ICU stays without mixing clinical records between visits.

---

## Immutable Clinical History

Clinical information must never be permanently deleted.

Instead of deleting records:

```text
DELETE ❌
```

the system archives them using:

```text
is_archived = true
archived_at = timestamp
```

This satisfies legal and clinical audit requirements.

---

## Auditability

Every write operation generates an audit log.

Examples include:

- Login
- Patient creation
- Admission
- Vitals entry
- Medication administration
- Document upload
- AI query
- AI summary
- Alert review
- Treatment approval
- Patient discharge

Each audit record stores:

- User
- Action
- Target table
- Target record
- Timestamp
- IP address
- Previous values
- New values

No audit record may ever be modified or deleted.

---

## AI-Ready Architecture

Unlike traditional hospital databases, SmartCare ICU includes native support for Artificial Intelligence.

Dedicated structures exist for:

- Document chunking
- Vector embeddings
- AI summaries
- RAG query history
- AI reasoning
- Autonomous alerts

This allows the database to support semantic retrieval using pgvector.

---

## Security by Design

The database enforces security through multiple layers.

### Role-Based Access Control

Supported roles:

- System Administrator
- ICU Nurse
- Medical Resident
- ICU Specialist

Permissions are enforced by the backend while the database preserves ownership relationships.

---

### Soft Deletion

Clinical records are archived instead of deleted.

Every clinical table contains:

- is_archived
- archived_at
- archived_by

---

### Referential Integrity

Foreign key constraints guarantee that:

- Vitals cannot exist without an admission.
- Notes cannot exist without an admission.
- Alerts cannot exist without an admission.
- Documents cannot exist without an admission.
- Embeddings cannot exist without documents.

---

### Server-Generated Timestamps

Clinical timestamps always originate from the backend server.

Client timestamps are never trusted.

---

# 1.6 Naming Conventions

The database follows consistent naming conventions.

## Tables

Plural, snake_case

Examples

```
users
patients
admissions
vital_signs
fluid_records
medical_documents
```

---

## Columns

Lowercase snake_case

Examples

```
patient_id
created_at
updated_at
recorded_by
heart_rate
blood_type
```

---

## Primary Keys

Every table

```
id
```

---

## Foreign Keys

Named after referenced table

Examples

```
patient_id
admission_id
user_id
bed_id
document_id
alert_id
```

---

## Indexes

Prefix:

```
idx_
```

Examples

```
idx_patient_mrn
idx_vitals_timestamp
idx_alert_status
idx_document_embedding
```

---

## Unique Constraints

Prefix:

```
uq_
```

Examples

```
uq_users_email
uq_patients_mrn
```

---

## Foreign Keys

Prefix:

```
fk_
```

Example

```
fk_vitals_admission
```

---

# 1.7 High-Level Database Architecture

```text
                    Users
                      │
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   Audit Logs    Notifications   Login Attempts
                      │
                  Admissions
                      │
                  Patients
                      │
        ┌─────────────┼────────────────────────────────────┐
        │             │            │            │           │
   Vital Signs   Fluid Records  Medications  Documents  Notes
                                              │
                                        Embeddings
                                              │
                                    AI Retrieval Engine
                                              │
                             AI Summaries / Alerts / RAG
```

---

# 2. PostgreSQL Data Types & ENUM Definitions

To ensure data consistency, readability, and maintainability, SmartCare ICU uses PostgreSQL ENUM types for all fields with predefined values. This prevents invalid values from being stored and simplifies backend validation.

---

# 2.1 User Role

Defines the role assigned to every system user.

```sql
CREATE TYPE user_role AS ENUM (
    'SYSTEM_ADMIN',
    'ICU_NURSE',
    'MEDICAL_RESIDENT',
    'ICU_SPECIALIST'
);
```

Used In

- users.role

Business Rules

- Every user must have exactly one role.
- Roles cannot be NULL.
- Role determines API authorization.

---

# 2.2 User Status

Determines whether an account can access the system.

```sql
CREATE TYPE user_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'LOCKED',
    'SUSPENDED'
);
```

Used In

- users.status

Business Rules

- LOCKED after repeated failed logins.
- SUSPENDED is set manually by an administrator.
- Only ACTIVE users may authenticate.

---

# 2.3 Gender

```sql
CREATE TYPE gender AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER'
);
```

Used In

- patients.gender

---

# 2.4 Blood Type

```sql
CREATE TYPE blood_type AS ENUM (
'A+',
'A-',
'B+',
'B-',
'AB+',
'AB-',
'O+',
'O-'
);
```

Used In

- patients.blood_type

---

# 2.5 Code Status

Represents a patient's resuscitation preference.

```sql
CREATE TYPE code_status AS ENUM (
    'FULL_CODE',
    'DNR',
    'DNI',
    'COMFORT_CARE'
);
```

Used In

- admissions.code_status

---

# 2.6 Admission Status

Represents the lifecycle of an ICU admission.

```sql
CREATE TYPE admission_status AS ENUM (
    'ACTIVE',
    'DISCHARGED',
    'ARCHIVED'
);
```

Used In

- admissions.status

Business Rules

ACTIVE

- Accepts new clinical records.

DISCHARGED

- Read-only.
- No new vitals.
- No new notes.
- No new medications.

ARCHIVED

- Hidden from normal queries.

---

# 2.7 Bed Status

```sql
CREATE TYPE bed_status AS ENUM (
    'AVAILABLE',
    'OCCUPIED',
    'MAINTENANCE'
);
```

Used In

- beds.status

Business Rules

AVAILABLE

Bed can receive new admission.

OCCUPIED

Bed linked to one ACTIVE admission.

MAINTENANCE

Cannot receive patients.

---

# 2.8 Vital Source

Tracks where vitals originated.

```sql
CREATE TYPE vital_source AS ENUM (
    'MANUAL',
    'DEVICE',
    'IMPORTED'
);
```

Used In

- vital_signs.source

For MVP:

Only MANUAL is expected.

---

# 2.9 Fluid Type

```sql
CREATE TYPE fluid_type AS ENUM (
    'IV',
    'ENTERAL',
    'ORAL',
    'URINE',
    'DRAIN',
    'BLOOD_LOSS',
    'OTHER'
);
```

Used In

- fluid_records.type

---

# 2.10 Fluid Direction

```sql
CREATE TYPE fluid_direction AS ENUM (
    'INTAKE',
    'OUTPUT'
);
```

Used In

- fluid_records.direction

---

# 2.11 Medication Route

```sql
CREATE TYPE medication_route AS ENUM (
    'IV',
    'IM',
    'SC',
    'PO',
    'NG',
    'PR',
    'TOPICAL',
    'INHALATION'
);
```

Used In

- medications.route

---

# 2.12 Medication Frequency

```sql
CREATE TYPE medication_frequency AS ENUM (
    'ONCE',
    'BID',
    'TID',
    'QID',
    'Q4H',
    'Q6H',
    'Q8H',
    'Q12H',
    'DAILY',
    'PRN'
);
```

Used In

- medications.frequency

---

# 2.13 Laboratory Category

```sql
CREATE TYPE lab_category AS ENUM (
    'CBC',
    'CHEMISTRY',
    'ABG',
    'COAGULATION',
    'MICROBIOLOGY',
    'IMMUNOLOGY',
    'OTHER'
);
```

Used In

- lab_results.category

---

# 2.14 Document Type

```sql
CREATE TYPE document_type AS ENUM (
    'LAB_REPORT',
    'RADIOLOGY',
    'ECG',
    'PRESCRIPTION',
    'CONSULTATION',
    'DISCHARGE_REPORT',
    'OTHER'
);
```

Used In

- medical_documents.document_type

---

# 2.15 Note Type

```sql
CREATE TYPE note_type AS ENUM (
    'NURSING',
    'CLINICAL',
    'PROGRESS',
    'SHIFT_HANDOVER'
);
```

Used In

- nursing_notes.note_type
- clinical_notes.note_type

---

# 2.16 Alert Severity

```sql
CREATE TYPE alert_severity AS ENUM (
    'P0',
    'P1'
);
```

Meaning

P0

Critical emergency.

Immediate intervention required.

P1

Clinical warning.

Needs review.

Used In

- alerts.severity

---

# 2.17 Alert Status

```sql
CREATE TYPE alert_status AS ENUM (
    'OPEN',
    'REVIEWED',
    'RESOLVED'
);
```

Used In

- alerts.status

Business Rules

OPEN

Visible on dashboard.

REVIEWED

Resident/Specialist acknowledged.

RESOLVED

Clinical issue completed.

---

# 2.18 Notification Status

```sql
CREATE TYPE notification_status AS ENUM (
    'UNREAD',
    'READ'
);
```

Used In

- notifications.status

---

# 2.19 AI Summary Type

```sql
CREATE TYPE ai_summary_type AS ENUM (
    '24_HOUR',
    'ON_DEMAND'
);
```

Used In

- ai_summaries.summary_type

---

# 2.20 AI Query Status

```sql
CREATE TYPE ai_query_status AS ENUM (
    'SUCCESS',
    'FAILED',
    'TIMEOUT',
    'INSUFFICIENT_DATA'
);
```

Used In

- ai_query_logs.status

---

# 2.21 Audit Action

```sql
CREATE TYPE audit_action AS ENUM (
'LOGIN',
'LOGOUT',
'CREATE',
'UPDATE',
'ARCHIVE',
'VIEW',
'QUERY_RAG',
'GENERATE_SUMMARY',
'GENERATE_ALERT',
'REVIEW_ALERT',
'APPROVE_TREATMENT',
'DISCHARGE_PATIENT'
);
```

Used In

- audit_logs.action

---

# 2.22 Authentication Provider

```sql
CREATE TYPE auth_provider AS ENUM (
    'LOCAL'
);
```

Future versions may include:

- LDAP
- OAuth
- Hospital SSO

---

# 2.23 File Storage Provider

```sql
CREATE TYPE storage_provider AS ENUM (
    'LOCAL',
    'AWS_S3',
    'AZURE_BLOB'
);
```

For MVP

LOCAL storage is used.

---

# 2.24 Embedding Status

```sql
CREATE TYPE embedding_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);
```

Used In

- medical_documents.embedding_status

This allows asynchronous embedding generation after document upload.

---

# ENUM Summary

| ENUM | Used By |
|-------|----------|
| user_role | users |
| user_status | users |
| gender | patients |
| blood_type | patients |
| code_status | admissions |
| admission_status | admissions |
| bed_status | beds |
| vital_source | vital_signs |
| fluid_type | fluid_records |
| fluid_direction | fluid_records |
| medication_route | medications |
| medication_frequency | medications |
| lab_category | lab_results |
| document_type | medical_documents |
| note_type | nursing_notes, clinical_notes |
| alert_severity | alerts |
| alert_status | alerts |
| notification_status | notifications |
| ai_summary_type | ai_summaries |
| ai_query_status | ai_query_logs |
| audit_action | audit_logs |
| auth_provider | users |
| storage_provider | medical_documents |
| embedding_status | medical_documents |

---

---

# 3. Security & Authentication Schema

This section defines the database objects responsible for user authentication, authorization, login security, and audit logging.

The authentication module satisfies the following requirements:

- FR-1.1 Secure Authentication
- Role-Based Access Control (RBAC)
- Account Lockout
- Session Management
- Immutable Audit Logging

The module consists of four tables:

1. users
2. login_attempts
3. refresh_tokens (optional but recommended)
4. audit_logs

---

# 3.1 users

## Purpose

The **users** table stores all authenticated users who can access the SmartCare ICU system.

Each record represents one healthcare professional or administrator.

Only authenticated users may perform actions inside the system.

---

## Table Definition

| Column | Type | Constraints | Description |
|----------|------|------------|-------------|
| id | UUID | PK, NOT NULL | Unique user identifier |
| first_name | VARCHAR(100) | NOT NULL | User first name |
| last_name | VARCHAR(100) | NOT NULL | User last name |
| email | CITEXT | UNIQUE, NOT NULL | Login email |
| password_hash | TEXT | NOT NULL | Bcrypt hashed password |
| role | user_role | NOT NULL | User role |
| status | user_status | DEFAULT 'ACTIVE' | Account status |
| auth_provider | auth_provider | DEFAULT 'LOCAL' | Authentication provider |
| phone | VARCHAR(25) | NULL | Contact number |
| profile_image | TEXT | NULL | Avatar URL |
| last_login | TIMESTAMPTZ | NULL | Last successful login |
| failed_login_attempts | INTEGER | DEFAULT 0 | Failed login counter |
| locked_until | TIMESTAMPTZ | NULL | Temporary account lock expiry |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification |

---

## Primary Key

```sql
PRIMARY KEY (id)
```

---

## Unique Constraints

```sql
UNIQUE(email)
```

---

## Indexes

```sql
CREATE INDEX idx_users_role
ON users(role);

CREATE INDEX idx_users_status
ON users(status);

CREATE INDEX idx_users_email
ON users(email);
```

---

## Relationships

```
User

1 ---- N Admissions (attending specialist)

1 ---- N Vital Signs

1 ---- N Nursing Notes

1 ---- N Clinical Notes

1 ---- N Medication Administrations

1 ---- N Audit Logs

1 ---- N AI Queries

1 ---- N AI Summaries

1 ---- N Alert Reviews

1 ---- N Notifications
```

---

## Business Rules

### Email

- Must be unique.
- Case insensitive.
- Cannot change without administrator approval.

---

### Password

Passwords are never stored.

Only bcrypt hashes are stored.

Example:

```
$2b$12$............
```

---

### Role

Exactly one role must exist.

Possible values

```
SYSTEM_ADMIN

ICU_NURSE

MEDICAL_RESIDENT

ICU_SPECIALIST
```

---

### Account Lock

If

```
failed_login_attempts >= 5
```

then

```
locked_until = NOW() + 15 minutes
```

Login requests are rejected until expiration.

---

## Example Record

| Field | Value |
|-------|-------|
| id | UUID |
| first_name | Ahmed |
| last_name | Hassan |
| email | ahmed@hospital.com |
| role | ICU_SPECIALIST |
| status | ACTIVE |

---

# 3.2 login_attempts

## Purpose

Tracks every authentication attempt.

Supports

- Account lockout
- Security auditing
- Intrusion detection

---

## Table Definition

| Column | Type | Constraints | Description |
|----------|------|------------|-------------|
| id | UUID | PK | Login attempt |
| user_id | UUID | FK -> users | Nullable if email doesn't exist |
| email | CITEXT | NOT NULL | Submitted email |
| ip_address | INET | NOT NULL | Client IP |
| user_agent | TEXT | NULL | Browser/device |
| success | BOOLEAN | NOT NULL | Login result |
| failure_reason | TEXT | NULL | Invalid password, locked account, etc. |
| attempted_at | TIMESTAMPTZ | DEFAULT NOW() | Attempt timestamp |

---

## Foreign Keys

```sql
FOREIGN KEY(user_id)
REFERENCES users(id)
ON DELETE SET NULL
```

---

## Indexes

```sql
idx_login_email

idx_login_timestamp

idx_login_success
```

---

## Business Rules

Every login attempt

Successful or failed

must be recorded.

---

# 3.3 refresh_tokens

## Purpose

Stores refresh tokens for long-lived authenticated sessions.

Although the MVP primarily uses a 12-hour JWT in an HttpOnly cookie, storing refresh tokens enables secure session renewal, explicit logout from individual devices, and future support for multi-device authentication.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Token ID |
| user_id | UUID | FK -> users | Token owner |
| token_hash | TEXT | UNIQUE | Hashed refresh token |
| expires_at | TIMESTAMPTZ | NOT NULL | Expiration date |
| revoked_at | TIMESTAMPTZ | NULL | Revocation timestamp |
| ip_address | INET | NULL | Device IP |
| user_agent | TEXT | NULL | Browser/device |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

---

## Business Rules

- Refresh tokens are hashed before storage.
- Revoked tokens cannot be reused.
- Expired tokens are rejected.
- A user may have multiple active sessions (e.g., workstation + tablet).

---

# 3.4 audit_logs

## Purpose

Stores an immutable history of every significant action performed in the system.

This table is the foundation of legal accountability, clinical traceability, and compliance.

Every CREATE, UPDATE, ARCHIVE, AI action, login, and approval generates one audit log entry.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Audit entry ID |
| user_id | UUID | FK -> users | User who performed the action |
| action | audit_action | NOT NULL | Action type |
| target_table | VARCHAR(100) | NOT NULL | Affected table |
| target_id | UUID | NULL | Affected record |
| old_values | JSONB | NULL | Snapshot before update |
| new_values | JSONB | NULL | Snapshot after update |
| ip_address | INET | NULL | Client IP |
| user_agent | TEXT | NULL | Browser/device |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Event timestamp |

---

## Foreign Keys

```sql
FOREIGN KEY(user_id)
REFERENCES users(id)
ON DELETE SET NULL
```

---

## Indexes

```sql
CREATE INDEX idx_audit_user
ON audit_logs(user_id);

CREATE INDEX idx_audit_action
ON audit_logs(action);

CREATE INDEX idx_audit_table
ON audit_logs(target_table);

CREATE INDEX idx_audit_timestamp
ON audit_logs(created_at DESC);
```

---

## Business Rules

- Audit records are append-only.
- UPDATE and DELETE operations on this table are prohibited.
- Audit entries are written in the same database transaction as the original action.
- If audit logging fails, the original operation must be rolled back.
- System-generated actions (e.g., monitoring agent alerts) use a dedicated system actor or service account.

---

## Module Relationships

```text
users
│
├── login_attempts
├── refresh_tokens
├── audit_logs
├── admissions
├── vital_signs
├── nursing_notes
├── clinical_notes
├── medication_administrations
├── ai_query_logs
├── ai_summaries
├── alert_reviews
└── notifications
```

---

---

# 4. Core Clinical Data Model

The Core Clinical Data Model is the foundation of SmartCare ICU. Every clinical record in the system is associated with an **ICU admission**, not directly with a patient. This design preserves the complete history of patients who are admitted to the ICU multiple times throughout their lives.

The core module consists of three primary entities:

1. patients
2. beds
3. admissions

Every other clinical table (vitals, medications, notes, documents, alerts, AI summaries, etc.) references the **admissions** table.

---

# 4.1 patients

## Purpose

Stores permanent demographic information for each patient.

A patient is created only once and may have multiple ICU admissions over time.

This table **never stores admission-specific clinical information**.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Patient identifier |
| mrn | VARCHAR(50) | UNIQUE, NOT NULL | Medical Record Number |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| date_of_birth | DATE | NOT NULL | Date of birth |
| gender | gender | NOT NULL | Patient gender |
| blood_type | blood_type | NULL | Blood group |
| national_id | VARCHAR(50) | NULL | Government ID |
| phone | VARCHAR(30) | NULL | Contact number |
| emergency_contact_name | VARCHAR(150) | NULL | Emergency contact |
| emergency_contact_phone | VARCHAR(30) | NULL | Emergency phone |
| allergies | TEXT | NULL | Known allergies |
| medical_history | TEXT | NULL | General medical history |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Updated timestamp |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive date |
| archived_by | UUID | FK → users | Archived by |

---

## Primary Key

```sql
PRIMARY KEY (id)
```

---

## Unique Constraints

```sql
UNIQUE (mrn)
```

---

## Foreign Keys

```sql
FOREIGN KEY (archived_by)
REFERENCES users(id)
ON DELETE SET NULL;
```

---

## Indexes

```sql
CREATE INDEX idx_patients_mrn
ON patients(mrn);

CREATE INDEX idx_patients_name
ON patients(last_name, first_name);

CREATE INDEX idx_patients_archived
ON patients(is_archived);
```

---

## Relationships

```
Patient

1 -------- N Admissions
```

---

## Business Rules

- MRN is globally unique.
- Patient demographic information is never duplicated.
- Updating demographics does not affect historical admissions.
- Archived patients remain searchable by administrators.
- Patients cannot be deleted.

---

## Example

```
Patient

MRN: ICU-2026-00045

Ahmed Hassan

DOB: 1972-03-12

Blood Type: O+
```

---

# 4.2 beds

## Purpose

Represents every physical ICU bed managed by the system.

Beds are reusable resources.

Admissions occupy beds.

When a patient is discharged, the bed becomes available again.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Bed identifier |
| bed_number | VARCHAR(20) | UNIQUE | ICU bed number |
| ward | VARCHAR(100) | NULL | ICU ward |
| room_number | VARCHAR(30) | NULL | Room number |
| status | bed_status | DEFAULT 'AVAILABLE' | Current status |
| notes | TEXT | NULL | Maintenance notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Updated |

---

## Unique Constraints

```sql
UNIQUE(bed_number)
```

---

## Indexes

```sql
idx_beds_status

idx_beds_number
```

---

## Relationships

```
Bed

1 -------- N Admissions
```

Only one ACTIVE admission may occupy a bed.

---

## Business Rules

AVAILABLE

Patient may be admitted.

OCCUPIED

Cannot admit another patient.

MAINTENANCE

Unavailable for admission.

---

# 4.3 admissions

## Purpose

Represents one ICU stay.

This is the most important table in the entire database.

Every clinical record references an admission.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Admission ID |
| patient_id | UUID | FK → patients | Patient |
| bed_id | UUID | FK → beds | Assigned bed |
| attending_specialist_id | UUID | FK → users | Specialist |
| admitted_by | UUID | FK → users | Nurse/Doctor |
| admission_reason | TEXT | NOT NULL | Chief complaint |
| diagnosis | TEXT | NULL | Initial diagnosis |
| code_status | code_status | DEFAULT 'FULL_CODE' | Resuscitation status |
| status | admission_status | DEFAULT 'ACTIVE' | Admission state |
| admitted_at | TIMESTAMPTZ | DEFAULT NOW() | Admission time |
| discharged_at | TIMESTAMPTZ | NULL | Discharge time |
| discharge_summary | TEXT | NULL | Final notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Updated |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive timestamp |
| archived_by | UUID | FK → users | Archived by |

---

## Foreign Keys

```sql
FOREIGN KEY(patient_id)
REFERENCES patients(id);

FOREIGN KEY(bed_id)
REFERENCES beds(id);

FOREIGN KEY(attending_specialist_id)
REFERENCES users(id);

FOREIGN KEY(admitted_by)
REFERENCES users(id);

FOREIGN KEY(archived_by)
REFERENCES users(id);
```

---

## Indexes

```sql
CREATE INDEX idx_admission_patient
ON admissions(patient_id);

CREATE INDEX idx_admission_status
ON admissions(status);

CREATE INDEX idx_admission_bed
ON admissions(bed_id);

CREATE INDEX idx_admission_specialist
ON admissions(attending_specialist_id);

CREATE INDEX idx_admission_date
ON admissions(admitted_at DESC);
```

---

## Relationships

```
Patient

1 -------- N Admissions

Admission

1 -------- N Vital Signs

1 -------- N Fluid Records

1 -------- N Medications

1 -------- N Lab Results

1 -------- N Nursing Notes

1 -------- N Clinical Notes

1 -------- N Medical Documents

1 -------- N Alerts

1 -------- N Notifications

1 -------- N AI Summaries

1 -------- N AI Queries

1 -------- N Treatment Approvals
```

---

## Admission Lifecycle

```
ACTIVE

↓

DISCHARGED

↓

ARCHIVED
```

---

## Business Rules

### Admission Creation

If MRN already exists

↓

Reuse Patient

↓

Create New Admission

---

### Bed Assignment

Admission automatically changes

```
Bed Status

AVAILABLE

↓

OCCUPIED
```

---

### Discharge

Discharge automatically

- updates admission status
- sets discharged_at
- frees the ICU bed
- blocks further clinical writes

---

### Read-Only State

DISCHARGED admissions

cannot receive

- vitals
- notes
- medications
- documents
- fluids

---

### Soft Delete

Archived admissions

- remain in history
- excluded from normal queries

---

## CHECK Constraints

```sql
CHECK (
discharged_at IS NULL
OR discharged_at >= admitted_at
)
```

```sql
CHECK (
status <> 'DISCHARGED'
OR discharged_at IS NOT NULL
)
```

---

## Recommended Partial Index

Only one active admission should occupy a bed.

```sql
CREATE UNIQUE INDEX uq_active_bed
ON admissions(bed_id)
WHERE status='ACTIVE';
```

---

## Module Relationships

```text
patients
    │
    └──────────────┐
                   │
              admissions
                   │
 ┌─────────────────┼─────────────────────────────────────┐
 │                 │             │             │          │
Vitals        Fluids       Documents      Notes     AI Tables
 │                 │             │             │          │
 └─────────────────┼─────────────┴─────────────┼──────────┘
                   │
              Audit Logs
```

---

# 5. Clinical Recording Module

The Clinical Recording Module stores structured medical information collected throughout a patient's ICU stay.

Unlike demographic information, these records are **admission-specific**, meaning they belong to one ICU admission only.

This module includes:

1. vital_signs
2. fluid_records
3. medications
4. medication_administrations
5. lab_results

---

# 5.1 vital_signs

## Purpose

Stores all vital sign measurements recorded during an ICU admission.

Each record represents one observation at a specific point in time.

Vital signs are the primary data source for:

- Patient dashboard
- Trend sparklines
- AI summaries
- Autonomous monitoring
- Clinical alerts
- RAG retrieval

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Vital record |
| admission_id | UUID | FK → admissions | ICU admission |
| heart_rate | SMALLINT | CHECK | bpm |
| systolic_bp | SMALLINT | CHECK | mmHg |
| diastolic_bp | SMALLINT | CHECK | mmHg |
| mean_arterial_pressure | SMALLINT | CHECK | MAP |
| respiratory_rate | SMALLINT | CHECK | breaths/min |
| temperature | NUMERIC(4,1) | CHECK | Celsius |
| spo2 | SMALLINT | CHECK | Oxygen saturation |
| oxygen_flow | NUMERIC(4,1) | NULL | L/min |
| fio2 | NUMERIC(5,2) | NULL | Fraction of inspired oxygen |
| gcs_eye | SMALLINT | CHECK | 1–4 |
| gcs_verbal | SMALLINT | CHECK | 1–5 |
| gcs_motor | SMALLINT | CHECK | 1–6 |
| gcs_total | SMALLINT | CHECK | 3–15 |
| pain_score | SMALLINT | CHECK | 0–10 |
| source | vital_source | DEFAULT 'MANUAL' | Data source |
| recorded_by | UUID | FK → users | Nurse |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Measurement time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Updated |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive date |
| archived_by | UUID | FK → users | Archived by |

---

## Foreign Keys

```sql
admission_id → admissions(id)

recorded_by → users(id)

archived_by → users(id)
```

---

## CHECK Constraints

```sql
heart_rate BETWEEN 20 AND 300

systolic_bp BETWEEN 40 AND 300

diastolic_bp BETWEEN 20 AND 200

mean_arterial_pressure BETWEEN 20 AND 200

respiratory_rate BETWEEN 2 AND 80

temperature BETWEEN 30.0 AND 45.0

spo2 BETWEEN 0 AND 100

oxygen_flow BETWEEN 0 AND 60

fio2 BETWEEN 0 AND 100

pain_score BETWEEN 0 AND 10

gcs_eye BETWEEN 1 AND 4

gcs_verbal BETWEEN 1 AND 5

gcs_motor BETWEEN 1 AND 6

gcs_total BETWEEN 3 AND 15
```

---

## Indexes

```sql
idx_vitals_admission

idx_vitals_recorded_at

idx_vitals_hr

idx_vitals_spo2

idx_vitals_archived
```

---

## Business Rules

- Only ACTIVE admissions accept new vitals.
- Nurses record hourly observations.
- Values outside physiological limits are rejected.
- Every modification is audited.
- Vitals are never permanently deleted.

---

# 5.2 fluid_records

## Purpose

Tracks all fluid intake and output during an ICU admission.

Used for calculating cumulative fluid balance and supporting AI analysis.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Fluid record |
| admission_id | UUID | FK | Admission |
| direction | fluid_direction | NOT NULL | Intake/Output |
| type | fluid_type | NOT NULL | Fluid category |
| description | TEXT | NULL | Additional details |
| volume_ml | INTEGER | CHECK | Milliliters |
| recorded_by | UUID | FK → users | Recorder |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Updated |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive date |
| archived_by | UUID | FK → users | Archived by |

---

## CHECK Constraints

```sql
volume_ml > 0
```

---

## Indexes

```sql
idx_fluid_admission

idx_fluid_direction

idx_fluid_recorded_at
```

---

## Business Rules

Daily fluid balance is calculated as:

```text
Total Intake

−

Total Output
```

Negative balance is allowed.

---

# 5.3 medications

## Purpose

Stores medication orders prescribed during an ICU admission.

Administration history is stored separately.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Medication order |
| admission_id | UUID | FK | Admission |
| medication_name | VARCHAR(200) | NOT NULL | Drug |
| dosage | VARCHAR(100) | NOT NULL | Dose |
| route | medication_route | NOT NULL | Route |
| frequency | medication_frequency | NOT NULL | Frequency |
| indication | TEXT | NULL | Clinical reason |
| prescribed_by | UUID | FK → users | Physician |
| start_date | TIMESTAMPTZ | NOT NULL | Start |
| end_date | TIMESTAMPTZ | NULL | End |
| is_active | BOOLEAN | DEFAULT TRUE | Active medication |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Updated |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive date |
| archived_by | UUID | FK → users | Archived by |

---

## Business Rules

- Multiple medications allowed.
- Only residents and specialists prescribe.
- Orders remain after discontinuation.
- Discontinuation sets `is_active = FALSE`.

---

# 5.4 medication_administrations

## Purpose

Stores every medication administration event.

Separating orders from administrations provides a complete medication history.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Administration |
| medication_id | UUID | FK | Medication |
| administered_by | UUID | FK → users | Nurse |
| administered_at | TIMESTAMPTZ | DEFAULT NOW() | Time |
| administered_dose | VARCHAR(100) | NOT NULL | Actual dose |
| notes | TEXT | NULL | Comments |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |

---

## Relationships

```
Medication

1 -------- N Medication Administrations
```

---

## Business Rules

- Every administration references one medication order.
- Administration history is immutable.

---

# 5.5 lab_results

## Purpose

Stores structured laboratory test results associated with an ICU admission.

These records support:

- Dashboard display
- AI summaries
- Trend analysis
- RAG queries

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Lab result |
| admission_id | UUID | FK | Admission |
| category | lab_category | NOT NULL | Test group |
| test_name | VARCHAR(150) | NOT NULL | Test |
| result_value | VARCHAR(100) | NOT NULL | Result |
| unit | VARCHAR(30) | NULL | Measurement unit |
| reference_range | VARCHAR(100) | NULL | Normal range |
| abnormal | BOOLEAN | DEFAULT FALSE | Flag |
| verified_by | UUID | FK → users | Verifier |
| result_date | TIMESTAMPTZ | NOT NULL | Result timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Updated |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive date |
| archived_by | UUID | FK → users | Archived by |

---

## Indexes

```sql
idx_lab_admission

idx_lab_category

idx_lab_result_date

idx_lab_abnormal
```

---

## Business Rules

- One admission may contain thousands of lab results.
- Results are stored exactly as reported.
- Existing results are not overwritten; corrections create new records with audit logs.
- Abnormal results can trigger AI alerts.

---

## Clinical Module Relationships

```text
Admissions
│
├── Vital Signs
├── Fluid Records
├── Medication Orders
│      └── Medication Administrations
└── Laboratory Results
```

---

# 6. Clinical Documentation & AI Knowledge Base

This module stores all unstructured clinical information collected during an ICU admission. Unlike structured data such as vital signs or laboratory results, these records consist of free-text notes and uploaded medical documents.

These tables provide the primary knowledge source for:

- Patient Timeline
- Unified Dashboard
- AI Summaries
- RAG Assistant
- Clinical Reasoning
- Semantic Search

This module consists of:

1. nursing_notes
2. clinical_notes
3. medical_documents
4. document_embeddings

---

# 6.1 nursing_notes

## Purpose

Stores nursing observations recorded throughout the patient's ICU stay.

These notes typically include:

- Shift observations
- Patient condition
- Nursing interventions
- Response to treatment
- Equipment status

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Note identifier |
| admission_id | UUID | FK → admissions | ICU admission |
| author_id | UUID | FK → users | Nurse |
| note_type | note_type | DEFAULT 'NURSING' | Note category |
| note | TEXT | NOT NULL | Nursing note |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Clinical timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Updated |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive timestamp |
| archived_by | UUID | FK → users | Archived by |

---

## Foreign Keys

```sql
admission_id → admissions(id)

author_id → users(id)

archived_by → users(id)
```

---

## Indexes

```sql
idx_nursing_admission

idx_nursing_author

idx_nursing_recorded_at
```

---

## Business Rules

- Only ICU Nurses can create nursing notes.
- Residents and Specialists may view but not edit another nurse's note.
- Notes remain permanently available for auditing.
- Notes participate in AI summarization.

---

# 6.2 clinical_notes

## Purpose

Stores physician documentation.

Examples include:

- Progress notes
- Daily assessment
- Clinical impression
- Treatment plan
- Consultant recommendations

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Clinical note |
| admission_id | UUID | FK → admissions | ICU admission |
| author_id | UUID | FK → users | Resident/Specialist |
| note_type | note_type | DEFAULT 'CLINICAL' | Category |
| subjective | TEXT | NULL | Subjective findings |
| objective | TEXT | NULL | Objective findings |
| assessment | TEXT | NULL | Clinical assessment |
| plan | TEXT | NULL | Treatment plan |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Clinical timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Updated |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive timestamp |
| archived_by | UUID | FK → users | Archived by |

---

## Indexes

```sql
idx_clinical_admission

idx_clinical_author

idx_clinical_recorded_at
```

---

## Business Rules

- Only Residents and Specialists create clinical notes.
- Historical notes are immutable after signing.
- AI summaries use these notes extensively.
- RAG assistant indexes every note.

---

# 6.3 medical_documents

## Purpose

Stores uploaded medical files associated with an ICU admission.

Supported documents include:

- Laboratory reports
- Radiology reports
- ECGs
- Consultation letters
- Prescriptions
- PDFs
- Images

The actual file is stored on disk or cloud storage.

The database stores metadata only.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Document ID |
| admission_id | UUID | FK → admissions | ICU admission |
| uploaded_by | UUID | FK → users | Uploader |
| document_type | document_type | NOT NULL | Document category |
| title | VARCHAR(255) | NOT NULL | Display title |
| original_filename | VARCHAR(255) | NOT NULL | Original file |
| stored_filename | VARCHAR(255) | UNIQUE | Stored file name |
| mime_type | VARCHAR(100) | NOT NULL | File MIME type |
| file_size_bytes | BIGINT | NOT NULL | File size |
| storage_provider | storage_provider | DEFAULT 'LOCAL' | Storage backend |
| file_path | TEXT | NOT NULL | Storage location |
| embedding_status | embedding_status | DEFAULT 'PENDING' | AI processing status |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Upload time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Updated |
| is_archived | BOOLEAN | DEFAULT FALSE | Soft delete |
| archived_at | TIMESTAMPTZ | NULL | Archive timestamp |
| archived_by | UUID | FK → users | Archived by |

---

## Indexes

```sql
idx_documents_admission

idx_documents_type

idx_documents_embedding

idx_documents_uploaded
```

---

## Business Rules

- Files are never stored inside PostgreSQL.
- Only metadata is stored.
- Maximum upload size is defined by backend configuration.
- Upload automatically queues AI embedding generation.
- Deleting a document archives it instead of removing it.

---

# 6.4 document_embeddings

## Purpose

Stores vector embeddings generated from uploaded documents.

Each document is divided into multiple text chunks.

Each chunk receives one vector embedding.

These embeddings power semantic search for the RAG assistant.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Embedding ID |
| document_id | UUID | FK → medical_documents | Source document |
| chunk_index | INTEGER | NOT NULL | Chunk order |
| chunk_text | TEXT | NOT NULL | Extracted text |
| embedding | VECTOR(768) | NOT NULL | pgvector embedding |
| metadata | JSONB | NULL | Additional metadata |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |

---

## Foreign Keys

```sql
document_id → medical_documents(id)
```

---

## Indexes

```sql
CREATE INDEX idx_embedding_document
ON document_embeddings(document_id);

CREATE INDEX idx_embedding_vector
ON document_embeddings
USING ivfflat (embedding vector_cosine_ops);
```

---

## Business Rules

- One document generates many embeddings.
- Embeddings are regenerated if the document changes.
- Chunk order must remain sequential.
- Embeddings are never edited manually.
- Failed embedding jobs update the parent document's `embedding_status`.

---

## Relationship Diagram

```text
Admission
│
├── Nursing Notes
│
├── Clinical Notes
│
└── Medical Documents
        │
        ├── PDF
        ├── Image
        ├── ECG
        ├── Lab Report
        └── Radiology
                │
                ▼
      Document Embeddings
                │
                ▼
        RAG Semantic Search
```

---

## AI Workflow

```text
Upload Document
        │
        ▼
Extract Text
        │
        ▼
Split Into Chunks
        │
        ▼
Generate Embeddings
        │
        ▼
Store in document_embeddings
        │
        ▼
Search using pgvector
        │
        ▼
Return Relevant Chunks
        │
        ▼
Generate AI Response
```

---

# 7. Artificial Intelligence Module

The Artificial Intelligence Module provides the intelligent features that distinguish SmartCare ICU from a traditional ICU management system.

This module supports:

- AI-generated patient summaries
- Retrieval-Augmented Generation (RAG)
- Autonomous patient monitoring
- Explainable clinical alerts
- User notifications

The module consists of:

1. ai_summaries
2. ai_query_logs
3. alerts
4. alert_reviews
5. notifications

---

# 7.1 ai_summaries

## Purpose

Stores AI-generated summaries for ICU admissions.

Summaries provide a synthesized overview of the patient's clinical status based on:

- Vital signs
- Laboratory results
- Fluid balance
- Nursing notes
- Clinical notes
- Uploaded medical documents

Summaries are generated on demand or automatically every 24 hours.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Summary ID |
| admission_id | UUID | FK → admissions | ICU admission |
| generated_by | UUID | FK → users | User requesting summary |
| summary_type | ai_summary_type | NOT NULL | Summary type |
| hemodynamic_summary | TEXT | NULL | Hemodynamic overview |
| respiratory_summary | TEXT | NULL | Respiratory overview |
| renal_fluid_summary | TEXT | NULL | Fluid/Renal overview |
| neurological_summary | TEXT | NULL | Neurological overview |
| overall_summary | TEXT | NOT NULL | Final AI summary |
| model_name | VARCHAR(100) | NOT NULL | AI model |
| generation_time_ms | INTEGER | NULL | Generation time |
| tokens_used | INTEGER | NULL | AI token usage |
| generated_at | TIMESTAMPTZ | DEFAULT NOW() | Generation time |

---

## Foreign Keys

```sql
admission_id → admissions(id)

generated_by → users(id)
```

---

## Indexes

```sql
idx_summary_admission

idx_summary_generated_at

idx_summary_type
```

---

## Business Rules

- Multiple summaries may exist for one admission.
- Previous summaries are preserved.
- AI summaries are read-only after generation.
- Every generation is logged.

---

# 7.2 ai_query_logs

## Purpose

Stores every RAG conversation initiated by users.

This table provides:

- AI usage analytics
- Response auditing
- Latency monitoring
- Source traceability

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Query ID |
| admission_id | UUID | FK → admissions | ICU admission |
| user_id | UUID | FK → users | Requesting user |
| question | TEXT | NOT NULL | User prompt |
| ai_response | TEXT | NOT NULL | AI answer |
| cited_sources | JSONB | NULL | Retrieved document IDs |
| model_name | VARCHAR(100) | NOT NULL | AI model |
| latency_ms | INTEGER | NULL | Response time |
| tokens_used | INTEGER | NULL | Token count |
| status | ai_query_status | DEFAULT 'SUCCESS' | Query status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Query timestamp |

---

## Example Sources

```json
[
  {
    "document_id":"UUID",
    "chunk":12
  },
  {
    "document_id":"UUID",
    "chunk":18
  }
]
```

---

## Business Rules

- Every AI query is stored.
- Users cannot modify AI history.
- Sources must reference retrieved document chunks.
- Failed queries are logged.

---

# 7.3 alerts

## Purpose

Stores alerts generated by the Autonomous Monitoring Agent.

Alerts identify abnormal patient conditions requiring clinical attention.

Examples:

- Persistent hypotension
- Sepsis suspicion
- Respiratory deterioration
- Low urine output
- Declining GCS
- Combined deterioration patterns

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Alert ID |
| admission_id | UUID | FK → admissions | ICU admission |
| severity | alert_severity | NOT NULL | P0 / P1 |
| status | alert_status | DEFAULT 'OPEN' | Current status |
| title | VARCHAR(255) | NOT NULL | Alert title |
| description | TEXT | NOT NULL | Alert explanation |
| triggering_metrics | JSONB | NOT NULL | Trigger values |
| clinical_reasoning | TEXT | NOT NULL | AI reasoning |
| differential_diagnosis | JSONB | NULL | Possible causes |
| suggested_actions | JSONB | NULL | Recommended next steps |
| generated_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

---

## Example Trigger

```json
{
  "MAP":55,
  "HeartRate":132,
  "Temperature":39.4
}
```

---

## Example Suggested Actions

```json
[
"Assess patient immediately",
"Repeat lactate",
"Obtain blood cultures",
"Review antibiotics"
]
```

---

## Indexes

```sql
idx_alert_admission

idx_alert_severity

idx_alert_status

idx_alert_generated
```

---

## Business Rules

- Alerts are generated automatically.
- Alerts cannot be edited.
- Status changes only through review workflow.
- P0 alerts appear immediately on dashboard.

---

# 7.4 alert_reviews

## Purpose

Stores clinician review history for AI-generated alerts.

This ensures explainability and accountability.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Review ID |
| alert_id | UUID | FK → alerts | Reviewed alert |
| reviewer_id | UUID | FK → users | Resident/Specialist |
| review_notes | TEXT | NULL | Clinical comments |
| accepted | BOOLEAN | NULL | Accepted recommendation |
| reviewed_at | TIMESTAMPTZ | DEFAULT NOW() | Review timestamp |

---

## Relationships

```
Alert

1 -------- N Alert Reviews
```

---

## Business Rules

- Multiple reviews allowed.
- Reviews never overwrite previous reviews.
- Each review is auditable.

---

# 7.5 notifications

## Purpose

Stores dashboard notifications delivered to users.

Notifications may originate from:

- AI alerts
- New admissions
- Treatment approvals
- Document uploads
- System events

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Notification ID |
| user_id | UUID | FK → users | Recipient |
| admission_id | UUID | FK → admissions | Related admission |
| alert_id | UUID | FK → alerts | Related alert |
| title | VARCHAR(255) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification content |
| status | notification_status | DEFAULT 'UNREAD' | Read state |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| read_at | TIMESTAMPTZ | NULL | Read timestamp |

---

## Business Rules

- Notifications are user-specific.
- Reading a notification sets `read_at`.
- Notifications are never hard deleted.

---

# AI Module Relationships

```text
Admissions
│
├── AI Summaries
│
├── AI Query Logs
│
├── Alerts
│      │
│      └── Alert Reviews
│
└── Notifications
```

---

# AI Data Flow

```text
Clinical Data
      │
      ▼
RAG Retrieval
      │
      ▼
Large Language Model
      │
      ├────────► AI Summary
      │
      ├────────► AI Query Log
      │
      └────────► Autonomous Alert
                     │
                     ▼
               Notification
                     │
                     ▼
               Alert Review
```

---

# 8. System Management Module

The System Management Module contains tables responsible for system-wide administrative functionality rather than direct clinical documentation.

These tables support:

- Treatment approval workflow
- Global system configuration

This module consists of:

1. treatment_approvals
2. system_settings

---

# 8.1 treatment_approvals

## Purpose

Stores approvals for high-risk or restricted clinical actions that require authorization by an ICU Specialist.

Examples include:

- High-risk medications
- Emergency procedures
- Experimental treatments
- Blood transfusions (if hospital policy requires approval)
- AI-generated treatment recommendations requiring confirmation

This table provides accountability and preserves the complete approval history.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Approval identifier |
| admission_id | UUID | FK → admissions | Related ICU admission |
| requested_by | UUID | FK → users | User requesting approval |
| approved_by | UUID | FK → users | Specialist approving treatment |
| treatment_name | VARCHAR(255) | NOT NULL | Treatment or procedure |
| treatment_description | TEXT | NULL | Clinical details |
| clinical_justification | TEXT | NOT NULL | Reason for request |
| ai_recommendation | BOOLEAN | DEFAULT FALSE | Originated from AI suggestion |
| approval_status | BOOLEAN | DEFAULT FALSE | Approved or rejected |
| approval_notes | TEXT | NULL | Specialist comments |
| requested_at | TIMESTAMPTZ | DEFAULT NOW() | Request time |
| approved_at | TIMESTAMPTZ | NULL | Approval time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Updated |

---

## Foreign Keys

```sql
requested_by
→ users(id)

approved_by
→ users(id)

admission_id
→ admissions(id)
```

---

## Indexes

```sql
CREATE INDEX idx_treatment_admission
ON treatment_approvals(admission_id);

CREATE INDEX idx_treatment_requester
ON treatment_approvals(requested_by);

CREATE INDEX idx_treatment_approver
ON treatment_approvals(approved_by);

CREATE INDEX idx_treatment_status
ON treatment_approvals(approval_status);

CREATE INDEX idx_treatment_requested
ON treatment_approvals(requested_at DESC);
```

---

## Business Rules

- Every approval request belongs to one ICU admission.
- A request may only be approved by an ICU Specialist.
- Requests cannot be modified after approval.
- Rejected requests remain in the database.
- Every approval automatically generates an audit log.

---

## Workflow

```text
Resident
     │
Creates Request
     │
     ▼
Treatment Approval
     │
     ▼
ICU Specialist
     │
     ├────────► Reject
     │
     └────────► Approve
                     │
                     ▼
              Audit Log Created
```

---

# 8.2 system_settings

## Purpose

Stores configurable application settings that may change without modifying application code.

This table enables administrators to customize system behavior from an administration panel in future releases.

Only System Administrators may modify these values.

---

## Table Definition

| Column | Type | Constraints | Description |
|---------|------|-------------|-------------|
| id | UUID | PK | Setting identifier |
| setting_key | VARCHAR(150) | UNIQUE | Configuration key |
| setting_value | JSONB | NOT NULL | Configuration value |
| description | TEXT | NULL | Human-readable description |
| updated_by | UUID | FK → users | Administrator |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created |

---

## Example Records

| setting_key | setting_value |
|--------------|---------------|
| SESSION_TIMEOUT_MINUTES | 720 |
| MAX_LOGIN_ATTEMPTS | 5 |
| ACCOUNT_LOCK_DURATION_MINUTES | 15 |
| AI_MODEL | "GPT-5.5" |
| MAX_DOCUMENT_UPLOAD_MB | 50 |
| AUTO_SUMMARY_INTERVAL_HOURS | 24 |
| ALERT_CHECK_INTERVAL_MINUTES | 5 |
| DEFAULT_LANGUAGE | "en" |

---

## Foreign Keys

```sql
updated_by
→ users(id)
```

---

## Indexes

```sql
CREATE UNIQUE INDEX uq_setting_key
ON system_settings(setting_key);
```

---

## Business Rules

- Every configuration key must be unique.
- Values are stored as JSONB to support multiple data types.
- Changes are audited.
- Invalid configuration changes are rejected by backend validation.

---

# Administrative Relationships

```text
Users
 │
 ├─────────────► Treatment Approvals
 │
 └─────────────► System Settings
```

---

# Module Summary

The System Management Module provides:

- Secure treatment authorization
- Configurable system behavior
- Administrative flexibility
- Complete accountability through audit logs

Although these tables are relatively small, they support critical governance and operational requirements of the SmartCare ICU platform.

---

# 9. Database Constraints & Integrity Rules

Database constraints ensure that all stored data remains valid, consistent, and reliable throughout the lifetime of the SmartCare ICU system.

Unlike application-level validation, these constraints are enforced directly by PostgreSQL and cannot be bypassed by client applications.

---

# 9.1 Primary Key Rules

Every table in the database uses a UUID Version 4 primary key.

Standard definition:

```sql
id UUID PRIMARY KEY
DEFAULT gen_random_uuid()
```

## Design Rationale

Advantages of UUIDs:

- Globally unique
- Difficult to guess
- Safe for distributed systems
- Easy future integration
- Better security than sequential IDs

---

## Primary Keys by Table

| Table | Primary Key |
|---------|-------------|
| users | id |
| patients | id |
| admissions | id |
| beds | id |
| vital_signs | id |
| fluid_records | id |
| medications | id |
| medication_administrations | id |
| lab_results | id |
| nursing_notes | id |
| clinical_notes | id |
| medical_documents | id |
| document_embeddings | id |
| ai_summaries | id |
| ai_query_logs | id |
| alerts | id |
| alert_reviews | id |
| notifications | id |
| treatment_approvals | id |
| audit_logs | id |
| login_attempts | id |
| refresh_tokens | id |
| system_settings | id |

---

# 9.2 Foreign Key Constraints

Every relationship is enforced using foreign keys.

## Users

```text
users

↓

audit_logs

↓

login_attempts

↓

refresh_tokens
```

---

## Patients

```text
patients

↓

admissions
```

---

## Admissions

```text
admissions

↓

vital_signs

↓

fluid_records

↓

medications

↓

lab_results

↓

clinical_notes

↓

nursing_notes

↓

medical_documents

↓

alerts

↓

notifications

↓

ai_summaries

↓

ai_query_logs

↓

treatment_approvals
```

---

## Documents

```text
medical_documents

↓

document_embeddings
```

---

## Alerts

```text
alerts

↓

alert_reviews

↓

notifications
```

---

# 9.3 Referential Actions

The following rules apply when parent records change.

| Relationship | On Delete | On Update |
|--------------|-----------|-----------|
| Patient → Admission | RESTRICT | CASCADE |
| Admission → Vitals | RESTRICT | CASCADE |
| Admission → Notes | RESTRICT | CASCADE |
| Admission → Documents | RESTRICT | CASCADE |
| Document → Embeddings | CASCADE | CASCADE |
| User → Audit Logs | SET NULL | CASCADE |
| User → Login Attempts | SET NULL | CASCADE |
| User → Notifications | SET NULL | CASCADE |

---

## Why RESTRICT?

Clinical data must never disappear accidentally.

Deleting a patient while clinical records exist would violate medical record retention requirements.

Therefore

```text
DELETE Patient

❌ Rejected
```

---

# 9.4 Unique Constraints

Unique constraints prevent duplicate records.

## users

```sql
UNIQUE(email)
```

---

## patients

```sql
UNIQUE(mrn)
```

---

## beds

```sql
UNIQUE(bed_number)
```

---

## medical_documents

```sql
UNIQUE(stored_filename)
```

---

## refresh_tokens

```sql
UNIQUE(token_hash)
```

---

## system_settings

```sql
UNIQUE(setting_key)
```

---

## Active Bed Constraint

Only one active admission may occupy a bed.

```sql
CREATE UNIQUE INDEX uq_active_bed
ON admissions(bed_id)
WHERE status='ACTIVE';
```

---

# 9.5 CHECK Constraints

CHECK constraints prevent invalid clinical values.

## Heart Rate

```sql
heart_rate BETWEEN 20 AND 300
```

---

## Blood Pressure

```sql
systolic_bp BETWEEN 40 AND 300

diastolic_bp BETWEEN 20 AND 200
```

---

## Respiratory Rate

```sql
respiratory_rate BETWEEN 2 AND 80
```

---

## Temperature

```sql
temperature BETWEEN 30.0 AND 45.0
```

---

## Oxygen Saturation

```sql
spo2 BETWEEN 0 AND 100
```

---

## Pain Score

```sql
pain_score BETWEEN 0 AND 10
```

---

## Glasgow Coma Scale

```sql
gcs_total BETWEEN 3 AND 15
```

---

## Fluid Volume

```sql
volume_ml > 0
```

---

## Admission Dates

```sql
CHECK(
discharged_at IS NULL
OR discharged_at >= admitted_at
)
```

---

## Medication Dates

```sql
CHECK(
end_date IS NULL
OR end_date >= start_date
)
```

---

# 9.6 NOT NULL Rules

The following information is mandatory.

Examples

Users

```text
Email

Password

Role
```

Patients

```text
MRN

First Name

Last Name

DOB

Gender
```

Admissions

```text
Patient

Bed

Status

Admission Time
```

Vital Signs

```text
Admission

Recorder

Recorded Time
```

Medical Documents

```text
Admission

File

Title

Type
```

---

# 9.7 Default Values

Frequently used defaults reduce application complexity.

Examples

```sql
created_at DEFAULT NOW()

updated_at DEFAULT NOW()

status DEFAULT 'ACTIVE'

is_archived DEFAULT FALSE

failed_login_attempts DEFAULT 0

approval_status DEFAULT FALSE

embedding_status DEFAULT 'PENDING'
```

---

# 9.8 Soft Delete Rules

Clinical records are never permanently deleted.

Every clinical table contains:

```sql
is_archived BOOLEAN
DEFAULT FALSE

archived_at TIMESTAMPTZ

archived_by UUID
```

---

## Soft Delete Workflow

```text
User clicks Delete

↓

Archive Record

↓

is_archived = TRUE

↓

Hidden from normal queries

↓

Still available for audits
```

---

## Tables Supporting Soft Delete

- patients
- admissions
- vital_signs
- fluid_records
- medications
- lab_results
- nursing_notes
- clinical_notes
- medical_documents

---

# 9.9 Timestamp Rules

Every table follows a standard timestamp strategy.

```sql
created_at

updated_at
```

Clinical events additionally include

```sql
recorded_at

generated_at

uploaded_at

approved_at

read_at
```

All timestamps use:

```sql
TIMESTAMP WITH TIME ZONE
```

(PostgreSQL `TIMESTAMPTZ`)

---

# 9.10 JSONB Usage

JSONB is used where flexible structures are required.

Examples

| Table | Column |
|---------|---------|
| alerts | triggering_metrics |
| alerts | suggested_actions |
| alerts | differential_diagnosis |
| ai_query_logs | cited_sources |
| document_embeddings | metadata |
| audit_logs | old_values |
| audit_logs | new_values |
| system_settings | setting_value |

---

# 9.11 Data Retention Policy

| Table | Retention |
|---------|-----------|
| Clinical Data | Permanent |
| Audit Logs | Permanent |
| AI Summaries | Permanent |
| Alerts | Permanent |
| Documents | Permanent |
| Login Attempts | 1 year |
| Refresh Tokens | Until revoked/expired |

---

# 9.12 Integrity Rules Summary

The SmartCare ICU database guarantees that:

- Every patient has a unique MRN.
- Every admission belongs to exactly one patient.
- Every vital sign belongs to exactly one admission.
- Every AI summary belongs to one admission.
- Every document embedding belongs to one document.
- Every alert review belongs to one alert.
- Every notification belongs to one user.
- Every treatment approval belongs to one admission.
- No clinical record exists without its parent record.
- No active bed can contain more than one patient.
- Archived data remains recoverable.
- Audit logs are immutable.

---

# 10. Database Indexing & Performance Strategy

The SmartCare ICU database is designed to support high-performance clinical operations, AI-powered semantic search, and real-time dashboard updates while maintaining data integrity.

This section defines the indexing strategy, query optimization techniques, and performance recommendations for PostgreSQL.

---

# 10.1 Indexing Strategy

The indexing strategy follows these principles:

- Index frequently searched columns.
- Index foreign keys.
- Index filtering columns.
- Index sorting columns.
- Minimize unnecessary indexes.
- Use specialized indexes for JSONB and vectors.

---

# 10.2 Standard B-Tree Indexes

B-Tree indexes are used for equality comparisons, sorting, and range queries.

---

## Users

```sql
CREATE INDEX idx_users_email
ON users(email);

CREATE INDEX idx_users_role
ON users(role);

CREATE INDEX idx_users_status
ON users(status);
```

---

## Patients

```sql
CREATE UNIQUE INDEX idx_patients_mrn
ON patients(mrn);

CREATE INDEX idx_patients_name
ON patients(last_name, first_name);
```

---

## Admissions

```sql
CREATE INDEX idx_admissions_patient
ON admissions(patient_id);

CREATE INDEX idx_admissions_status
ON admissions(status);

CREATE INDEX idx_admissions_bed
ON admissions(bed_id);

CREATE INDEX idx_admissions_specialist
ON admissions(attending_specialist_id);

CREATE INDEX idx_admissions_date
ON admissions(admitted_at DESC);
```

---

## Vital Signs

```sql
CREATE INDEX idx_vitals_admission
ON vital_signs(admission_id);

CREATE INDEX idx_vitals_recorded
ON vital_signs(recorded_at DESC);

CREATE INDEX idx_vitals_spo2
ON vital_signs(spo2);

CREATE INDEX idx_vitals_hr
ON vital_signs(heart_rate);
```

---

## Fluid Records

```sql
CREATE INDEX idx_fluids_admission
ON fluid_records(admission_id);

CREATE INDEX idx_fluids_time
ON fluid_records(recorded_at DESC);
```

---

## Medications

```sql
CREATE INDEX idx_medications_admission
ON medications(admission_id);

CREATE INDEX idx_medications_active
ON medications(is_active);
```

---

## Laboratory Results

```sql
CREATE INDEX idx_labs_admission
ON lab_results(admission_id);

CREATE INDEX idx_labs_category
ON lab_results(category);

CREATE INDEX idx_labs_date
ON lab_results(result_date DESC);
```

---

## Notes

```sql
CREATE INDEX idx_nursing_notes_admission
ON nursing_notes(admission_id);

CREATE INDEX idx_clinical_notes_admission
ON clinical_notes(admission_id);
```

---

## Documents

```sql
CREATE INDEX idx_documents_admission
ON medical_documents(admission_id);

CREATE INDEX idx_documents_type
ON medical_documents(document_type);

CREATE INDEX idx_documents_embedding_status
ON medical_documents(embedding_status);
```

---

## Alerts

```sql
CREATE INDEX idx_alerts_admission
ON alerts(admission_id);

CREATE INDEX idx_alerts_status
ON alerts(status);

CREATE INDEX idx_alerts_severity
ON alerts(severity);

CREATE INDEX idx_alerts_generated
ON alerts(generated_at DESC);
```

---

# 10.3 Composite Indexes

Composite indexes improve performance for queries involving multiple columns.

---

## Active Admissions

```sql
CREATE INDEX idx_active_admissions
ON admissions(status, admitted_at DESC);
```

---

## Patient Timeline

```sql
CREATE INDEX idx_patient_timeline
ON vital_signs(admission_id, recorded_at DESC);
```

---

## AI Queries

```sql
CREATE INDEX idx_ai_queries
ON ai_query_logs(admission_id, created_at DESC);
```

---

## Notifications

```sql
CREATE INDEX idx_notifications
ON notifications(user_id, status);
```

---

# 10.4 Partial Indexes

Partial indexes improve performance by indexing only a subset of records.

---

## Active Beds

```sql
CREATE UNIQUE INDEX uq_active_bed
ON admissions(bed_id)
WHERE status='ACTIVE';
```

---

## Active Medications

```sql
CREATE INDEX idx_active_medications
ON medications(admission_id)
WHERE is_active = TRUE;
```

---

## Unread Notifications

```sql
CREATE INDEX idx_unread_notifications
ON notifications(user_id)
WHERE status='UNREAD';
```

---

## Open Alerts

```sql
CREATE INDEX idx_open_alerts
ON alerts(admission_id)
WHERE status='OPEN';
```

---

# 10.5 JSONB Indexes

Several tables use JSONB columns.

GIN indexes provide efficient querying.

---

## Audit Logs

```sql
CREATE INDEX idx_audit_old_values
ON audit_logs
USING GIN(old_values);

CREATE INDEX idx_audit_new_values
ON audit_logs
USING GIN(new_values);
```

---

## Alert Metadata

```sql
CREATE INDEX idx_alert_metrics
ON alerts
USING GIN(triggering_metrics);

CREATE INDEX idx_alert_actions
ON alerts
USING GIN(suggested_actions);
```

---

## AI Query Sources

```sql
CREATE INDEX idx_ai_sources
ON ai_query_logs
USING GIN(cited_sources);
```

---

## System Settings

```sql
CREATE INDEX idx_settings_json
ON system_settings
USING GIN(setting_value);
```

---

# 10.6 pgvector Index

Semantic search is powered by pgvector.

```sql
CREATE INDEX idx_document_embeddings_vector
ON document_embeddings
USING ivfflat
(
embedding vector_cosine_ops
)
WITH
(
lists = 100
);
```

---

## Query Example

```sql
SELECT *

FROM document_embeddings

ORDER BY embedding <=> :query_vector

LIMIT 10;
```

---

# 10.7 Full-Text Search

PostgreSQL Full-Text Search improves document retrieval.

Example:

```sql
CREATE INDEX idx_document_text

ON document_embeddings

USING GIN

(to_tsvector('english', chunk_text));
```

Example Query

```sql
SELECT *

FROM document_embeddings

WHERE

to_tsvector('english', chunk_text)

@@

plainto_tsquery('sepsis');
```

---

# 10.8 Expected Query Performance

| Query | Expected Time |
|---------|--------------|
| Login | < 10 ms |
| Find Patient by MRN | < 20 ms |
| Open Patient Dashboard | < 200 ms |
| Latest Vital Signs | < 50 ms |
| Daily Fluid Balance | < 100 ms |
| Medication History | < 100 ms |
| AI Summary Retrieval | < 100 ms |
| Semantic Search | < 500 ms |
| Alert Dashboard | < 100 ms |

---

# 10.9 Query Optimization Guidelines

### Always Use Foreign Keys

Good

```sql
WHERE admission_id = ?
```

Bad

```sql
WHERE patient_name = ?
```

---

### Limit Results

Good

```sql
LIMIT 20
```

Avoid

```sql
SELECT *

FROM vital_signs;
```

---

### Paginate Large Tables

Recommended

- Audit Logs
- AI Query Logs
- Laboratory Results
- Nursing Notes
- Clinical Notes

---

### Avoid N+1 Queries

Instead of repeatedly querying related data, use joins or ORM eager loading.

Example

```sql
Admissions

JOIN Patients

JOIN Beds

JOIN Users
```

---

# 10.10 Table Partitioning (Future Enhancement)

When clinical data grows significantly, partition large tables by date.

Recommended candidates:

- vital_signs
- lab_results
- audit_logs
- ai_query_logs
- login_attempts

Example:

```text
vital_signs_2026

vital_signs_2027

vital_signs_2028
```

---

# 10.11 Performance Monitoring

Regular monitoring should include:

- Slow query analysis (`pg_stat_statements`)
- Index usage statistics
- Vacuum and Analyze schedules
- Table bloat monitoring
- Vector index maintenance
- Database connection pool utilization

---

# 10.12 Backup & Recovery Recommendations

- Daily full backups.
- Hourly WAL archiving.
- Point-in-Time Recovery (PITR) enabled.
- Periodic restore testing.
- Off-site encrypted backup storage.

---

# Performance Summary

The SmartCare ICU database is optimized for:

- Fast patient lookup
- Real-time ICU dashboards
- High-volume clinical data
- AI semantic retrieval
- Secure audit logging
- Scalable future growth

The combination of B-tree, GIN, partial, composite, and pgvector indexes ensures the system remains responsive under heavy clinical workloads.

---

# 11. Complete Database Data Dictionary

The Data Dictionary serves as the master reference for every table in the SmartCare ICU database.

It provides a concise description of each table, its purpose, primary key, foreign keys, and the major business rules. This section should be used by developers, database administrators, backend engineers, and future maintainers as a quick reference guide.

---

# 11.1 Database Summary

| Category | Tables |
|----------|--------|
| Authentication & Security | users, login_attempts, refresh_tokens, audit_logs |
| Core Clinical | patients, beds, admissions |
| Clinical Records | vital_signs, fluid_records, medications, medication_administrations, lab_results |
| Clinical Documentation | nursing_notes, clinical_notes, medical_documents, document_embeddings |
| Artificial Intelligence | ai_summaries, ai_query_logs, alerts, alert_reviews, notifications |
| System Management | treatment_approvals, system_settings |

---

# 11.2 Authentication & Security Tables

## users

| Property | Value |
|----------|-------|
| Purpose | Stores authenticated system users |
| Primary Key | id |
| Main Foreign Keys | — |
| Main Relationships | Admissions, Notes, Audit Logs, AI, Notifications |
| Soft Delete | No |

---

## login_attempts

| Property | Value |
|----------|-------|
| Purpose | Stores all login attempts |
| Primary Key | id |
| Foreign Keys | user_id → users |
| Soft Delete | No |

---

## refresh_tokens

| Property | Value |
|----------|-------|
| Purpose | Stores active refresh tokens |
| Primary Key | id |
| Foreign Keys | user_id → users |
| Soft Delete | No |

---

## audit_logs

| Property | Value |
|----------|-------|
| Purpose | Immutable audit trail |
| Primary Key | id |
| Foreign Keys | user_id → users |
| Soft Delete | No |

---

# 11.3 Core Clinical Tables

## patients

| Property | Value |
|----------|-------|
| Purpose | Permanent patient demographics |
| Primary Key | id |
| Unique | mrn |
| Relationships | 1 Patient → Many Admissions |
| Soft Delete | Yes |

---

## beds

| Property | Value |
|----------|-------|
| Purpose | ICU bed inventory |
| Primary Key | id |
| Unique | bed_number |
| Relationships | 1 Bed → Many Admissions |
| Soft Delete | No |

---

## admissions

| Property | Value |
|----------|-------|
| Purpose | Represents one ICU stay |
| Primary Key | id |
| Foreign Keys | patient_id, bed_id, attending_specialist_id, admitted_by |
| Relationships | Parent of nearly all clinical data |
| Soft Delete | Yes |

---

# 11.4 Clinical Recording Tables

## vital_signs

| Property | Value |
|----------|-------|
| Purpose | Stores patient vital signs |
| Parent | admissions |
| Recorder | users |
| Soft Delete | Yes |

---

## fluid_records

| Property | Value |
|----------|-------|
| Purpose | Intake and output records |
| Parent | admissions |
| Recorder | users |
| Soft Delete | Yes |

---

## medications

| Property | Value |
|----------|-------|
| Purpose | Medication orders |
| Parent | admissions |
| Prescriber | users |
| Soft Delete | Yes |

---

## medication_administrations

| Property | Value |
|----------|-------|
| Purpose | Medication administration history |
| Parent | medications |
| Recorder | users |
| Soft Delete | No |

---

## lab_results

| Property | Value |
|----------|-------|
| Purpose | Laboratory test results |
| Parent | admissions |
| Verified By | users |
| Soft Delete | Yes |

---

# 11.5 Clinical Documentation Tables

## nursing_notes

| Property | Value |
|----------|-------|
| Purpose | Nursing documentation |
| Parent | admissions |
| Author | users |
| Soft Delete | Yes |

---

## clinical_notes

| Property | Value |
|----------|-------|
| Purpose | Physician documentation |
| Parent | admissions |
| Author | users |
| Soft Delete | Yes |

---

## medical_documents

| Property | Value |
|----------|-------|
| Purpose | Uploaded medical files |
| Parent | admissions |
| Uploaded By | users |
| Soft Delete | Yes |

---

## document_embeddings

| Property | Value |
|----------|-------|
| Purpose | AI vector embeddings |
| Parent | medical_documents |
| Storage | pgvector |
| Soft Delete | No |

---

# 11.6 Artificial Intelligence Tables

## ai_summaries

| Property | Value |
|----------|-------|
| Purpose | AI-generated patient summaries |
| Parent | admissions |
| Generated By | users |
| Soft Delete | No |

---

## ai_query_logs

| Property | Value |
|----------|-------|
| Purpose | RAG conversation history |
| Parent | admissions |
| User | users |
| Soft Delete | No |

---

## alerts

| Property | Value |
|----------|-------|
| Purpose | Autonomous AI alerts |
| Parent | admissions |
| Severity | P0 / P1 |
| Soft Delete | No |

---

## alert_reviews

| Property | Value |
|----------|-------|
| Purpose | Clinician review history |
| Parent | alerts |
| Reviewer | users |
| Soft Delete | No |

---

## notifications

| Property | Value |
|----------|-------|
| Purpose | User notifications |
| Parent | users |
| Related To | admissions / alerts |
| Soft Delete | No |

---

# 11.7 System Management Tables

## treatment_approvals

| Property | Value |
|----------|-------|
| Purpose | High-risk treatment approval workflow |
| Parent | admissions |
| Requested By | users |
| Approved By | users |
| Soft Delete | No |

---

## system_settings

| Property | Value |
|----------|-------|
| Purpose | Global application configuration |
| Primary Key | id |
| Updated By | users |
| Soft Delete | No |

---

# 11.8 Database Statistics

| Metric | Value |
|---------|------:|
| PostgreSQL ENUM Types | 24 |
| Tables | 22 |
| Primary Keys | 22 |
| Foreign Keys | 30+ |
| Unique Constraints | 6+ |
| CHECK Constraints | 20+ |
| Recommended Indexes | 40+ |
| JSONB Columns | 8 |
| pgvector Columns | 1 |
| Soft Delete Tables | 9 |

---

# 11.9 Database Design Summary

The SmartCare ICU database has been designed to satisfy the functional and non-functional requirements defined in the project documentation.

Key characteristics include:

- Third Normal Form (3NF) normalization.
- UUID-based primary keys.
- PostgreSQL native ENUM types.
- Referential integrity through foreign key constraints.
- Immutable audit logging.
- Soft deletion for clinical records.
- AI-ready architecture using pgvector.
- Efficient indexing for high-performance querying.
- Secure role-based access control.
- Scalable design suitable for future system expansion.
