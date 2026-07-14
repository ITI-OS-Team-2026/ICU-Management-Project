# Software Development Life Cycle (SDLC)
## Project
**SmartCare ICU – AI-Powered ICU Management and Clinical Decision Support System**

---

# 1. SDLC Model

SmartCare ICU follows the **Agile Software Development Life Cycle (SDLC)**. The project is developed iteratively across three functional phases, allowing continuous improvement, regular feedback, and gradual integration of AI features.

Reasons for choosing Agile:
- Supports incremental development against phased functional requirement groups
- Easy to adapt to changing clinical requirements
- Frequent testing and feedback each phase
- Suitable for AI feature integration, which depends on a stable data foundation first
- Faster delivery of a working MVP within the 6-week target

---

# 2. SDLC Phases

## Phase 1 – Planning

### Objectives
- Define project scope (paperless ICU workflow + AI decision support)
- Identify stakeholders and user roles: **ICU Nurse, Medical Resident, ICU Specialist, System Admin**
- Define system objectives: zero-friction paperless workflow, <3s RAG retrieval, <5s AI summarization, proactive alerting
- Identify project risks (AI hallucination in alerts, latency targets, HIPAA-aligned privacy for System Admin role)
- Plan development timeline against the 6-week, 3-phase structure

### Deliverables
- Project Proposal
- Project Timeline (mapped to Phases 1–3, Weeks 1–6)
- Feature List

---

## Phase 2 – Requirements Analysis

### Activities
- Analyze ICU workflow and clinical bottlenecks (paper/charting friction, cognitive overload on rounds, delayed alert escalation)
- Identify user roles and their exact permission boundaries using the Access Control Matrix
- Define functional requirements per phase: FR-1.x (Foundation), FR-2.x (Core UX), FR-3.x (Intelligence/AI)
- Define non-functional requirements: latency benchmarks, 99.9% uptime, WCAG AA contrast, TLS/HTTPS
- Create user stories per role (Nurse bedside entry, Resident RAG queries, Specialist rounds/approval, Admin account provisioning)
- Prepare Software Requirements Specification (SRS) incorporating the Authentication Lifecycle and RBAC Enforcement rules

### Deliverables
- SRS Document
- User Stories (one set per role: Nurse, Resident, Specialist, System Admin)
- Use Case Diagram
- Access Control Matrix

---

## Phase 3 – System Design

### Activities
- Design system architecture: React 19 (Vite) frontend ↔ Express/Node.js backend ↔ PostgreSQL, with n8n as the AI orchestration layer
- Design PostgreSQL database including mandatory soft-deletion fields (`is_archived`, `archived_at`) on every clinical table
- Create Entity Relationship Diagram (ERD) covering patients, medical histories, admissions, vital signs, diagnoses, clinical examinations, follow-ups, documents, and audit logs
- Design REST APIs (`/api/patients`, `/api/admissions/:id/vitals`, `/api/admissions/:id/documents`, and related clinical endpoints)
- Design UI/UX per the Strategic Design Principles: sticky clinical context bar, trend sparklines, strict role-driven UI boundaries, ≥4.5:1 contrast, no hover-gated critical data
- Design AI architecture: Instant AI Summarization engine and Autonomous Monitoring Agent with Clinical Reasoning Explanations
- Design RAG workflow via n8n webhook orchestration querying structured vitals, labs, notes, examinations, follow-ups, and embedded documents

### Deliverables
- System Architecture Diagram
- ERD
- Database Schema (including audit log and soft-deletion schema)
- Wireframes (desktop + tablet/bedside-cart responsive states)
- API Design
- Audit Logging & RBAC Middleware Design (`verifyToken`, `requireRole([...])`)

---

## Phase 4 – Development

Development is divided into three phases that mirror the functional requirement groups exactly, rather than generic feature sprints — each phase builds on data and access-control guarantees established in the one before it.

### Phase 1: Foundation & Data Integrity (Weeks 1–2)
- **FR-1.1** Secure Authentication & Role-Based Authorization Engine — `HttpOnly`/`Secure` JWT cookies, Express RBAC middleware, Zustand `useAuthStore`
- **FR-1.2** Smart Input Validation & Real-Time Physiological Boundary Checks — frontend + backend (Zod/Joi) boundary validation on vitals
- **FR-1.3** Soft Deletion (Archive State) & Action Audit Logging — `is_archived`/`archived_at` fields, immutable `audit_logs` table
- **FR-1.4** Paperless ICU Workflow CRUD Endpoints — patient admission, vitals, medical history, document upload (`multer`)

### Phase 2: Core UX & Clinical Visualization (Weeks 3–4)
Depends on Phase 1's data model and auth being complete.
- **FR-2.1** Unified Patient Dashboard — sticky header, live vitals panel, labs/investigations, clinical examinations, follow-ups, lab/PDF repository, clinical history notes
- **FR-2.2** Sticky Clinical Context Bar — persistent patient identity header with quick-switcher across ICU beds
- **FR-2.3** Visual Trend Sparklines — inline SVG trend graphs for pulse, SpO2, BP, and temperature with abnormal-point markers

### Phase 3: Intelligence & AI Automation (Weeks 5–6)
Depends on Phase 1's clinical data existing and Phase 2's dashboard surfaces to render into.
- **FR-3.1** Conversational RAG Interface — n8n webhook orchestration over patient vitals/notes/labs/exams/follow-ups, with source-citation responses
- **FR-3.2** Instant AI Summarization — one-click 24-hour synthesis across Hemodynamic, Respiratory, Renal/Metabolic, and Neurological categories
- **FR-3.3** Autonomous Monitoring Agent & Alerting — continuous multi-variable anomaly detection, P0/P1 severity alert banner
- **FR-3.4** Clinical Reasoning Explanations — expandable "Clinical Reasoning & Differential" panel on every AI alert/summary

---

## Phase 5 – Testing

Testing is structured in three tracks run continuously alongside — not strictly after — each development phase.

### 5.1 Automated Integration & API Testing (validates Phase 1 output)
- Auth & RBAC Matrix Verification (`Jest`/`Supertest`) across all 4 roles — expect `200/201` for allowed actions, `403` for forbidden
- Smart Validation Boundary tests (e.g. pulse `=19`, `=301`, temperature `=34`, `=46`, `NaN`, `-5` rejected with descriptive errors)
- Soft Deletion & Audit Trail Integrity tests confirming no row is ever hard-deleted

### 5.2 Frontend Accessibility (a11y) & Ergonomics Verification (validates Phase 2 output)
- Contrast Ratio Auditing (`axe-core`) — ≥4.5:1 body text, ≥3:1 large vital metrics
- Keyboard & Screen Reader Navigation across modals, patient switcher, and forms
- Reduced Motion Verification for sparkline animations and alert pulsing

### 5.3 End-to-End Clinical Scenario Validation (validates Phase 3 output)
- **Scenario A** — Nurse bedside admission + vitals entry on tablet, <90s total
- **Scenario B** — Resident P1 alert triage, Clinical Reasoning drawer review, RAG vitals-trend or lab query
- **Scenario C** — Specialist morning rounds: Instant 24h Summary review + treatment approval

---

## Phase 6 – Deployment

Deployment stack:
- React 19 (Vite build) + Zustand state management + Tailwind CSS v4 (OKLCH tokens)
- Express / Node.js (modular routing, controllers, middlewares)
- PostgreSQL with connection pooling via Prisma or Drizzle ORM
- n8n orchestration layer for AI workflows, interfacing with Gemini Pro / GPT-4o and SQL/vector retrievers

Deployment goals:
- Stable production build meeting latency benchmarks: <500ms dashboard FCP, <150ms CRUD p95, <3s RAG response, <5s AI summary
- Secure environment variables — zero API keys, JWT secrets, or unblinded patient data in client bundles or `localStorage`
- Database migration including audit log and soft-deletion schema
- Graceful degradation path for n8n/LLM downtime (>6s timeout → fallback banner)
- Documentation

---

## Phase 7 – Maintenance

Future improvements (Post-MVP v2.0 — deliberately excluded from the 6-week MVP scope):
- Multi-Agent Diagnostic Council (specialized agents debating toward consensus)
- Automated Shift Handover (SBAR-format reports at 07:00/19:00)
- Voice-to-Text Clinical Notes (medical-tuned transcription)
- Morning Round Digest (6:00 AM n8n cron summary email)
- One-Click Discharge Draft
- Graceful Degradation / Offline State Cache (Service Worker + IndexedDB)
- Automated Long-Term Data Management (cold storage partitioning, ICD-10 extraction)

---

# Development Workflow

```text
Planning
    ↓
Requirements Analysis
    ↓
System Design
    ↓
Development (Foundation → Core UX → Intelligence/AI)
    ↓
Testing (continuous per phase)
    ↓
Deployment
    ↓
Maintenance
```

---

# Development Methodology

The project follows an iterative Agile workflow, with each iteration corresponding to one of the three functional phases:

```text
Planning
     ↓
Design
     ↓
Develop (Phase 1: Foundation)
     ↓
Test
     ↓
Develop (Phase 2: Core UX)
     ↓
Test
     ↓
Develop (Phase 3: Intelligence/AI)
     ↓
Test
     ↓
Review
     ↓
Improve
```

Each phase delivers a functional, independently testable slice of the system before the next phase begins — Core UX cannot meaningfully start without Foundation's data model and auth in place, and Intelligence/AI cannot start without Core UX's dashboard surfaces to render summaries and alerts into.
