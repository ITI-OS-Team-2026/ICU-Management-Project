# SmartCare ICU — RAG & Agentic AI Design Document

## Overview

SmartCare ICU integrates two distinct AI subsystems on top of the same clinical data layer:

1. **RAG Conversational Assistant** — an on-demand, query-driven system that lets clinicians ask natural-language questions about a patient's history and receive source-cited answers.
2. **Autonomous Monitoring Agent** — a continuous, background system that watches incoming vitals and clinical data in real time and proactively raises severity-ranked deterioration alerts.

Both share the same underlying patient data (vitals, labs, notes, medications, SOAP entries) but differ fundamentally in trigger model, latency requirements, and output shape. This document specifies the architecture, data flow, and behavior of each.

---

## Part 1 — RAG Conversational Assistant

### 1.1 Purpose

Allow **Medical Residents** and **ICU Specialists** to query a patient's full clinical timeline in natural language (e.g. *"What was the trend of his SpO2 over the last 12 hours?"* or *"Summarize any renal function changes since admission"*) and receive an answer grounded in actual records, with exact timestamps and citations — never a hallucinated synthesis.

### 1.2 High-Level Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────────┐
│  Clinician   │────▶│  Query API    │────▶│  Retrieval Layer    │
│  (chat UI)   │     │ (Express.js)  │     │  (SQL + pgvector)   │
└─────────────┘     └──────────────┘     └────────────────────┘
                              │                        │
                              ▼                        ▼
                     ┌──────────────┐        ┌──────────────────┐
                     │  n8n webhook  │◀───────│  Context Builder  │
                     │  orchestration│        │  (rank + dedupe)  │
                     └──────────────┘        └──────────────────┘
                              │
                              ▼
                     ┌──────────────┐
                     │ Gemini Pro /  │
                     │ GPT-4o        │
                     └──────────────┘
                              │
                              ▼
                     ┌──────────────────────┐
                     │ Cited Answer + Source │
                     │ Timestamps (JSON)     │
                     └──────────────────────┘
```

### 1.3 Data Sources Indexed for Retrieval

| Source | Structured / Unstructured | Retrieval Method |
|---|---|---|
| Vital signs (pulse, BP, RR, SpO2, temp) | Structured, time-series | SQL range query |
| Lab results | Structured | SQL range query |
| SOAP follow-up notes | Semi-structured text | Embedding + pgvector |
| Clinical/nursing notes | Free text | Embedding + pgvector |
| Diagnoses / investigation orders | Structured | SQL query |
| Medications | Structured | SQL query |
| Medical documents (uploaded) | Extracted text | Embedding + pgvector |

### 1.4 Retrieval Strategy (Hybrid Retrieval)

Because ICU data is a mix of time-series numerics and free-text clinical narrative, retrieval uses a **hybrid** approach rather than pure vector search:

1. **Structured pre-filter** — every query is first scoped to `patient_id` and an inferred time window (e.g. "last 24 hours", "since admission") extracted via a lightweight intent-parsing step.
2. **Vector similarity search (pgvector)** — free-text fields (notes, SOAP entries, documents) within that scope are embedded and ranked by cosine similarity against the query embedding.
3. **Structured query execution** — numeric/categorical fields within scope (vitals, labs, meds) are queried directly via SQL, not embeddings, to avoid numeric-similarity artifacts.
4. **Context assembly** — top-k semantic matches + full structured rows are merged into a single context block, each entry tagged with its **source type, timestamp, and author role**.

### 1.5 Prompt Construction

The assistant is instructed to answer **only** from the retrieved context and to refuse or flag when information is insufficient — this is critical for clinical safety.

```
System:
You are a clinical information assistant. Answer ONLY using the provided
patient context. Every claim must reference the exact source timestamp.
If the context does not contain enough information to answer confidently,
say so explicitly rather than inferring or guessing.
Never suggest a diagnosis or treatment — only summarize documented facts.

Context:
[STRUCTURED_VITALS_BLOCK]
[STRUCTURED_LABS_BLOCK]
[RETRIEVED_NOTES_BLOCK]

User question:
{{clinician_query}}
```

### 1.6 Output Contract

Every response returned to the frontend follows a strict JSON contract so the UI can render inline citations:

```json
{
  "answer": "SpO2 trended from 98% at 08:00 down to 91% at 14:00...",
  "citations": [
    { "source": "vitals", "timestamp": "2026-07-16T08:00:00Z" },
    { "source": "vitals", "timestamp": "2026-07-16T14:00:00Z" },
    { "source": "nursing_note", "author_role": "ICU Nurse", "timestamp": "2026-07-16T13:45:00Z" }
  ],
  "confidence": "high",
  "insufficient_data": false
}
```

### 1.7 Performance Target

- Target end-to-end latency: **< 3 seconds** per query (per Section 9 of the proposal).
- Achieved via: pre-computed embeddings on write (not query-time), scoped SQL pre-filtering before vector search, and response streaming to the UI.

### 1.8 Role Restrictions

Per the RBAC model, only **Medical Residents** and **ICU Specialists** can access this assistant. ICU Nurses and System Admins are excluded at the API authorization layer (JWT role claim check), not just hidden in the UI.

---

## Part 2 — Autonomous Monitoring Agent

### 2.1 Purpose

Continuously evaluate incoming vitals (and correlated labs/notes) per patient to detect **multi-variable deterioration patterns** — combinations of changes that are individually subtle but jointly significant — and raise **explainable, severity-ranked alerts** before a single-threshold breach would otherwise trigger a manual reaction.

### 2.2 High-Level Architecture

```
┌────────────────┐     ┌───────────────────┐     ┌────────────────────┐
│ Vitals Ingest   │────▶│  Event Bus /        │────▶│  Rule + Trend       │
│ (Nurse entry)   │     │  n8n Trigger        │     │  Evaluation Engine  │
└────────────────┘     └───────────────────┘     └────────────────────┘
                                                          │
                                    ┌─────────────────────┼─────────────────────┐
                                    ▼                                           ▼
                          ┌───────────────────┐                     ┌────────────────────┐
                          │ Deterministic Rules│                     │ LLM Reasoning Layer │
                          │ (thresholds, deltas)│                     │ (Gemini/GPT-4o)     │
                          └───────────────────┘                     └────────────────────┘
                                    │                                           │
                                    └─────────────────┬─────────────────────────┘
                                                       ▼
                                          ┌────────────────────────┐
                                          │ Severity-Ranked Alert    │
                                          │ + Reasoning Explanation  │
                                          └────────────────────────┘
                                                       │
                                                       ▼
                                          ┌────────────────────────┐
                                          │ Resident/Specialist      │
                                          │ Dashboard Notification    │
                                          └────────────────────────┘
```

### 2.3 Trigger Model

Unlike the RAG assistant (pull-based, user-initiated), the monitoring agent is **push-based and event-driven**:

- Triggered on every new vitals entry (nurse-recorded, hourly or ad hoc).
- Triggered on new lab result ingestion.
- Runs a background sweep on a fixed interval (e.g. every 15 minutes) to catch **slow-onset trends** that no single new data point would trigger alone.

### 2.4 Two-Layer Evaluation

**Layer 1 — Deterministic Rule Engine (fast, deterministic, no LLM cost)**

Handles hard clinical thresholds and simple deltas, e.g.:

```
IF systolic_BP drops > 15 mmHg within 2 hours
   AND pulse increases > 15 bpm within same window
   AND temperature > 38.0°C
THEN flag candidate_pattern = "early_sepsis_signature"
```

This layer runs on every ingest, is cheap, and produces a candidate list of patterns worth deeper reasoning.

**Layer 2 — LLM Reasoning Layer (contextual, explainable)**

Only candidates flagged by Layer 1 (or scheduled sweep anomalies) are passed to the LLM, which:

- Reviews the full relevant window of vitals/labs/notes for that patient.
- Produces a differential hypothesis list.
- Assigns a severity rank.
- Suggests next diagnostic steps.
- Returns a structured explanation — never a bare alert.

This two-layer design keeps cost and latency low (most vitals entries never reach the LLM) while ensuring every alert that *does* fire is clinically explainable.

### 2.5 Alert Object Contract

```json
{
  "alert_id": "uuid",
  "patient_id": "uuid",
  "severity": "high",
  "pattern": "early_sepsis_signature",
  "triggering_metrics": [
    { "metric": "systolic_BP", "from": 118, "to": 100, "window": "2h" },
    { "metric": "pulse", "from": 82, "to": 101, "window": "2h" },
    { "metric": "temperature", "value": 38.4, "timestamp": "2026-07-16T13:30:00Z" }
  ],
  "differential_hypotheses": [
    "Early sepsis",
    "Hypovolemia",
    "Medication reaction"
  ],
  "suggested_next_steps": [
    "Order lactate and blood cultures",
    "Reassess fluid balance"
  ],
  "requires_acknowledgement": true,
  "created_at": "2026-07-16T13:31:00Z"
}
```

### 2.6 Severity Ranking

| Level | Criteria | Notification Behavior |
|---|---|---|
| Critical | Multi-variable pattern matching known deterioration signatures | Immediate push + persistent dashboard banner |
| High | Single strong deviation with supporting secondary signal | Dashboard alert, requires acknowledgement |
| Moderate | Trend drift without acute threshold breach | Surfaced in patient timeline, no forced interrupt |

### 2.7 Explainability Requirement (Non-Negotiable)

Per the proposal's core principle — *"every AI alert or summary is accompanied by the exact triggering metrics... so the clinician always sees the why, not just the what"* — no alert may be shown without:

1. The exact metrics and time windows that triggered it.
2. At least one differential hypothesis.
3. A suggested next diagnostic step.

Alerts failing to produce all three fields from the LLM layer are **not surfaced** to the clinician — they are logged as `agent_evaluation_incomplete` for later review rather than shown as an unexplained flag.

### 2.8 Role Access

- **ICU Nurses**: do not see agent alerts directly in the assistant sense, but their vitals entries are the primary trigger source.
- **Medical Residents**: receive and triage alerts as first responders.
- **ICU Specialists**: see alerts during rounds and factor them into treatment/discharge decisions.
- **System Admin**: has no visibility into alert content (unblinded clinical data), only system-health metrics (e.g. agent uptime, evaluation latency).

### 2.9 Audit Requirements

Every alert generated, acknowledged, dismissed, or escalated is written to the immutable audit log (per Section 5 of the proposal), including which clinician acknowledged it and when — supporting both clinical safety review and legal traceability.

---

## Part 3 — Shared Infrastructure Notes

| Concern | RAG Assistant | Monitoring Agent |
|---|---|---|
| Trigger | User query (pull) | Data ingest / scheduled sweep (push) |
| Latency target | < 3s | Near real-time (seconds) for Layer 1; Layer 2 async |
| LLM call frequency | Every query | Only on Layer-1-flagged candidates |
| Failure mode | Refuses to answer if context insufficient | Logs incomplete evaluation, does not surface unexplained alert |
| Orchestration | n8n webhook | n8n webhook (event-triggered workflow) |
| Data grounding | pgvector + SQL hybrid retrieval | SQL rule engine + scoped LLM context window |

Both subsystems are built as **stateless orchestration workflows in n8n**, calling out to Gemini Pro / GPT-4o, so model provider can be swapped without touching the core application logic — keeping the AI layer decoupled from the Express.js/PostgreSQL core.