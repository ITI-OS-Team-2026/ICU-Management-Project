# Patient Admission Flow

Multi-step form for the full ICU patient admission process.
Each step maps to one screen/card in the `Admit Patient` page.

---

## Step 1 — Admission Info

> Basic transfer details. Identifies the patient and the reason for admission.

| Field | Type | Notes |
|---|---|---|
| `national_id` | Text | National ID number |
| `name` | Text | Full patient name |
| `place_of_transfer` | Text | Hospital / clinic transferred from |
| `transfer_doctor_name` | Text | Referring doctor's name |
| `transfer_reason` | Textarea | Reason for transfer |

---

## Step 2 — History Taking

> Structured clinical history. Composed of five sub-sections, each rendered as a labelled card inside this single step.

### 2.1 Personal History

| Field | Type | Options / Notes |
|---|---|---|
| `name` | Text | Patient name (auto-filled from Step 1) |
| `age` | Number | |
| `gender` | Select | Male / Female |
| `residence` | Text | |
| `occupation` | Text | |
| `marital_status` | Select | Single / Married |
| `handedness` | Select | Right / Left |

### 2.2 Chief Complaint

| Field | Type | Notes |
|---|---|---|
| `chief_complaint` | Textarea | Verbatim words of the patient |

### 2.3 Present History

| Field | Type | Notes |
|---|---|---|
| `complaint_analysis` | Textarea | Analysis of the complaint |
| `related_system_symptoms` | Textarea | Symptoms of the related system |
| `other_system_symptoms` | Textarea | Symptoms of other systems |
| **Investigations & Treatment** | | *Separate sub-group* |
| `previous_investigations` | Object | `{ labs: string, radiology: string }` — stored as JSONB |
| `previous_medicines` | Textarea | Previous medications — stored as `previous_treatments` |
| **Comorbidities** | | *Separate sub-group* |
| `dm` | Select | Yes / No — Diabetes Mellitus |
| `htn` | Select | Yes / No — Hypertension |

### 2.4 Past History

> Paragraph-first: the doctor can write a free paragraph **or** expand individual structured fields.

| Field | Type | Options / Notes |
|---|---|---|
| `past_history_paragraph` | Textarea | Free-text summary (can be left empty) |
| `similar_conditions` | Select + Text | No / Yes → if Yes, a text field appears |
| `past_diseases` | Dynamic List | Add/remove disease entries |
| `previous_operations` | Select | No / Yes |
| `allergies` | Select | Yes / No |
| `traveled_abroad` | Select | Yes / No |

> **Add-a-field feature:** a button to append a custom key-value pair (label + value) for anything not covered above.

### 2.5 Family History

| Field | Type | Options / Notes |
|---|---|---|
| `consanguinity` | Select | Yes / No — are the parents relatives? |
| `similar_conditions` | Textarea | Description of similar conditions in the family |
| `inherited_diseases` | Textarea | Known inherited diseases |

---

## Step 3 — Vital Signs

> Numeric measurements taken on admission. Each field has a defined clinical range.

| Field | Type | Unit | Range / Notes |
|---|---|---|---|
| `temperature` | Number | °C | 35 – 45 |
| `pulse` | Number | bpm | |
| `blood_pressure` | Text | mmHg | Format: `120/80` |
| `respiratory_rate` | Number | breaths/min | |
| `spo2` | Number | % | |

---

## Step 4 — General Examination

> Each item is a Positive / Negative toggle with an optional free-text notes field that appears on Positive.

| Examination Item | Type |
|---|---|
| `appearance_consciousness` | Toggle (Positive / Negative) + Notes |
| `built_nutrition` | Toggle (Positive / Negative) + Notes |
| `complexion` | Toggle (Positive / Negative) + Notes |
| `decubitus_attitude` | Toggle (Positive / Negative) + Notes |
| `head_neck` | Toggle (Positive / Negative) + Notes |
| `upper_lower_limbs` | Toggle (Positive / Negative) + Notes |
| `skin_lymph_nodes` | Toggle (Positive / Negative) + Notes |
| `other_systems` | Toggle (Positive / Negative) + Notes |

---

## Step 5 — Local Examination

> Four standard examination methods. Each is a free-text field.

| Field | Type | Notes |
|---|---|---|
| `inspection` | Textarea | |
| `palpation` | Textarea | |
| `percussion` | Textarea | |
| `auscultation` | Textarea | |

---

## Step 6 — Provisional Diagnosis

> The doctor's working diagnosis before investigation results.

| Field | Type | Notes |
|---|---|---|
| `provisional_diagnosis` | Textarea | Free-text diagnosis paragraph |

---

## Step 7 — Investigations

> Ordered labs and radiology. Dynamic list — add as many entries as needed.

Each row:

| Field | Type | Notes |
|---|---|---|
| `type` | Text | e.g., CBC, Chest X-Ray, CT Head |
| `date` | Date | Requested / performed date |

---

## Step 8 — Treatment Plan

> Prescribed medications. Dynamic list — add as many rows as needed.

Each row:

| Field | Type | Notes |
|---|---|---|
| `drug` | Text | Medicine name |
| `dose` | Text | e.g., 500 mg twice daily |
| `start_date` | Date | |
| `end_date` | Date | Leave empty for open-ended |

---

## Step Summary

| Step | Title | Key Data |
|---|---|---|
| 1 | Admission Info | Patient ID, transfer details |
| 2 | History Taking | Personal, Chief Complaint, Present, Past, Family |
| 3 | Vital Signs | Temp, Pulse, BP, RR, SpO2 |
| 4 | General Examination | 8 system toggles |
| 5 | Local Examination | Inspection, Palpation, Percussion, Auscultation |
| 6 | Provisional Diagnosis | Free-text diagnosis |
| 7 | Investigations | Requested labs & radiology |
| 8 | Treatment Plan | Medication list |
