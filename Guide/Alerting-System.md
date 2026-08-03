# Alerting System Guide

## Overview

The alerting system continuously monitors ICU patients' vital signs, calculates a clinical severity score, optionally enriches alerts with AI-generated reasoning, and delivers real-time notifications to the assigned care team.

---

## Data Model

### Alert

| Field              | Type          | Description                                    |
| ------------------ | ------------- | ---------------------------------------------- |
| id                 | UUID          | Primary key                                    |
| admissionId        | UUID          | Links to the patient admission                 |
| severity           | `P0` / `P1`  | P0 = Critical, P1 = Warning                    |
| title              | String        | Human-readable alert headline                  |
| triggeringMetrics   | JSON          | The vital-sign values and individual scores     |
| clinicalReasoning  | String (nullable) | AI-generated explanation (Bedrock LLM)     |
| status             | `OPEN` / `REVIEWED` / `RESOLVED` | Lifecycle state          |
| isArchived         | Boolean       | Soft-archive flag                              |

### AlertReview

| Field       | Type    | Description                              |
| ----------- | ------- | ---------------------------------------- |
| alertId     | UUID    | The alert being reviewed                 |
| reviewerId  | UUID    | The clinician who reviewed it            |
| reviewNotes | String  | Free-text clinical notes                 |
| accepted    | Boolean | Whether the clinician accepted the alert |

---

## How Alerts Are Triggered

### 1. Cron Job (every 2 minutes)

A scheduled job (`monitoring.job.js`) runs every 2 minutes. It:

1. Fetches all **active admissions** with their latest vital signs.
2. Calculates a **NEWS2 score** for each patient.
3. Creates an alert if the score warrants one (and no OPEN alert already exists for that admission).

### 2. NEWS2 Scoring (`news2.js`)

Five parameters are scored 0-3 each based on standard clinical thresholds:

| Parameter        | Score 3 (Critical)  | Score 2          | Score 1          | Score 0 (Normal) |
| ---------------- | ------------------- | ---------------- | ---------------- | ---------------- |
| Respiratory Rate | <= 8 or >= 25        | 21-24            | 9-11             | 12-20            |
| SpO2             | <= 91               | 92-93            | 94-95            | >= 96            |
| Systolic BP      | <= 90 or >= 220      | 91-100           | 101-110          | 111-219          |
| Pulse            | <= 40 or >= 131      | 111-130 or 41-50 | 51-90            | 91-110           |
| Temperature      | <= 35.0             | >= 39.1          | 35.1-36.0 or 38.1-39.0 | 36.1-38.0 |

### 3. Severity Classification

- **P0 (Critical)**: Total score >= 5 OR any single parameter scores 3
- **P1 (Warning)**: Total score 1-4
- **No alert**: Total score 0

---

## AI Integration (Bedrock)

When an alert is created, the system calls **AWS Bedrock** (`alertAi.service.js`) to generate a clinical reasoning explanation.

- The LLM receives the abnormal vitals and is instructed to explain physiological significance using medical terminology.
- It cites all measured values but avoids diagnoses or treatment recommendations.
- Uses `maxTokens: 300`, `temperature: 0.2` for focused, concise output.
- **Graceful degradation**: If Bedrock fails or times out, `clinicalReasoning` is set to `null` and the alert is still created normally.

---

## Notification Delivery

When an alert is created:

1. The system finds all staff assigned to the admission (doctor + active nurses).
2. Creates a **Notification** record per user with metadata linking to the alert.
3. Pushes each notification over **Socket.IO** in real time.

---

## API Endpoints

All routes require authentication (`verifyToken`).

| Method | Route                          | Access                          | Description                    |
| ------ | ------------------------------ | ------------------------------- | ------------------------------ |
| GET    | `/alerts`                      | Nurse, Resident, Specialist     | Ward-wide alert list           |
| GET    | `/alerts/:id/reviews`          | Nurse, Resident, Specialist     | Reviews for a specific alert   |
| POST   | `/alerts/:id/reviews`          | Resident, Specialist only       | Submit a review/acknowledgement|
| GET    | `/admissions/:id/alerts`       | Nurse, Resident, Specialist     | Alerts scoped to one admission |

---

## Frontend

### Patient Alerts Page (`PatientAlertsPage.jsx`)

- Alerts displayed as cards with a colored left border:
  - **Red** for P0 (Critical)
  - **Yellow** for P1 (Warning)
  - **Muted** for Resolved
- Each card shows: title, severity badge, timestamp, triggering metrics grid with individual scores, total NEWS2 score, and AI clinical reasoning.

### Review Flow

1. A **"Review & Acknowledge"** button is visible only to `MEDICAL_RESIDENT` and `ICU_SPECIALIST` roles.
2. Clicking it opens a dialog showing the AI reasoning and a textarea for clinical notes.
3. Submitting creates an `AlertReview` record and updates the alert status to `REVIEWED`.

---

## Flow Diagram

```
Cron (2 min) --> Fetch active admissions + latest vitals
                      |
                Calculate NEWS2 score
                      |
         Score > 0 && no OPEN alert?
              /              \
            Yes               No --> Skip
             |
     Create Alert (P0/P1)
             |
     Call Bedrock AI (async, fire-and-forget)
             |
     Notify assigned staff (DB + Socket.IO)
             |
     Clinician reviews & acknowledges
             |
     Alert status --> REVIEWED
```
