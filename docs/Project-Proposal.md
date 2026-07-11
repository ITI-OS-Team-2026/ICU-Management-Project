# Project Proposal

# SmartCare ICU
### AI-Powered Intensive Care Unit (ICU) Management and Clinical Decision Support System

---

# 1. Introduction

Intensive Care Units (ICUs) are among the most demanding environments in healthcare, where nurses, residents, and specialists must continuously monitor critically ill patients and make timely clinical decisions. Patient information is often distributed across multiple sources, including laboratory reports, medical documents, imaging studies, medications, vital signs, and clinical notes. This fragmentation makes it difficult for healthcare professionals to quickly obtain a complete understanding of a patient's condition, increasing workload and delaying decision-making.

SmartCare ICU is proposed as an AI-powered, paperless ICU management platform that centralizes patient information into a unified clinical dashboard while providing intelligent decision support through Artificial Intelligence. The system combines real-time vitals charting and structured clinical data entry with Retrieval-Augmented Generation (RAG) and an autonomous monitoring agent, so healthcare professionals can access and act on patient information faster and with greater confidence.

---

# 2. Problem Statement

Current ICU workflows require healthcare professionals to piece together patient information from multiple, disconnected sources. Laboratory results, medications, vital signs, and clinical notes are frequently recorded on paper or in separate systems, forcing nurses and physicians to spend valuable time searching for relevant information instead of delivering care.

This fragmented workflow leads to:

- Delayed access to critical patient information.
- Increased cognitive workload during high-pressure shifts and clinical rounds.
- Difficulty forming a complete picture of a patient's trajectory across shifts.
- Time-consuming manual review of lengthy progress notes and lab reports.
- Subtle multi-variable deterioration trends going unnoticed until a critical threshold is crossed.
- Reduced efficiency during emergency situations, when seconds matter.

As the volume of ICU patient data continues to grow, there is an increasing need for intelligent systems capable of organizing, synthesizing, and proactively surfacing patient information — rather than simply storing it.

---

# 3. Proposed Solution

SmartCare ICU digitizes the complete patient journey inside a single Intensive Care Unit, from admission through discharge, with zero reliance on paper charting.

The system centralizes all patient-related information — demographics, diagnoses, vital signs, fluid intake/output, Glasgow Coma Scale (GCS) scores, laboratory results, medications, clinical notes, and medical documents — into one unified, role-aware dashboard.

Artificial Intelligence is integrated to actively reduce clinical cognitive load, not just store data:

- **Instant AI Summarization** — one-click synthesis of a patient's last 24 hours, organized by Hemodynamic, Respiratory, Renal/Fluid, and Neurological status.
- **Conversational RAG assistant** — natural-language querying of a patient's full clinical history, with exact timestamps and source citations.
- **Autonomous Monitoring Agent** — continuous background evaluation of incoming vitals for multi-variable deterioration patterns (e.g. dropping MAP with rising heart rate and temperature), pushing severity-ranked alerts before thresholds are critically breached.
- **Clinical Reasoning Explanations** — every AI alert or summary is accompanied by the exact triggering metrics, differential hypotheses, and suggested next diagnostic steps, so the clinician always sees the "why," not just the "what."

Rather than replacing clinical judgment, SmartCare ICU is intended to support healthcare professionals by reducing information retrieval time, surfacing risk earlier, and keeping every action within a fully auditable, role-restricted system.

---

# 4. Project Objectives

## General Objective

To design and develop an AI-powered ICU management system that centralizes patient information and assists healthcare professionals through intelligent, explainable clinical decision support.

## Specific Objectives

- Develop a centralized, paperless ICU patient management platform.
- Digitize the complete ICU patient lifecycle, from admission to discharge.
- Enforce strict role-based access control across four distinct clinical and administrative roles.
- Record vital signs, fluid balance, GCS scores, laboratory results, medications, and clinical notes with real-time input validation.
- Provide a unified, role-adaptive patient dashboard with a persistent clinical context header and visual trend sparklines.
- Implement one-click AI-generated patient summaries.
- Integrate a conversational RAG assistant for natural-language, source-cited patient queries.
- Implement an autonomous monitoring agent that generates explainable, severity-ranked clinical alerts.
- Maintain full audit-log traceability and non-destructive (soft-delete) data retention for legal and clinical compliance.
- Improve the overall efficiency and safety of ICU clinical workflows.

---

# 5. Project Scope

## Included Features

- Role-based authentication and authorization (JWT, `HttpOnly` cookies)
- Patient admission and discharge management
- ICU bed management
- Vital signs, fluid intake/output, and GCS score tracking with real-time boundary validation
- Laboratory results management
- Medication management
- Clinical and nursing notes
- Medical document and radiology upload
- Unified, role-adaptive patient dashboard with sticky context header and trend sparklines
- Patient timeline
- Soft-deletion (archive) and immutable action audit logging
- AI-generated patient summaries
- RAG-powered conversational clinical assistant
- Autonomous monitoring agent with explainable, severity-ranked alerts
- Dashboard reporting

## Excluded Features (Post-MVP Roadmap)

The MVP does not include:

- Hospital-wide or multi-hospital management
- Billing and accounting
- Insurance management
- Appointment scheduling
- Pharmacy inventory management
- Medical device integration
- Multi-agent diagnostic council (debating specialized AI agents)
- Automated shift-handover (SBAR) reports
- Voice-to-text clinical dictation
- Scheduled morning-round AI digest emails
- One-click discharge draft generation
- Offline/service-worker data caching
- Native mobile application

---

# 6. Target Users

The system is designed for the four distinct roles operating inside an Intensive Care Unit, each with strictly scoped permissions.

### System Admin

- Provision and revoke user accounts
- Assign and audit role boundaries
- Manage ICU bed configuration and system settings
- Monitor system health and AI service usage
- **No access** to unblinded clinical records, vitals, or patient identifiers

### ICU Nurse

- Admit the patient and assign a bed and doctor for the patient
- Create initial patient admission profiles
- Record hourly vital signs, fluid intake/output, and GCS scores
- Upload laboratory results and radiology documents
- View the unified patient dashboard and receive clinical alerts
- No access to the RAG assistant or AI summarization tools, to keep the bedside workflow fast and uncluttered

### Medical Resident

- Perform clinical assessments and log comprehensive medical histories
- Query the RAG assistant for historical, cross-shift clinical metrics
- Trigger AI patient summaries
- Review and triage alerts from the autonomous monitoring agent
- Full read/write clinical access; no discharge or treatment-approval authority

### ICU Specialist

- Review the unified dashboard during clinical rounds
- Trigger and evaluate AI summaries and clinical reasoning explanations
- Authorize treatment modifications
- Approve and finalize patient discharge — the only role with this authority

---

# 7. Technologies

The proposed technology stack:

| Layer | Technology |
|---------|------------|
| Frontend | React 19 (Vite) |
| State Management | Zustand |
| Styling | Tailwind CSS v4 (OKLCH tokens) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| ORM | Prisma or Drizzle |
| Authentication | JWT via `HttpOnly`, `Secure` cookies |
| AI Orchestration | n8n (webhook-driven workflows) |
| AI Models | Gemini Pro / GPT-4o |
| Retrieval | SQL + vector database retrievers |
| Vector Search | pgvector |
| Version Control | Git & GitHub |

---

# 8. Software Development Methodology

The project follows the Agile Software Development Life Cycle (SDLC).

Development is completed incrementally across three functional phases over a 6-week MVP timeline:

1. **Foundation & Data Integrity** (Weeks 1–2) — authentication, RBAC, input validation, soft deletion, audit logging, core CRUD.
2. **Core UX & Clinical Visualization** (Weeks 3–4) — unified dashboard, sticky context bar, trend sparklines.
3. **Intelligence & AI Automation** (Weeks 5–6) — RAG assistant, AI summarization, autonomous monitoring agent, clinical reasoning explanations.

Each phase is independently tested before the next begins, allowing continuous evaluation and improvement of both core ICU management features and AI capabilities.

---

# 9. Expected Outcomes

Upon completion, SmartCare ICU is expected to:

- Centralize ICU patient information into a single, paperless platform.
- Reduce patient-specific historical query time to under 3 seconds via RAG.
- Deliver a synthesized 24-hour clinical summary in under 5 seconds.
- Improve healthcare workflow efficiency across nursing, resident, and specialist roles.
- Surface multi-variable deterioration risk earlier through proactive, explainable alerting.
- Maintain full legal and clinical auditability through immutable action logs and non-destructive data retention.
- Establish a scalable, role-secure foundation for future AI-powered healthcare applications.

---

# 10. Future Enhancements

Potential future improvements include:

- Multi-agent diagnostic council for cross-checked AI recommendations
- Automated SBAR-format shift-handover reports
- Voice-to-text clinical dictation
- Scheduled AI morning-round digest emails
- One-click discharge draft generation
- Offline data caching for network-interrupted bedside use
- Multi-ICU and multi-hospital deployment
- Medical device integration
- Predictive patient deterioration models
- Native mobile application
- Integration with Electronic Health Record (EHR) systems

---

# 11. Conclusion

SmartCare ICU aims to modernize intensive care management by combining centralized, role-secure patient information with explainable Artificial Intelligence, supporting nurses, residents, and specialists in making faster and more informed clinical decisions. By eliminating paper charting, reducing information fragmentation, and surfacing risk proactively through intelligent search, summaries, and reasoned alerts, the proposed system aims to improve ICU workflow efficiency and safety while establishing a strong, auditable foundation for future AI-driven healthcare innovation.
