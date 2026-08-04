# Medication Management Guide

## Overview

Medication management splits cleanly along role lines:

- **Doctors** (`MEDICAL_RESIDENT`, `ICU_SPECIALIST`) write, amend, and discontinue orders.
- **Nurses** (`ICU_NURSE`) record what actually happened to each dose.

Orders are written either during admission (Step 8 — Treatment Plan) or later from the patient's **Medications** tab. There is no separate ward-wide prescribing page: prescribing always happens in the context of one patient's admission.

Every order carries a structured **frequency**, which the server expands into concrete **dose slots** for a given day. That expansion is the Medication Administration Record (MAR) the nurse works from.

---

## Data Model

### Medication (the order)

| Field                  | Type                       | Description                                                   |
| ---------------------- | -------------------------- | ------------------------------------------------------------- |
| id                     | UUID                       | Primary key                                                   |
| admissionId            | UUID                       | Links to the patient admission                                |
| prescribedById         | UUID                       | Who wrote **this version** of the order                       |
| originalPrescriberId   | UUID (nullable)            | Who wrote the order originally — survives amendments          |
| drugName               | String(200)                | Drug name                                                     |
| dosage                 | String(100)                | e.g. `500mg`                                                  |
| frequency              | `MedicationFrequency`      | Structured dosing frequency (see below)                       |
| frequencyText          | String(100) (nullable)     | Free text, only when `frequency = OTHER`                      |
| route                  | `MedicationRoute` (nullable) | IV / PO / IM / SC / INH / TOPICAL / PR / NG                 |
| instructions           | Text (nullable)            | Nurse-facing note, e.g. "Hold if SBP < 100"                   |
| startDate / endDate    | DateTime (nullable)        | Day-granular validity window; empty end = ongoing             |
| isActive               | Boolean                    | `false` once discontinued                                     |
| allergyAcknowledged    | Boolean                    | `true` if written despite a documented allergy                |
| discontinuedById       | UUID (nullable)            | Who stopped the order                                         |
| discontinuedAt         | DateTime (nullable)        | When it was stopped                                           |
| discontinueReason      | Text (nullable)            | Why it was stopped — shown to the ward                        |
| isArchived             | Boolean                    | `true` only for superseded versions after an amendment        |

### MedicationAdministration (the dose record)

| Field            | Type                    | Description                                              |
| ---------------- | ----------------------- | -------------------------------------------------------- |
| id               | UUID                    | Primary key                                              |
| medicationId     | UUID                    | The order this dose belongs to                           |
| administeredById | UUID                    | Nurse who recorded it                                    |
| status           | `AdministrationStatus`  | `ADMINISTERED` / `REFUSED` / `HELD` / `MISSED`            |
| administeredDose | String(100) (nullable)  | Required when status is `ADMINISTERED`                   |
| notes            | Text (nullable)         | Required when status is **not** `ADMINISTERED`           |
| scheduledTime    | DateTime                | **The slot this dose answers**, not the time of entry     |
| administeredAt   | DateTime (nullable)     | When the nurse actually recorded/gave it                 |
| isArchived       | Boolean                 | `true` for superseded versions after a correction        |

---

## Frequency and the dose schedule

`frequency` is an enum so a schedule can be derived from it. Ward convention: fixed daily times for the named frequencies, and a fixed midnight grid for the interval ones, so every day of an order looks identical.

| Frequency    | Dose slots per day                        |
| ------------ | ----------------------------------------- |
| `OD`         | 08:00                                     |
| `BD`         | 08:00, 20:00                              |
| `TDS`        | 08:00, 14:00, 20:00                       |
| `QDS`        | 08:00, 12:00, 16:00, 20:00                |
| `Q4H`        | 00:00, 04:00, 08:00, 12:00, 16:00, 20:00  |
| `Q6H`        | 00:00, 06:00, 12:00, 18:00                |
| `Q8H`        | 00:00, 08:00, 16:00                       |
| `Q12H`       | 00:00, 12:00                              |
| `STAT`       | a single slot on the start date           |
| `PRN`        | none — recorded ad hoc                    |
| `CONTINUOUS` | none — recorded ad hoc                    |
| `OTHER`      | none — `frequencyText` describes it       |

Orders carry a start and end **date**, not a time. An order produces slots from `startDate` (defaulting to `prescribedAt`) through the **end of** `endDate` — taking the end date literally as midnight would drop the final day's doses.

### Slot status

Each slot is either the status of the dose logged against it, or a derived status:

| Status        | Meaning                                                          |
| ------------- | ---------------------------------------------------------------- |
| `UPCOMING`    | The slot time has not arrived yet                                 |
| `DUE`         | The slot time has passed, within the 60-minute grace period       |
| `MISSED`      | More than 60 minutes past the slot, still nothing logged          |
| `ADMINISTERED` / `REFUSED` / `HELD` / `MISSED` | Taken from the logged dose      |
| `NOT_APPLICABLE` | The order was discontinued, so the slot creates no obligation  |

A dose logged within 2 hours of a slot is matched to that slot. Doses that match no slot (PRN, extra doses) still appear on the record, in time order.

The grace period lives in `GRACE_PERIOD_MINUTES` in `server/src/modules/medications/medication.schedule.js`.

---

## Workflow

### Doctor writes an order

```
Doctor opens the patient's Medications tab → Prescribe
                    |
        Allergy check against the patient's Allergy records
                    |
         conflict? ──── yes ──→ 409, dialog asks the prescriber
            |                    to confirm; re-sent with
            no                   acknowledge_allergy = true
            |                             |
            └───────────┬─────────────────┘
                        |
              Order created (audited)
                        |
        Assigned nurses receive an ALERT notification
                        |
        Slots appear on the nurse's MAR immediately
```

### Nurse records a dose

```
Nurse opens Med Administration, picks the patient and date
                    |
        MAR shows each order expanded into its dose slots
                    |
    ┌───────────────┼────────────────┐
  Given          Refused          Withheld
    |               |                 |
 dose auto-      reason required   reason required
 filled from     (dialog)          (dialog)
 the order
    |               |                 |
    └───────────────┴─────────────────┘
                    |
    Logged against the slot's scheduled time (audited)
```

Recording a dose late still books it against **its own slot**, so an 08:00 dose entered at 09:30 remains an 08:00 dose in the record.

### Doctor amends an order

Amending is append-only. The current order row is archived and a **new order with a new id** is created:

- `originalPrescriberId` carries over, so the first prescriber is never lost.
- Doses already recorded stay attached to the archived version — re-pointing them would falsify what the nurse actually gave.
- The UI refetches rather than patching in place, because the id changes.

### Doctor discontinues an order

`DELETE /medications/:id` requires a `discontinue_reason`. The order is **not** archived — it stays visible under the *Discontinued* tab with who stopped it, when, and why. Assigned nurses are notified.

---

## Safety checks

**Allergy conflict.** Before an order is written, the drug name is matched against the patient's `Allergy` rows, substring in both directions — an allergy to `Penicillin` blocks `Benzylpenicillin`, and vice versa. A conflict returns **409**; the prescriber can confirm, which re-sends with `acknowledge_allergy: true` and sets `allergyAcknowledged` on the order. Both the conflict and the override are recorded in the audit log, and the flag is shown to the nurse on the MAR.

**Duplicate orders.** A new order for a drug that already has an active order comes back with `duplicateWarning` listing the existing order ids. Admission Step 8 flags duplicates inline before submission.

**Double-logging.** A second log for the same slot returns **409**. Corrections go through `PATCH /medication-administrations/:id`, which requires a `modification_reason` and prefixes it onto the notes.

**Audit.** Every prescribe, amend, discontinue, dose log, correction, and deletion is written through `auditedTransaction`, so the audit row and the clinical row commit or roll back together.

---

## API

| Method   | Endpoint                                | Roles                            | Notes                                     |
| -------- | --------------------------------------- | -------------------------------- | ----------------------------------------- |
| `POST`   | `/admissions/:id/medications`           | Resident, Specialist             | Prescribe. 409 on allergy conflict.       |
| `GET`    | `/admissions/:id/medications`           | Nurse, Resident, Specialist      | All orders. `?is_active=true|false`       |
| `GET`    | `/admissions/:id/mar`                   | Nurse, Resident, Specialist      | Dose slots for a day. `?date=YYYY-MM-DD`  |
| `PATCH`  | `/medications/:id`                      | Resident, Specialist             | Amend — returns a **new** order id.       |
| `DELETE` | `/medications/:id`                      | Resident, Specialist             | Discontinue. Body: `discontinue_reason`.  |
| `POST`   | `/medications/:id/administrations`      | Nurse                            | Log a dose against a slot.                |
| `GET`    | `/medications/:id/administrations`      | Nurse, Resident, Specialist      | Dose history for one order.               |
| `PATCH`  | `/medication-administrations/:id`       | Nurse, Resident, Specialist      | Correct a log. Needs `modification_reason`. |
| `DELETE` | `/medication-administrations/:id`       | Resident, Specialist             | Archive an erroneous log.                 |

### Prescribe payload

```json
{
  "drug_name": "Paracetamol",
  "dosage": "1g",
  "frequency": "QDS",
  "route": "PO",
  "instructions": "Hold if the patient is nil by mouth",
  "start_date": "2026-08-04T00:00:00.000Z",
  "end_date": null,
  "acknowledge_allergy": false
}
```

`frequency_text` is required — and only allowed to matter — when `frequency` is `OTHER`.

### MAR response shape

```json
{
  "admission": { "id": "...", "patient": { "name": "..." }, "bed": { "bedNumber": "ICU-3" } },
  "date": "2026-08-04",
  "medications": [
    {
      "id": "...", "drugName": "Paracetamol", "dosage": "1g",
      "frequency": "QDS", "route": "PO", "isScheduled": true,
      "doses": [
        { "scheduledTime": "2026-08-04T08:00:00.000Z", "status": "ADMINISTERED",
          "isOverdue": false, "administration": { "administeredBy": { "firstName": "..." } } },
        { "scheduledTime": "2026-08-04T12:00:00.000Z", "status": "DUE",
          "isOverdue": false, "administration": null }
      ],
      "summary": { "total": 4, "administered": 1, "missed": 0, "due": 1 }
    }
  ],
  "summary": { "total": 4, "administered": 1, "missed": 0, "due": 1 }
}
```

---

## Admission Step 8

Step 8 collects the initial treatment plan with the same fields as the prescribe dialog. The orders are sent **inside** the `POST /admissions/full` payload as a `medications[]` array and written in the same transaction as the admission.

This matters: the previous implementation POSTed each drug separately after the admission was created, so a failure on the third of five drugs left a live admission with a partial treatment plan. Now either every order lands or the admission itself rolls back.

---

## Where the code lives

**Server**

| File                                                    | Responsibility                                  |
| ------------------------------------------------------- | ----------------------------------------------- |
| `server/prisma/medication.prisma`                       | Models and enums                                |
| `server/src/modules/medications/medication.schedule.js` | Slot generation and MAR row building            |
| `server/src/modules/medications/medication.service.js`  | Allergy checks, audit, notifications, CRUD      |
| `server/src/modules/medications/medication.schema.js`   | Joi validation, shared with admission Step 8    |
| `server/src/modules/medications/medication.routes.js`   | Endpoints and role guards                       |
| `server/src/modules/admissions/admission.service.js`    | Step 8 orders inside the admission transaction  |

**Client**

| File                                                              | Responsibility                        |
| ----------------------------------------------------------------- | ------------------------------------- |
| `client/src/features/services/medicationsService.js`              | API calls, frequency/route vocabulary |
| `client/src/features/components/medications/MedicationFormDialog.jsx` | Prescribe / amend dialog          |
| `client/src/features/pages/patient/PatientMedicationsPage.jsx`    | Doctor-facing orders tab              |
| `client/src/features/pages/MedAdministrationPage.jsx`             | Nurse-facing MAR                      |
| `client/src/features/pages/admission/steps/Step8TreatmentPlan.jsx` | Admission treatment plan              |

---

## Tests

```bash
npx jest src/modules/medications
```

`medication.schedule.test.js` runs without a database and covers slot generation and status derivation. `medication.test.js` covers the API: role guards, allergy block and override, discontinuation rules, duplicate slot rejection, and MAR expansion.

---

## Migration notes

`20260804090000_medication_scheduling_and_safety` converts the old free-text `frequency` column into the enum. Existing wording is preserved: recognised values (`BD`, `TID`, `twice daily`, …) map onto the enum, and anything unrecognised becomes `OTHER` with the original text kept in `frequency_text`. Legacy rows have no `route` — it renders as `—` until someone amends the order.
