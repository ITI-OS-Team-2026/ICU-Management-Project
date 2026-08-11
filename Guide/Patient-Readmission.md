# Patient Readmission Guide

## Overview

Readmission is the process of admitting a previously discharged patient back into the ICU. The system handles this by:

1. Identifying eligible discharged patients (those who are **not already active** in the unit).
2. Pre-filling the standard Admission form with data from the patient's previous admission.
3. Creating a **brand-new admission record** — the old admission is never modified.
4. Keeping all historical clinical records (vitals, notes, documents, labs, etc.) permanently attached to the original admission.

Only **ICU Specialists** can initiate a discharge. Any clinical role (`ICU_NURSE`, `MEDICAL_RESIDENT`, `ICU_SPECIALIST`) can initiate a readmission, since it goes through the standard admission flow.

---

## User Workflow

### Step 1 — Discharge page

Navigate to **Discharge** in the sidebar.

The left sidebar shows two lists:

- **Active Patients** — currently admitted patients. Click one to see their details on the right and process a discharge.
- **Discharged Patients** — patients who have been discharged and are **eligible for readmission**. Patients already back in the ICU (i.e. previously readmitted) will not appear here.

### Step 2 — Select a discharged patient

Click a patient in the **Discharged Patients** list. The right panel switches to **"Discharged Patient — Readmission"** mode, showing:

- Patient name and MRN.
- Date and time of discharge.
- Chief complaint and provisional diagnosis from the previous admission.
- A short explanation of what will happen to historical data.
- A prominent **"Readmit Patient"** button.

### Step 3 — Readmit

Click **Readmit Patient**. You are taken to the **Admit Patient** page (`/patients/admit?readmitId=<old-admission-id>`).

The form is pre-filled with data from the previous admission (see [What is prefilled](#what-is-prefilled) below). You must still manually select a **bed**, an **attending specialist**, and a **nurse** — these are never carried forward because the patient is entering a different clinical context.

### Step 4 — Complete the admission form

Fill in all required fields (bed, doctor, nurse, at least one vital sign). The rest of the form is pre-populated as a starting point and can be edited freely.

Click **Submit Admission** on Step 8. A new admission is created and you are redirected to the patient list.

---

## What is Prefilled

When the form loads with a `readmitId`, the following fields are populated from the previous admission:

| Form field | Source |
|---|---|
| National ID | `patient.nationalId` (falls back to `patient.mrn`) |
| Patient name | `patient.name` |
| Age | `patient.age` |
| Gender | `patient.gender` |
| Residence | `patient.residence` |
| Occupation | `patient.occupation` |
| Marital status | `patient.maritalStatus` |
| Handedness | `patient.handedness` |
| Children count / youngest age | `patient.childrenCount`, `patient.youngestChildAge` |
| Chief complaint | `admission.chiefComplaint` |
| Complaint analysis | `admission.complaintAnalysis` |
| Related / other system symptoms | `admission.symptomsRelatedSystem`, `admission.symptomsOtherSystems` |
| Previous investigations | `admission.previousInvestigations` |
| Previous treatments | `admission.previousTreatments` |
| Provisional diagnosis (narrative) | `admission.provisionalDiagnosis` |
| Diagnoses (structured list) | Previous `Diagnosis` rows (all archived/non-archived active ones) |
| Investigation orders | Previous `InvestigationOrder` rows with status `Pending` |

**Not prefilled (must be selected fresh):**

- Bed
- Attending specialist (doctor)
- Assigned nurse
- Transfer reason / place / doctor name
- Vital signs
- General and local examination
- Medications

---

## What Happens to the Old Data

This is the most important part of readmission. **The old admission record is never modified or deleted.** Every clinical record created during a previous admission remains permanently attached to that admission's ID and can be viewed through the patient's historical record.

### Data scoped to the PATIENT (persists across all admissions)

These records exist at the patient level and are shared across every admission:

| Data | Model | Behaviour on readmission |
|---|---|---|
| Demographics | `Patient` | **Updated** with whatever the new admission form contains (age, gender, residence, etc.). |
| Medical history | `MedicalHistory` | **Upserted** — one row per patient. The new form overwrites it. The latest admission's values always win. |
| Allergies | `Allergy` | **Additive only.** New allergens are inserted; existing ones (matched by allergen text) are never duplicated. Nothing is deleted. |

### Data scoped to the ADMISSION (stays on the old admission forever)

All of the following belong to a specific `admissionId`. When a new admission is created, its own UUID becomes the `admissionId` for all future records. Old records under the previous UUID are **never touched**.

| Category | Model(s) | On readmission |
|---|---|---|
| Vital signs | `VitalSign` | Old vitals stay on the old admission. New admission starts with no vitals. |
| Medications | `Medication`, `MedicationAdministration` | Old medication orders stay on the old admission. If the form prefills them, they are written as **new rows** under the new admission. |
| Diagnoses | `Diagnosis`, `DiagnosisAcknowledgement`, `DiagnosisConcern` | Same as medications — old diagnoses are unchanged. Prefilled diagnoses become new rows on the new admission. |
| Lab results | `LabResult` | Stay on the old admission. New admission starts with no labs. |
| Investigation orders | `InvestigationOrder` | Old orders stay on the old admission. Prefilled pending orders become new rows on the new admission. |
| Clinical examinations | `ClinicalExamination` | Stay on the old admission. New admission starts with no examination. |
| Clinical notes | `ClinicalNote` | Stay on the old admission. |
| Nursing notes | `NursingNote` | Stay on the old admission. |
| Follow-ups | `FollowUp` | Stay on the old admission. |
| Documents | `MedicalDocument`, `DocumentEmbedding` | Stay on the old admission. New admission starts with no documents. |
| AI summaries / query logs | `AiSummary`, `AiQueryLog` | Stay on the old admission. |
| Treatment approvals | `TreatmentApproval` | Stay on the old admission. |
| Alerts | `Alert` | Stay on the old admission. |

> **Nothing is ever lost.** All previous clinical records remain queryable by their original `admissionId`. Future versions of the patient history view can display records across multiple admissions.

---

## Duplicate Readmission Prevention

The system prevents a patient from appearing in the readmission list if they are already active in the ICU.

**How it works — two layers:**

### Backend (service layer)

`getAdmissions` in `admission.service.js` accepts a `readmitEligible` query parameter. When `true`, it:

1. Fetches all `patientId`s that currently have an `ACTIVE` (non-archived) admission.
2. Adds a `WHERE patient.id NOT IN (...)` filter to the discharged admissions query.

This means the exclusion applies to every API caller, not just the Discharge page UI.

```
GET /admissions?status=DISCHARGED&readmitEligible=true
```

### Frontend (service call)

`patientsService.getDischargedAdmissionsPaginated()` always passes `readmitEligible: true`. This cannot be bypassed by the Discharge page UI — the filter is embedded at the service level.

---

## State Reset on the Admission Page

The Admission page (`/patients/admit`) has a draft-save system that preserves form state across page reloads (in case the browser crashes mid-form). For readmissions, the draft is keyed differently:

| Scenario | Draft key |
|---|---|
| Normal new admission | `smartcare:admit-patient-draft` |
| Readmission | `smartcare:admit-patient-draft:readmit:<admissionId>` |

**On page leave (without submitting):**
The plain new-admission draft is **cleared on unmount**. This ensures that returning to the Admission page always starts with a blank form — you will never see a previous session's patient data when opening a new admission.

**Readmit drafts** are intentionally preserved when the user navigates away mid-form, so they can be resumed if they return to the same readmission URL.

**On successful submission:**
Both the plain draft and the readmit draft for that admission are cleared.

---

## Discharge List Refresh Behaviour

| Action | Active list refreshes | Discharged list refreshes |
|---|---|---|
| Discharge a patient | ✅ Patient removed from active | ✅ Patient appears in discharged |
| Click Readmit → navigate away | — | ✅ Refreshed on return (patient excluded because they now have an active admission) |
| Manual refresh button (↻) | ✅ | ✅ |

---

## Business Rules Summary

| Rule | Where enforced |
|---|---|
| Only DISCHARGED admissions appear in the readmit list | Server: `readmitEligible` filter in `getAdmissions` |
| A patient already active cannot appear in the readmit list | Server: `readmitEligible` excludes patients with existing `ACTIVE` admissions |
| Readmission creates a new admission — old record is untouched | Server: `createFullAdmission` always creates a new row |
| Historical records remain on the old admission | Database: all clinical models have `admissionId` FK, never moved |
| Patient demographics and medical history are updated on readmission | Server: `upsert` on `Patient` and `MedicalHistory` inside the admission transaction |
| Existing allergens are never duplicated | Server: allergen text is checked before insert |
| Bed, doctor, nurse must be re-selected on every admission | Server: required fields in `fullAdmissionCreateSchema` |

---

## Where the Code Lives

**Server**

| File | Responsibility |
|---|---|
| `server/prisma/admission.prisma` | `Admission`, `AdmissionNurse` models |
| `server/prisma/patient.prisma` | `Patient`, `MedicalHistory`, `Allergy` models |
| `server/src/modules/admissions/admission.service.js` | `createFullAdmission`, `getAdmissions` (with `readmitEligible`), `dischargeAdmission` |
| `server/src/modules/admissions/admission.schema.js` | `admissionQuerySchema` — `readmitEligible` field |
| `server/src/modules/admissions/admission.routes.js` | `GET /admissions`, `PATCH /admissions/:id/discharge` |

**Client**

| File | Responsibility |
|---|---|
| `client/src/features/pages/DischargePage.jsx` | Discharge + readmit list, detail panel, readmit action |
| `client/src/features/pages/AdmitPatientPage.jsx` | Admission form, readmit prefill, draft management, state reset |
| `client/src/features/services/patientsService.js` | `getDischargedAdmissionsPaginated` — passes `readmitEligible: true` |
