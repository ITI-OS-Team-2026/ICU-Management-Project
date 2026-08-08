# SmartCare ICU — Product Pitch

---

## Tagline

A web system for ICU hospitals that puts all patient information in one place and uses AI to help doctors find what they need, fast.

---

## The Problem

ICU doctors today have to collect patient information from paper charts, separate lab systems, and different note apps during every shift. When a resident wants to know what happened to a patient in the last 24 hours, they have to search through handwritten vital-signs sheets, a separate lab website, and notes written by the previous shift team. This search can take 10 to 20 minutes per patient, per handover — time that should be spent on patient care.

---

## My Solution

SmartCare ICU replaces paper and disconnected systems with a single web application that stores all patient records in one place — vital signs, lab results, medications, notes, scan documents, examinations, and diagnoses. The system then does three things with this data: it creates a clear summary of the last 24 hours for any patient in under five seconds; it answers questions about a patient's history in plain language and shows exactly where each answer came from; and it runs a background agent that watches incoming vital signs and sends a warning alert before the patient's condition becomes critical. Doctors stop searching and start making decisions.

---

## Project Overview

SmartCare ICU is a web application built for use inside a single ICU. System administrators create user accounts and set up ICU beds. Nurses use the app to record hourly vital signs and carry out the medication plan as ordered by the doctor. Residents write clinical examinations, follow-up notes, diagnoses, test orders, lab results, and medications. Specialists check the patient dashboard during their rounds, read AI summaries and alert explanations, approve treatment changes, and confirm patient discharge. All four roles see the same patient data through one dashboard. The dashboard adjusts what each role can see and do based on their account type. No paper is used at any point during a patient's stay.

---

## Key Features

- **Unified Patient Dashboard** — One screen that shows all vitals, labs, medications, notes, examinations, diagnoses, and documents for a patient, with a fixed header at the top that always shows key patient details.
- **Real-Time Vital Signs Charting** — Records temperature, pulse, blood pressure, breathing rate, and SpO2 with automatic checks for values outside safe ranges; if a value is unusual, the nurse must write a reason before saving.
- **One-Click AI Patient Summary** — Creates a 24-hour written summary of the patient's condition, organized by heart, lungs, kidneys, and brain status, in under five seconds.
- **Conversational AI Assistant (RAG)** — Lets doctors ask questions about a patient's history in normal language and shows the exact source and time for every answer; also supports voice input and output for hands-free use at the bedside.
- **Autonomous Monitoring Agent** — Watches incoming vital signs at all times and sends ranked alerts (emergency or warning) with the exact numbers that triggered it and suggested next steps, before the situation becomes critical.
- **Role-Based Access Control** — Four user roles (System Admin, ICU Nurse, Medical Resident, ICU Specialist) with strict permissions enforced at the server and database level; the System Admin cannot read any patient medical data.
- **Structured Clinical Documentation** — Covers medical history, examinations, follow-up notes, diagnoses, test orders, lab results, medications, and clinical notes — all with data checks and safe deletion that keeps old records for legal purposes.
- **ICU Bed and Admission Management** — Handles patient admission, bed assignment, nurse assignment, handover history, and discharge — which only the ICU Specialist can approve.
- **Medical Document and Radiology Upload** — Doctors and nurses can attach lab reports, scan images, and other files directly to the patient's record.
- **Patient Timeline** — A list of every clinical event during a patient's stay, in order by time, so any team member can quickly understand what happened across shifts.
- **Immutable Audit Log** — Every action in the system — adding, editing, deleting, logging in — is saved permanently and cannot be changed, to meet legal and hospital compliance rules.
- **Login Security and Account Lockout** — Tracks failed login attempts; locks an account after five failed tries in 15 minutes; gives the System Admin a simple workflow inside the app to unlock accounts.
- **Dashboard Reporting** — Shows key numbers and activity for the ICU to authorized roles at a glance.

---

## Target Customer — Main Segment

**Hospital ICU departments** in medium and large hospitals that still use paper charts or separate systems to manage patient data. The doctors and nurses need faster access to complete and correct patient information during their shifts, and the hospital management needs a system that controls who can see what data and keeps a full record of every action for legal reasons.

---

## Target Customer — Other Segments

- **Teaching hospitals and university hospitals** — Medical residents work in the ICU as part of their training and need a system that helps them document their work properly, understand AI clinical reasoning, and lets supervisors review everything they do.
- **Private specialty hospitals with an ICU** — Smaller hospitals that cannot afford large EHR systems but need a complete, compliant ICU management tool that covers everything from admission to discharge.
- **Healthcare IT teams** — Technical teams inside hospitals or software companies who are building or improving hospital systems and want a working example of a secure, AI-powered clinical data platform they can learn from or build on.

---

## Revenue Model

**Annual subscription paid by the hospital — one payment per year, per ICU.**

The hospital pays for one ICU, not per individual user. The hospital's IT or procurement team signs a yearly contract that gives unlimited access to all four user roles inside one ICU. There is no extra charge per user and no fee per action. The hospital pays once at the start of the year and renews each year. A separate one-time setup fee covers moving existing data, training staff, and setting up beds, roles, and user accounts — this keeps the yearly renewal price clear and simple.

---

## Price Point (EGP / USD)

**100,000 EGP per ICU per year** (about 8,300 EGP per month / ~$1,650 per year at current exchange rates).

This includes: unlimited users inside the ICU, all AI features (summaries, AI assistant, monitoring agent), hosting, and standard support with a guaranteed reply within 24 hours.

One-time setup fee: **20,000 EGP per ICU** (paid once when the contract is signed, covers staff training and system configuration).

Premium support option (a dedicated contact person, 4-hour response guarantee, quarterly check-in): **+30,000 EGP per year**.

Pricing is set in Egyptian pounds to protect hospitals from currency changes. For private hospitals that prefer USD contracts, the equivalent is available at the current Nile rate on the signing date.

For comparison: a 20-bed ICU at a mid-size Egyptian hospital spends more than this every year on paper chart supplies, printed lab forms, and the extra nursing time spent searching for records — before counting any cost from medical errors caused by missing or late information.

---

## Your First 100 Customers

The plan to reach the first 100 customers is direct and uses real relationships, not general advertising:

1. **Egyptian Ministry of Health university hospitals** — These hospitals are public, have known locations, and all run ICUs. The target is to contact the medical directors and head nurses at Cairo University Hospitals (Kasr El Ainy), Ain Shams University Hospitals, and Alexandria University Hospitals — all of which have teaching ICUs with residents. Going directly to these people skips general marketing and reaches the people who make the buying decision.

2. **Private hospital groups** — Specific targets: Cleopatra Hospital Group, As-Salam International Hospital, and Dar Al Fouad Hospital. These are large private hospitals with ICUs, IT teams that can evaluate software, and faster buying processes than government hospitals. If one department head recommends the system, the next hospital in the same group is an easy next sale.

3. **Medical conferences** — The Egyptian Society of Critical Care Medicine (ESCCM) holds a yearly conference attended by ICU specialists and department heads from all over Egypt. A demo booth or poster at this event puts the product in front of exactly the doctors who will recommend it to their hospital management.

4. **Paid pilot program** — The first five hospitals are offered a 90-day trial at half the yearly price ($9,000), with the option to continue as a full subscriber at the end. This makes the decision easier for hospital committees to approve without a long formal process, and it creates the first group of reference hospitals whose department heads can recommend the system to other hospitals they know.

---

## Competitors (MENA Region)

### 1. PaxeraHealth

**Website:** https://paxerahealth.com

**What they do:** PaxeraHealth builds AI-powered medical imaging tools for hospitals. Their main products help radiologists read and store scan images faster. They also have a tool that lets hospitals build their own imaging AI without writing code. They work closely with the Egyptian Ministry of Health and have a local office in Cairo (Smart Village).

**How SmartCare ICU is different:** PaxeraHealth focuses only on radiology and scan images — they do not manage what happens to a patient inside the ICU. They have no vital signs tracking, no clinical notes, no medication management, no shift handover, and no AI assistant that answers questions about a patient's history. A hospital that uses PaxeraHealth still needs a separate system to run the ICU. SmartCare ICU covers the full ICU workflow from admission to discharge, with AI built around patient data, not scan images.

---

### 2. Banao Technologies

**Website:** https://banao.tech

**What they do:** Banao Technologies is an international software company with a presence in the UAE that builds custom healthcare software for hospitals — including electronic health record (EHR) systems, telemedicine tools, and AI-powered diagnostic features. They build to order for each client rather than selling a ready-made product.

**How SmartCare ICU is different:** Banao Technologies is a development agency — they build custom software per project, which means each hospital pays for a full development cycle, gets a one-off system with no shared updates, and has no product community behind it. SmartCare ICU is a finished, ready-to-deploy product built specifically for ICU workflows. It can go live in days, not months. It also includes features Banao does not offer out of the box: a conversational RAG assistant trained on the patient's own clinical history, an autonomous vital signs monitoring agent with explainable alerts, and a complete role-based ICU workflow covering nurses, residents, and specialists.

---

## AI — Technical Specification

The system has three separate AI features. Each is described below with exact inputs, exact outputs, and honest answers about how it works.

---

### Feature 1: Patient Summary (One-Click AI Summary)

**What the AI receives:**

- `patient.name`, `patient.mrn`, `patient.age`, `patient.gender`
- `patient.medicalHistory` (full record)
- `patient.allergies[]` — each with substance name and reaction type
- `admission.chiefComplaint`, `admission.provisionalDiagnosis`, `admission.admittedAt`, `admission.status`
- `bed.bedNumber`
- `doctor.firstName`, `doctor.lastName`, `doctor.role`
- `nurses[].firstName`, `nurses[].lastName` (currently assigned, unarchived)
- `diagnoses[]` — up to all active diagnoses, each with `description`, `diagnosedAt`, and the name of who diagnosed it
- `vitalSigns[]` — the 20 most recent records, each with `temperature`, `pulse`, `systolicBp`, `diastolicBp`, `respiratoryRate`, `spo2`, `recordedAt`, and `isOverride` flag
- `labResults[]` — the 30 most recent, each with `testName`, `value`, `unit`, `referenceRange`, `isAbnormal`, `recordedAt`
- `medications[]` — all active, each with `drugName`, `dose`, `route`, `frequency`, `prescribedAt`
- `investigationOrders[]` — 20 most recent, each with `orderType`, `description`, `status`, `orderDate`
- `clinicalNotes[]` — 10 most recent, with `content`, `createdAt`, and author name and role
- `nursingNotes[]` — 10 most recent, with `content`, `createdAt`, and author name and role
- `clinicalExaminations[]` — 5 most recent, with full examination fields
- `followUps[]` — 10 most recent SOAP follow-up notes, each with author name and role

**What the AI produces:**

A single Markdown text response structured into these exact sections, in this exact order:

1. `## Executive Summary` — one paragraph: why the patient is in the ICU, current condition, top problems, safety concerns
2. `## Clinical Alerts` — medication safety warnings and allergy conflicts, or "No critical medication safety alerts identified"
3. `## ICU Admission` — synthesis of chief complaint, admission diagnosis, and care team
4. `## Current Clinical Assessment` — organ-by-organ synthesis: Hemodynamic, Respiratory, Neurological, Renal/Metabolic, Infectious, Overall Stability
5. `## Active Diagnoses` — bullet list ordered by priority
6. `## Significant Laboratory Findings` — abnormal values flagged with ⚠ ABNORMAL
7. `## Vital Signs` — summary of latest values and trends (only if multiple readings exist)
8. `## Active Treatments` — medications grouped by therapeutic class
9. `## Medical History` — past history not duplicated in active diagnoses
10. `## Clinical Concerns` — ranked list of current risks
11. `## Recommendations` — conservative next steps only (no prescriptions)
12. A fixed closing disclaimer quote block

---

### Feature 2: RAG Assistant (Conversational Clinical Query)

**What the AI receives:**

- The doctor's question (typed or spoken, up to 2,000 characters)
- A vector similarity search result from the patient's indexed admission records (vitals, lab results, clinical notes, SOAP follow-ups, examinations, diagnoses, medications, uploaded documents) — retrieved using pgvector against the question's embedding
- A structured admission context block: `patient.name`, `patient.mrn`, `patient.age`, `patient.gender`, `admission.status`, `admission.admittedAt`, `bed.bedNumber`, `chiefComplaint`, `provisionalDiagnosis`, attending doctor name
- The last 10 messages from the current conversation (conversation history)

**What the AI produces:**

A plain-text answer (Markdown allowed for lists) that:
- Starts with the direct answer in the first sentence — no preamble
- Is 1–4 short paragraphs or a tight bullet list
- Mentions source document names naturally once when drawing from uploaded files
- Ends without disclaimers or sign-off

The system also returns alongside the answer:
- `citations[]` — an array of source records that were retrieved and used, each with a label such as `"Document: ICU_Protocol.pdf, part 3"` or a patient data type label; displayed as clickable chips under the answer in the UI

---

### Feature 3: Autonomous Monitoring Agent (Background Alert Engine)

**What the AI receives:**

A cron job runs every 2 minutes. For each active, non-archived admission, it fetches:

- The single most recent vital signs record containing: `respiratoryRate`, `spo2`, `systolicBp`, `pulse`, `temperature`

The system first runs a deterministic NEWS2 score calculation on these five fields (no AI involved in scoring). If the score crosses a threshold (P1 warning or P0 critical), it then calls the AI with:

- `news2_total` — the numeric total score
- `severity` — `"P0"` or `"P1"`
- `breakdown` — for each abnormal field: the measured value, the NEWS2 sub-score it contributed, and the normal range for that field

**What the AI produces:**

A short clinical reasoning text — 2 to 4 sentences maximum — that:
- States the specific measured values that are abnormal (e.g., SpO2 88%, respiratory rate 28 /min)
- Explains the physiological meaning using correct medical terms (e.g., hypoxaemia, tachypnoea)
- Explains how the combination of findings drives the NEWS2 score
- Does NOT recommend any action, medication, or procedure

The system stores this reasoning inside the alert record alongside: `severity`, `title`, `triggeringMetrics` (the full breakdown object), and `admissionId`. Notification rows are created immediately after, and pushed to each recipient's session in real time.

---

### Does the system decide its own next steps?

**NO — for the RAG assistant and AI Patient Summary.**

The sequence is fixed. A user presses a button or sends a message. The server runs one retrieval step, builds one prompt, calls the model once, and returns the result. The model does not decide what to retrieve, does not call any tool, and does not take a second step on its own.

**YES — for the Monitoring Agent, but within a tight, fixed loop.**

The agent runs on a schedule (every 2 minutes) without any human action. For each active admission it: fetches vitals → scores them → decides whether to call the AI → calls the AI if the score crosses a threshold → writes the alert and notifications. The model itself does not choose what to do next; the logic that decides whether to call it is written code (the NEWS2 score check). The "agentic" part is that the whole cycle runs continuously without a human starting it. The model is called for one job (write the reasoning text) and returns. There is no loop inside the model's response.

---

## Monitoring Agent — Agentic Detail

This section only covers the Monitoring Agent. The RAG assistant and Patient Summary are not agentic — they run once per user action and return. Everything below describes the background alert engine only.

---

### What does the system decide on its own?

Two decisions that a clinician would otherwise have to make manually:

1. **Whether this patient's vital signs are dangerous right now.** The system scores every active admission's latest vitals against the NEWS2 scale every 2 minutes. It decides: normal (score 0, do nothing), P1 Warning (score 1–4, create alert), or P0 Critical (score ≥ 5 or any single parameter at maximum — create alert). Without this, a nurse would have to mentally check five vitals against five ranges for every patient on every check, every two minutes, without missing a shift.

2. **Whether an alert has already been sent for this patient.** Before creating a new alert, the system checks if an `OPEN` alert already exists for that admission. If one does, it skips — it does not send duplicate warnings for the same ongoing deterioration. This deduplication is also automatic. No human sets a timer or marks "already notified."

---

### Which tools or APIs does it call by itself?

Three, in order:

1. **PostgreSQL (via Prisma)** — to fetch all active, non-archived admissions with their latest vital signs record. Called once per cycle at the start.

2. **PostgreSQL (via Prisma)** — to check whether an `OPEN` alert already exists for each admission that scored above zero. Called once per qualifying admission.

3. **AWS Bedrock (`us.meta.llama3-3-70b-instruct-v1:0`)** — to generate the clinical reasoning text explaining the abnormal vitals. Called only when: score is above zero AND no existing `OPEN` alert was found. Maximum token budget: 300 tokens. Timeout: 30 seconds.

After Bedrock returns, the system calls PostgreSQL twice more inside a single database transaction: once to write the alert row, once to write one notification row per assigned staff member. Then it emits the notifications over Socket.io to any connected sessions. None of these last steps involve the AI model.

---

### Describe one full loop, start to finish

**Scenario:** A nurse records vitals for a patient in bed 3 — SpO2 88%, respiratory rate 28, pulse 115, systolic BP 105, temperature 37.2°C.

**Step 1 — cron fires (every 2 minutes, written in `monitoring.job.js`).**
The scheduler runs `runMonitoringCycle()`. A guard flag checks that the previous cycle has finished; if not, this cycle is skipped entirely to prevent overlap.

**Step 2 — fetch all active admissions.**
One database query returns all admissions with `status: ACTIVE` and `isArchived: false`, including the single most recent vital signs record for each.

**Step 3 — score the vitals (deterministic, no AI).**
For bed 3's patient, `calculateScore()` in `news2.js` runs:
- SpO2 88% → score 3
- Respiratory rate 28 → score 3
- Pulse 115 → score 2
- Systolic BP 105 → score 1
- Temperature 37.2°C → score 0
- Total: **9**, worst parameter: `spo2`
- Severity: **P0** (total ≥ 5)
- Title auto-generated: `"Critical: Abnormal spo2 — immediate review required"`

**Step 4 — check for an existing open alert.**
One database query checks if this admission already has an `OPEN` alert. It does not. Continue.

**Step 5 — call AWS Bedrock.**
The system builds a short prompt listing the abnormal parameters with their values and NEWS2 sub-scores and sends it to Bedrock. The model returns 2–4 sentences of clinical reasoning text citing SpO2, respiratory rate, and pulse values and explaining hypoxaemia and tachypnoea. This step takes up to 30 seconds. If it times out or fails, `clinicalReasoning` is set to `null` and the loop continues without it.

**Step 6 — write the alert and notifications (one database transaction).**
Inside a single atomic transaction:
- An `alert` row is created: `severity: P0`, `title`, `triggeringMetrics` (the full breakdown object), `clinicalReasoning`, `status: OPEN`
- The assigned doctor and all currently assigned nurses for this admission are fetched
- One `notification` row is created per staff member: title `"New Patient Alert: P0"`, type `ALERT`, with a metadata pointer to the alert

**Step 7 — push over Socket.io.**
After the transaction commits successfully, the server emits a `notification` event to each recipient's socket room. Clinicians with open browser sessions see the alert badge update in real time without refreshing. If Socket.io is not yet running (e.g., during startup), this step is skipped with a warning log — the alert and notification rows already exist in the database regardless.

**Total steps before returning: 7.** No human was involved. No button was pressed.

---

### What happens when it gets it wrong?

There are three types of failure, each handled separately:

**1. Bedrock fails or times out.**
The `generateAlertReasoning()` function in `alertAi.service.js` wraps the entire Bedrock call in a `try/catch`. If the call throws, times out, or returns an empty string, the function returns `null`. The monitoring loop does not stop — it continues and creates the alert with `clinicalReasoning: null`. The doctor still receives the alert with the severity, title, and all triggering metrics. The only thing missing is the written explanation. This is called graceful degradation in the code comments.

**2. A duplicate alert would be sent.**
Before calling Bedrock or writing anything, the system checks for an existing `OPEN` alert for the admission. If one exists, the cycle skips that admission entirely. This prevents the same patient being re-alerted every 2 minutes while their condition is already known and being managed.

**3. The entire monitoring cycle crashes.**
`runMonitoringCycle()` wraps everything in a `try/catch`. If any unhandled error occurs mid-cycle, it is caught, logged to `error.log`, and the `cycleInFlight` guard flag is released in a `finally` block. The next scheduled run (2 minutes later) starts cleanly. No admission is stuck in a bad state.

There is no human review of the alert reasoning before it is sent. The clinical responsibility for acting on or dismissing the alert sits entirely with the receiving clinician, who can log a formal review note (accepted or dismissed) against each alert.

---

### Why does this need to be agentic?

It does not need to be fully agentic — and the honest answer is that it is not. The monitoring agent is a scheduled job with a fixed sequence of steps. The sequence never changes: fetch → score → check duplicate → call AI → write alert → push notification. The AI model is called at one fixed point in that sequence and does one fixed job.

What makes it useful compared to a fully manual process is that it runs continuously without anyone starting it. An ICU nurse monitoring 10 patients cannot maintain attention on five separate vital sign parameters per patient without interruption, across an 8-hour shift, every two minutes. The system does exactly that: it applies the same scoring rule to the same fields on the same schedule for every active admission, never forgets, and calls the AI only when the math says something is wrong.

The AI is not making the decision about whether to alert — the NEWS2 score does that. The AI is doing the one part of the job that requires language: writing a short clinical explanation of why the numbers are abnormal, so the receiving doctor reads a sentence instead of a raw number. That job varies per patient (different vitals, different combinations, different severity), so it cannot be a template. That is the part that needs a language model.

