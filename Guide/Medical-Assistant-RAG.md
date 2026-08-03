# Medical Assistant (RAG Knowledge Base) Guide

## Overview

The Medical Assistant is a Retrieval-Augmented Generation (RAG) system that allows clinicians to upload medical documents (PDFs, images, text files), which are chunked, embedded, and stored as vectors. Clinicians can then ask questions and receive AI-generated answers grounded in the uploaded knowledge base.

---

## Data Model

### MedicalDocument

| Field           | Type    | Description                                      |
| --------------- | ------- | ------------------------------------------------ |
| id              | UUID    | Primary key                                      |
| filename        | String  | Original uploaded filename                       |
| mimeType        | String  | File MIME type                                   |
| storageLocation | String  | Where the file is stored (local/Cloudinary/BLOB) |
| embeddingStatus | Enum    | `PENDING` -> `PROCESSING` -> `COMPLETED` / `FAILED` / `SKIPPED` |
| chunkCount      | Int     | Number of chunks created                         |

### DocumentEmbedding

| Field      | Type         | Description                                 |
| ---------- | ------------ | ------------------------------------------- |
| id         | UUID         | Primary key                                 |
| documentId | UUID         | Links to MedicalDocument                    |
| chunkText  | String       | The text content of this chunk              |
| chunkIndex | Int          | Position in the document                    |
| embedding  | vector(1024) | pgvector column for similarity search       |

Chunks can be scoped to an admission (patient mode) or a chat session (knowledge mode).

---

## Document Pipeline

### 1. Upload

Files arrive via `multer`. Two modes:
- **Patient docs**: Attached to an admission
- **Knowledge-base resources**: Attached to an `AiChatSession` via `chatResources.service.js`, stored in Cloudinary or as a database BLOB

### 2. Text Extraction (`textExtractor.js`)

Routes by MIME type:

| Type       | Method                          |
| ---------- | ------------------------------- |
| PDF        | `pdf-parse` library             |
| Image      | Tesseract OCR                   |
| Text/CSV/MD| UTF-8 read                      |

Normalizes whitespace and truncates at `ragMaxDocumentChars` (default: 400,000 chars).

### 3. Chunking (`chunker.js`)

- Splits on paragraph boundaries, then sentence boundaries, then word boundaries
- Configurable `ragChunkSize` (default: 1200) and `ragChunkOverlap` (default: 200)
- Trailing slivers are folded back into the previous chunk
- Minimum 40 characters per chunk

### 4. Embedding & Storage (`indexing.service.js`)

- Calls the embedding provider (`local` or `bedrock`) to generate vector embeddings
- Writes chunks + vectors via raw SQL (Prisma cannot map pgvector natively)
- Runs **asynchronously** via `setImmediate` so uploads return immediately

---

## Retrieval Mechanism (`retrieval.service.js`)

### Patient Mode

Two parallel searches:

1. **Vector search**: pgvector cosine similarity (`1 - (embedding <=> query)`) scoped to one admission, filtered by:
   - Absolute threshold: `ragMinScore` (default: 0.02)
   - Relative threshold: `ragRelevanceRatio` (default: 0.35 of best match)

2. **Structured clinical records**: Vitals, labs, diagnoses, medications, notes, exams, follow-ups, allergies — flattened into citable entries and ranked by lexical overlap + recency

### Knowledge Mode

Searches shared knowledge-base documents plus the current chat session's attached resources only.

---

## Answer Generation (`rag.service.js`)

1. Context block is assembled (admission overview + document excerpts + clinical records) under a character budget (`ragMaxContextChars`)
2. Sent to **AWS Bedrock** with a strict system prompt enforcing:
   - Grounding in provided context only
   - Single-patient scope
   - No therapy directives
   - Conservative certainty language
3. Two system prompts:
   - `RAG_SYSTEM_PROMPT` — patient mode, strictly grounded in context
   - `KNOWLEDGE_SYSTEM_PROMPT` — knowledge mode, may use general medical knowledge
4. Citations are extracted by matching document filenames in the answer text
5. Conversation history (last 5 turns) is included for pronoun resolution

---

## API Endpoints

All routes under `/rag`, require authentication.

| Method | Route                                  | Description                          |
| ------ | -------------------------------------- | ------------------------------------ |
| POST   | `/rag/query`                           | Ask a question (patient or knowledge mode) |
| GET    | `/rag/admissions/:id/history`          | Patient conversation transcript      |
| DELETE | `/rag/admissions/:id/history`          | Clear patient conversation           |
| GET    | `/rag/chats`                           | List knowledge-mode chat sessions    |
| POST   | `/rag/chats`                           | Create a knowledge-mode chat         |
| GET    | `/rag/chats/:chatId`                   | Get a specific chat session          |
| PATCH  | `/rag/chats/:chatId`                   | Update chat metadata                 |
| DELETE | `/rag/chats/:chatId`                   | Delete a chat session                |
| GET    | `/rag/chats/:chatId/resources`         | List attached files                  |
| POST   | `/rag/chats/:chatId/resources`         | Upload a file to a chat              |
| DELETE | `/rag/chats/:chatId/resources`         | Remove attached files                |
| GET    | `/rag/chats/:chatId/resources/file`    | Download an attached file            |
| GET    | `/rag/admissions/:id/index`            | Indexing dashboard                   |
| POST   | `/rag/admissions/:id/index/reindex`    | Re-index all documents               |

---

## Flow Diagram

```
Clinician uploads document
        |
  Text extraction (PDF/OCR/text)
        |
  Chunk into overlapping segments
        |
  Generate vector embeddings
        |
  Store in PostgreSQL (pgvector)
        |
        |     Clinician asks a question
        |              |
        +-----> Embed the question
                       |
              Parallel retrieval:
              - Vector similarity search
              - Structured clinical records
                       |
              Assemble context (budget-capped)
                       |
              Send to Bedrock LLM
                       |
              Return grounded answer + citations
```
