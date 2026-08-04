# Diagnosis Workflow Guide

## Overview

The diagnosis module records **what the team thinks is wrong with the patient, and how certain they are**. It is built around the way ICU work actually happens: you admit with a differential, you confirm some conditions and eliminate others, and eventually the ones you treated resolve.

Roles split cleanly:

- **Doctors** (`MEDICAL_RESIDENT`, `ICU_SPECIALIST`) record diagnoses and move them through the differential.
- **Nurses** (`ICU_NURSE`) do not diagnose. They **acknowledge** diagnoses so the ward can prove the bedside nurse saw them, and they can **raise a concern** when a patient's presentation does not fit what is recorded.

Diagnoses are entered either during admission (Step 6) or later from the patient's **Diagnoses** tab. There is no ward-wide diagnoses page — a diagnosis only exists in the context of one admission.

The problem list is not decorative. `patientSummary.service.js`, the RAG retrieval layer and the admin dashboard all read this table directly.

---

## Data Model

### Diagnosis

| Field                 | Type                    | Description                                                     |
| --------------------- | ----------------------- | --------------------------------------------------------------- |
| id                    | UUID                    | Primary key                                                     |
| admissionId           | UUID                    | Links to the patient admission                                  |
| conditionName         | String(255)             | The condition                                                   |
| icdCode               | String(20) (nullable)   | ICD-10 code, shape-validated                                    |
| type                  | `DiagnosisType`         | PRIMARY / SECONDARY / COMORBIDITY / COMPLICATION                |
| status                | `DiagnosisStatus`       | SUSPECTED / CONFIRMED / RULED_OUT / RESOLVED                    |
| clinicalNotes         | Text (nullable)         | The reasoning — what supports this                              |
| onsetDate             | DateTime (nullable)     | When the condition began, not when it was typed in              |
| diagnosedById         | UUID                    | Who authored **this version**                                   |
| originalDiagnosedById | UUID (nullable)         | Who authored it originally — survives amendments                |
| ruledOutReason        | Text (nullable)         | Why it was excluded                                             |
| resolvedAt            | DateTime (nullable)     | When it resolved                                                |
| resolutionReason      | Text (nullable)         | How it resolved                                                 |
| statusChangedById     | UUID (nullable)         | Who last moved it through the differential                      |
| isArchived            | Boolean                 | `true` only for superseded versions after an amendment          |

### DiagnosisAcknowledgement

One row per nurse per diagnosis version, uniquely constrained on `(diagnosisId, nurseId)`. Because amending creates a **new diagnosis id**, an amended condition must be acknowledged again — which is the point.

### DiagnosisConcern

| Field         | Type            | Description                                    |
| ------------- | --------------- | ---------------------------------------------- |
| note          | Text            | What the nurse is observing                    |
| status        | `ConcernStatus` | OPEN / ADDRESSED / DISMISSED                   |
| responseNote  | Text (nullable) | The doctor's answer — required to close it     |
| respondedById | UUID (nullable) | Which doctor answered                          |

---

## The differential

### Statuses

| Status       | Meaning                                        |
| ------------ | ---------------------------------------------- |
| `SUSPECTED`  | In the differential, not yet proven            |
| `CONFIRMED`  | Supported by evidence                          |
| `RULED_OUT`  | Excluded from the differential                 |
| `RESOLVED`   | Treated and no longer active                   |

### Allowed transitions

```
   SUSPECTED ──confirm──→ CONFIRMED ──resolve──→ RESOLVED
       │                      │                      │
       │                      │                      └──relapse──→ CONFIRMED
       └──rule out──→ RULED_OUT ←──rule out──┘
                          │
                     (terminal)
```

`RULED_OUT` is deliberately terminal. If a condition is reconsidered, a **new** diagnosis is raised, so the record shows the team came back to it rather than quietly reviving an old row.

**Every transition requires a written reason.** That reason is the clinical record of why the differential moved, and it lands in a different field depending on the destination:

| Transition   | Where the reason is stored | Prompt shown to the doctor |
| ------------ | -------------------------- | -------------------------- |
| → CONFIRMED  | `clinicalNotes`            | "Supporting evidence"      |
| → RULED_OUT  | `ruledOutReason`           | "Why is this excluded?"    |
| → RESOLVED   | `resolutionReason` + `resolvedAt` | "How was it resolved?" |

Each outcome writes only its own field, so a relapsed-then-resolved condition never carries a stale rule-out reason.

### Primary diagnosis

Only one condition per admission can be `PRIMARY` — the reason for admission. Promoting a new primary automatically demotes the incumbent to `SECONDARY`. In admission Step 6, the first condition entered defaults to primary and any extra primaries are demoted server-side.

---

## Workflow

### Doctor — working the differential

```
Admission Step 6: enter the working diagnoses
         (each SUSPECTED or CONFIRMED, one marked PRIMARY)
                          ↓
      Real Diagnosis rows, written in the admission transaction
                          ↓
          Assigned nurses notified; problem list is live
                          ↓
    Ward round → Diagnoses tab → per-diagnosis actions:
        Confirm / Rule out / Resolve   (reason required)
        Amend                          (append-only, authorship preserved)
                          ↓
              Nurses notified on every change
```

### Nurse — acknowledge and flag

```
Notification: "New diagnosis recorded"
                    ↓
        Diagnoses tab → Acknowledge
                    ↓
   Presentation doesn't fit? → Raise a concern
                    ↓
        Attending doctor notified immediately
                    ↓
     Doctor answers: Address or Dismiss (answer required)
                    ↓
        The nurse who raised it is notified back
```

A nurse never changes a diagnosis. A concern is a **nursing observation**, and the doctor must write an answer — a bare status change is rejected.

The nurse also sees the open problem list without leaving their own screens: a condensed **Active problems** strip appears on the Medication Administration page and the Vitals Entry page, marking suspected conditions distinctly from confirmed ones.

### Amending

Amending is append-only. The current row is archived and a new one is created:

- `originalDiagnosedById` carries over, so the first author is never lost.
- The id changes, so the UI refetches rather than patching in place.
- Acknowledgements do not carry over — nurses re-acknowledge the amended version.
- Status cannot be changed this way; `PATCH /diagnoses/:id` rejects a status change with a message pointing at the status endpoint.

---

## Safety and integrity

**Duplicate detection.** Creating a diagnosis whose name matches an existing open (`SUSPECTED` or `CONFIRMED`) condition returns `duplicateWarning` with the existing ids. Step 6 flags duplicates inline before submission.

**ICD-10 validation.** Codes are shape-checked (`^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$`) on both client and server. This catches typos; it does not validate against the real code set. A short list of ~24 common ICU conditions with their codes powers the autocomplete chips — a convenience, not a coding system. Free text stays valid.

**Audit.** Every create, amend, status change, archive, acknowledgement, concern and response is written through `auditedTransaction`, so the audit row and the clinical row commit or roll back together.

**Onset validation.** Onset cannot be in the future.

---

## API

| Method   | Endpoint                                  | Roles                       | Notes                                        |
| -------- | ----------------------------------------- | --------------------------- | -------------------------------------------- |
| `POST`   | `/admissions/:id/diagnoses`               | Resident, Specialist        | Create. Status limited to SUSPECTED/CONFIRMED. |
| `GET`    | `/admissions/:id/diagnoses`               | Nurse, Resident, Specialist | Problem list. `?status=` filter.              |
| `GET`    | `/admissions/:id/diagnosis-concerns`      | Nurse, Resident, Specialist | Open nursing concerns on this admission.      |
| `PATCH`  | `/diagnoses/:id`                          | Resident, Specialist        | Amend — returns a **new** id. No status.      |
| `PATCH`  | `/diagnoses/:id/status`                   | Resident, Specialist        | Confirm / rule out / resolve. Reason required. |
| `DELETE` | `/diagnoses/:id`                          | Resident, Specialist        | Archive an entry made in error.               |
| `POST`   | `/diagnoses/:id/acknowledge`              | Nurse                       | Idempotent — one row per nurse.               |
| `POST`   | `/diagnoses/:id/concerns`                 | Nurse                       | Raise a nursing concern.                      |
| `PATCH`  | `/diagnosis-concerns/:id`                 | Resident, Specialist        | Answer a concern. `response_note` required.   |

### Create payload

```json
{
  "condition_name": "Community-acquired pneumonia",
  "icd_code": "J18.9",
  "type": "PRIMARY",
  "status": "SUSPECTED",
  "clinical_notes": "Right basal crackles, CXR consolidation, CRP 180",
  "onset_date": "2026-08-03T22:00:00.000Z"
}
```

### Status change payload

```json
{ "status": "RULED_OUT", "reason": "CTPA negative; raised D-dimer explained by sepsis" }
```

`resolved_at` is accepted only when `status` is `RESOLVED`, and defaults to now.

---

## Admission Step 6

Step 6 now collects a **structured problem list** as well as the narrative. The structured entries are sent inside the `POST /admissions/full` payload as a `diagnoses[]` array and written in the same transaction as the admission.

The free-text `provisional_diagnosis` field remains as the **diagnostic summary** — the reasoning around the differential. It is no longer the only record of what is wrong with the patient.

Before this change, Step 6 wrote one text blob to `admission.provisionalDiagnosis` and created no `Diagnosis` rows at all, and no screen in the application could create one. The table was populated only by the seeder, which meant every real admission had an empty problem list — and the AI summary and RAG retrieval were quietly running on nothing.

---

## Where the code lives

**Server**

| File                                                    | Responsibility                                     |
| ------------------------------------------------------- | -------------------------------------------------- |
| `server/prisma/diagnosis.prisma`                        | Models and enums                                   |
| `server/src/modules/diagnoses/diagnosis.service.js`     | Transitions, audit, notifications, concerns        |
| `server/src/modules/diagnoses/diagnosis.schema.js`      | Joi validation, shared with admission Step 6       |
| `server/src/modules/diagnoses/diagnosis.routes.js`      | Endpoints and role guards                          |
| `server/src/modules/admissions/admission.service.js`    | Step 6 diagnoses inside the admission transaction  |

**Client**

| File                                                                  | Responsibility                        |
| --------------------------------------------------------------------- | ------------------------------------- |
| `client/src/features/services/diagnosesService.js`                    | API calls, statuses, ICD suggestions  |
| `client/src/features/components/diagnoses/DiagnosisFormDialog.jsx`    | Record / amend dialog                 |
| `client/src/features/components/diagnoses/ReasonDialog.jsx`           | Captures the mandatory written reason |
| `client/src/features/components/diagnoses/DiagnosisContextStrip.jsx`  | Problem list on the nurse's screens   |
| `client/src/features/pages/patient/PatientDiagnosesPage.jsx`          | The diagnoses tab, both roles         |
| `client/src/features/pages/admission/steps/Step6ProvisionalDiagnosis.jsx` | Admission problem list            |

---

## Tests

```bash
npx jest src/modules/diagnoses
```

21 tests covering role guards, every allowed and forbidden transition, the mandatory reason, resolution fields, primary demotion, duplicate warnings, ICD validation, idempotent acknowledgement, and the full concern round trip.

---

## Migration notes

Three migrations ship with this feature:

- `20260804180000_diagnosis_workflow` — replaces the status enum, adds classification, ICD code, reasoning, onset and the outcome trail, and creates the acknowledgement and concern tables. Existing `ACTIVE` rows become `CONFIRMED`: every one was entered by a doctor as a working diagnosis, so treating them as suspected would misrepresent the record.
- `20260804183000_backfill_primary_diagnosis` — every pre-existing row defaulted to `SECONDARY`, leaving admissions with no reason for admission marked. Promotes the earliest diagnosis on each admission, and only touches admissions that have no primary at all.

Two consumers were reading the old status and had to move with it: the admin dashboard's per-patient condition lookup, and the AI patient summary's active/resolved split. Both now treat `CONFIRMED` and `SUSPECTED` as the active problem list.
