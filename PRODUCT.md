# Product

## Register

product

## Platform

adaptive

## Users

- **ICU Nurses & Nursing Staff**: Charge and shift nurses operating in high-stress, fast-paced intensive care environments. Their primary job is rapid, accurate, and continuous data entry upon admission, logging hourly vital signs, fluid intake/output, and Glasgow Coma Scale (GCS) scores, as well as uploading PDF lab results and radiology images without touching paper charts.
- **Medical Residents & Junior Doctors**: Physicians executing day-to-day patient management during long shifts. Their primary job is conducting clinical assessments, logging detailed medical history, querying the conversational RAG system to instantly extract specific historical metrics across shifts, and evaluating/escalating real-time alerts from the Autonomous Monitoring Agent.
- **ICU Specialists & Attending Physicians**: Senior consultants carrying final clinical authority under extreme time constraints. Their primary job is reviewing unified patient data during clinical rounds, utilizing one-click AI Instant Summarization for rapid 24-hour overviews, assessing AI-suggested differential diagnoses with clinical reasoning explanations, and finalizing treatment or discharge approvals.
- **System Administrators**: Hospital IT personnel and departmental managers. Their primary job is managing user accounts, role assignments (RBAC), API rate limits, and secure database backups while strictly respecting patient privacy (no access to unblinded clinical records).

## Product Purpose

SmartCare ICU is a paperless, state-of-the-art intensive care management and AI decision-support platform. It exists to eliminate paper from the ICU lifecycle, consolidate fragmented patient records into a unified, highly responsive dashboard, and empower clinical staff with proactive AI-driven diagnostic reasoning and autonomous monitoring—ultimately reducing cognitive load and saving patient lives.

## Brand Personality

- **Clinical Precision**: Rigorous, clean, and exact typography with clear spatial hierarchy that inspires trust.
- **Uncluttered Vigilance**: Data-dense without being overwhelming; critical trends and alerts surface instantly with crisp, unambiguous visual cues.
- **Expert Confidence**: Professional, calm, and resilient under pressure, supporting both dark/slate and light hospital environments with uncompromising clarity.

## Anti-references

- **No Low-Contrast Text**: Strictly avoid muted or gray body text on light/tinted backgrounds (must hit or exceed `≥4.5:1` WCAG AA contrast).
- **No Decorative Glassmorphism or Blurs**: Blurs, frosted glass, and non-functional background gradients reduce visual crispness and degrade GPU performance on hospital workstations/tablets.
- **No Card Grid Slop or Nested Cards**: Avoid repeating identical card layouts and deeply nested container borders (`border-left` side-stripe accents, boxed-within-boxes clutter).
- **No Decorative Text Gradients or Eyebrow Kicker Spam**: Do not use `background-clip: text` gradients on headings or tiny uppercase tracked `01 / 02 / 03` eyebrows above every section.
- **No Hidden Critical Affordances**: Never hide critical medical actions, alert explanations, or interactive targets inside hover-only states (`<img>` hover animations are strictly banned).

## Design Principles

1. **Uncluttered Vigilance Above All**: Every pixel must serve clinical clarity and speed. Information hierarchy must naturally guide the clinician's eye to critical physiological shifts, visual trend sparklines, and abnormal AI telemetry alerts without visual friction.
2. **High-Precision Ergonomics (Adaptive Web & Bedside Tablet)**: Built to run seamlessly across desktop hospital terminals and touch-first bedside iPad/tablet carts (`adaptive`). Interactive targets are generous, data entry forms support rapid keyboard and touch input with smart validation, and the Sticky Clinical Context Bar anchors critical patient identity and status at all times.
3. **Zero Ambiguity in Clinical Alerts**: Autonomous monitoring notifications and AI diagnostic suggestions must be distinct, actionable, and backed by transparent clinical rationale (`Clinical Reasoning Explanations`). Emergency states and P0 alerts command immediate visual priority without visual noise.
4. **Strict Role-Driven Boundaries (RBAC Reflection)**: The interface naturally adapts to the authenticated user's scope—streamlining high-speed data entry for Nurses, deep RAG querying and monitoring triage for Residents, instant 24-hour summarization and approval gates for Specialists, and blinded system administration for IT.
5. **Legible at 4:00 AM (`≥4.5:1` Strict Contrast)**: Whether viewed under harsh ICU fluorescent lighting or in dimmed night-shift rooms, contrast across body text, vital sign metrics, and status indicators rigorously adheres to accessibility standards (`≥4.5:1` for body text, `≥3:1` for large display metrics).

## Accessibility & Inclusion

- **Strict WCAG AA Compliance**: All body text, data table cells, form labels, and interactive buttons must maintain `≥4.5:1` contrast against their backgrounds. Large numerical vitals and headings require `≥3:1`.
- **Reduced Motion Support**: All transitions, alert pulses, and chart renders must respect `@media (prefers-reduced-motion: reduce)` by providing instant crossfades or static visual states.
- **Color-Blind Safe Visualizations**: Vital trend sparklines and status indicators (normal vs. critical/abnormal) must never rely on color alone (e.g., red/green distinction); they must pair distinct icons, labels, or line styles with high-contrast color tokens.
- **Keyboard & Screen Reader Navigation**: Full tab order, focus indicators (`focus-visible` ring), and clear semantic ARIA roles (`role="alert"`, `aria-live="polite"` for incoming AI alerts) across all modals and inputs.
