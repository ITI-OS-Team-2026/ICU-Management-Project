# Per-Patient AI Chat Assistant Guide

## Overview

The Per-Patient AI Chat is a conversational interface tied to a specific patient admission. Clinicians can ask questions about a patient's clinical data and receive AI-generated, context-grounded answers with citations. The chat combines document embeddings with structured clinical records to provide comprehensive, patient-specific responses.

---

## Data Model

### AiQueryLog

| Field        | Type   | Description                              |
| ------------ | ------ | ---------------------------------------- |
| id           | UUID   | Primary key                              |
| admissionId  | UUID   | Links to the patient admission           |
| askedById    | UUID   | The clinician who asked                  |
| question     | String | The question text                        |
| aiResponse   | String | The AI-generated answer                  |
| citedSources | JSON   | Array of source documents/records cited  |
| createdAt    | DateTime | Timestamp                              |

Patient-mode history lives entirely in `AiQueryLog` — there are no named sessions. It is a flat per-admission conversation. Entries are non-deletable for audit purposes (audit log retained separately even if conversation is cleared).

---

## How It Works

### 1. Patient Context Gathering

When a question is asked, the system retrieves context through two mechanisms:

**Vector search** (`retrieval.service.js`):
- Embeds the question
- Runs pgvector cosine similarity against all document embeddings scoped to the admission
- Filters by absolute score threshold and relative ratio to best match

**Structured clinical records**:
- Vitals, labs, diagnoses, medications, allergies, clinical notes, nursing notes, examinations, follow-ups
- Flattened into citable entries and ranked by lexical overlap with the question + recency

Both searches run **in parallel** and results are merged under a character budget (`ragMaxContextChars`).

### 2. Conversation History

The last 5 `AiQueryLog` entries are included in the prompt for pronoun resolution (e.g., "What about their potassium?" referring to a previously discussed lab result).

### 3. LLM Generation

- **Model**: AWS Bedrock (configurable via `BEDROCK_MODEL_ID`)
- **Temperature**: 0.1 (highly deterministic)
- **Max tokens**: 1536
- **System prompt** (`RAG_SYSTEM_PROMPT`): Enforces:
  - Strict grounding in the provided patient context
  - Single-patient scope
  - Source attribution
  - Conservative clinical language
  - No therapeutic directives

### 4. Safety Guardrails

- If **no context is retrieved**, returns a canned "not enough data" response — never falls back to general knowledge for patient-specific questions
- Falls back to extractive (no-LLM) mode when Bedrock is unconfigured (CI/dev)
- All Q&A persisted via `auditedTransaction`

---

## API Endpoints

All restricted to `MEDICAL_RESIDENT` and `ICU_SPECIALIST` roles.

| Method | Route                              | Description                    |
| ------ | ---------------------------------- | ------------------------------ |
| POST   | `/rag/query`                       | Ask a question (`mode: "patient"`, requires `admission_id`) |
| GET    | `/rag/admissions/:id/history`      | Get conversation transcript (oldest-first) |
| DELETE | `/rag/admissions/:id/history`      | Clear conversation             |

### Query Request Body

```json
{
  "admission_id": "uuid",
  "question": "What are the latest potassium levels?",
  "mode": "patient"
}
```

### Query Response

```json
{
  "answer": "The most recent potassium level is...",
  "citations": ["lab_results", "clinical_notes"],
  "metadata": {
    "documentsSearched": 12,
    "chunksRetrieved": 4,
    "clinicalRecordsUsed": 8
  }
}
```

---

## Frontend

### PatientRagChatPage.jsx

A full chat interface featuring:

- **Suggested questions**: Pre-built prompts to help clinicians get started
- **Markdown-rendered answers**: AI responses formatted with proper headings, lists, and emphasis
- **Citation display**: Sources shown alongside each answer
- **Retrieval metadata footnotes**: How many documents/records were searched
- **Elapsed-time counter**: Shows how long generation took
- **Knowledge-base panel sidebar**: Quick access to uploaded documents
- **Abort/cancel support**: Cancel in-flight requests

### useRagChat.js Hook

Manages chat state:
- Calls `ragService.ask()` with `mode: "patient"`
- Optimistic UI updates (shows question immediately while waiting for answer)
- History reload on mount
- Abort controller for cancellation

---

## Flow Diagram

```
Clinician types a question
            |
    Embed the question (vector)
            |
    Parallel retrieval:
    +-- Vector search (document embeddings scoped to admission)
    +-- Structured records (vitals, labs, meds, notes, etc.)
            |
    Merge results under character budget
            |
    Include last 5 Q&A turns for context
            |
    Send to Bedrock LLM (grounded system prompt)
            |
    Extract citations from answer
            |
    Persist to AiQueryLog (audited)
            |
    Render in chat UI with markdown + citations
```
