# AI Patient Summary Guide

## Overview

The AI Patient Summary feature aggregates a patient's complete clinical data and sends it to an LLM (AWS Bedrock) to generate a structured, physician-grade clinical summary. Summaries are stored in the database and can be archived/restored.

---

## Data Model

### AiSummary

| Field          | Type                              | Description                          |
| -------------- | --------------------------------- | ------------------------------------ |
| id             | UUID                              | Primary key                          |
| admissionId    | UUID                              | Links to the patient admission       |
| requestedById  | UUID                              | The clinician who requested it       |
| summaryType    | `TWENTY_FOUR_HOUR` / `ON_DEMAND`  | Type of summary                      |
| overallSummary | TEXT                              | The generated markdown summary       |
| generatedAt    | DateTime                          | When it was generated                |
| isArchived     | Boolean                           | Soft-delete flag                     |

---

## How It Works

### 1. Data Aggregation (`patientSummary.service.js`)

The `aggregatePatientData` function fetches all clinical data in parallel:

| Data Source            | Quantity        |
| ---------------------- | --------------- |
| Patient demographics   | Name, MRN, age, gender, allergies, medical history |
| Admission details      | Bed, doctor, assigned nurses |
| Diagnoses              | All (deduplicated) |
| Vital signs            | Last 20 readings |
| Lab results            | Last 30 results (abnormal prioritized) |
| Medications            | All active (categorized into 11 therapeutic classes) |
| Investigation orders   | Last 20 |
| Clinical notes (SOAP)  | Last 10 |
| Nursing notes          | Last 10 |
| Clinical examinations  | Last 5 |
| Follow-ups             | Last 10 |

This data is formatted into a structured markdown prompt with explicit missing-data indicators when sections are empty.

### 2. LLM Generation

**Primary path (Bedrock)**: The aggregated data is sent to AWS Bedrock with a system prompt acting as a **"Senior ICU Intensivist Physician"**. The prompt enforces:

- Problem-oriented reasoning
- Evidence-based linking
- Confidence-aware language
- Conservative recommendations

**Mandatory 12-section output structure**:

1. Executive Summary
2. Clinical Alerts
3. ICU Admission Context
4. Current Clinical Assessment
5. Active Diagnoses
6. Lab Findings
7. Vital Signs Analysis
8. Active Treatments
9. Medical History
10. Clinical Concerns
11. Recommendations
12. Closing Disclaimer

Config: `maxTokens: 3072`, model configurable via `BEDROCK_MODEL_ID` env var.

**Legacy path (n8n webhook)**: An alternative path calls an n8n webhook for summary orchestration, falling back to a local stub response when no webhook URL is configured.

### 3. Storage

Summaries are persisted to the database on every generation (no in-memory caching). All writes go through `auditedTransaction` for audit logging.

---

## API Endpoints

All routes require authentication (`verifyToken`).

| Method | Route                                        | Access                      | Description                          |
| ------ | -------------------------------------------- | --------------------------- | ------------------------------------ |
| POST   | `/ai/admissions/:admissionId/patient-summary` | Resident, Specialist        | Generate a Bedrock summary           |
| GET    | `/ai/admissions/:admissionId/patient-context` | Resident, Specialist        | Preview aggregated data (no LLM call)|
| POST   | `/ai/summary`                                | Resident, Specialist        | Legacy n8n-based summary             |
| GET    | `/admissions/:id/summaries`                  | Nurse, Resident, Specialist | List summaries for an admission      |
| DELETE | `/ai/summaries/:summaryId`                   | Resident, Specialist        | Soft-delete (archive) a summary      |
| PATCH  | `/ai/summaries/:summaryId/restore`           | Resident, Specialist        | Restore an archived summary          |

---

## Frontend (`PatientAIAssistantPage.jsx`)

A two-panel React page:

- **Left panel**: Summary history with Active/Archived tabs, showing timestamps, author names, and archive/restore buttons.
- **Right panel**: Renders the selected summary as formatted markdown via `<FormattedMarkdown>`.

### Generation UX

During generation, an animated checklist shows progress through 7 clinical data sources being gathered, giving the clinician visibility into what the AI is processing.

Additional features: copy-to-clipboard, archive confirmation dialog, error/success alerts.

---

## Flow Diagram

```
Clinician clicks "Generate Summary"
            |
    Aggregate patient data (parallel DB queries)
            |
    Format into structured markdown prompt
            |
    Send to Bedrock LLM (system prompt: Senior ICU Intensivist)
            |
    Receive 12-section clinical summary
            |
    Store in DB (audited transaction)
            |
    Render as formatted markdown in UI
```
