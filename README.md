<div align="center">

# 🏥 SmartCare ICU
### Intelligent Intensive Care Unit Management & Clinical Decision Support System

[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_DB-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![AWS Bedrock](https://img.shields.io/badge/AI_Engine-AWS_Bedrock_/_LLaMA_3.3-FF9900?style=for-the-badge&logo=amazonwebservices&logoColor=white)](https://aws.amazon.com/bedrock/)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT_/_ISC-yellow.svg?style=for-the-badge)](LICENSE)

<p align="center">
  A state-of-the-art, AI-powered ICU management platform engineered to eliminate paper charts, reduce clinical handover delays from 20 minutes to seconds, and deliver real-time vital deterioration warning scores (NEWS2) alongside verified bedside RAG intelligence.
</p>

[Explore Documentation](./docs/PITCH.md) • [View Guides](./Guide/) • [API Reference](./docs/API-Documenation.md) • [Report Issue](https://github.com/ITI-OS-Team-2026/ICU-Management-Project/issues)

</div>

---

<a id="table-of-contents"></a>
## 📑 Table of Contents

- [🌟 Overview & Value Proposition](#overview)
- [📸 Visual Showcase & Screenshots](#screenshots)
- [⚡ Key Features & Capabilities](#features)
- [👥 Role-Based Access Control (RBAC)](#rbac)
- [🧠 AI Engine & Clinical Decision Support](#ai-engine)
- [🏗️ System Architecture & Data Flow](#architecture)
- [🛠️ Tech Stack](#tech-stack)
- [📁 Project Structure](#project-structure)
- [🚀 Quick Start & Installation](#quick-start)
- [🔐 Environment Configuration](#environment-config)
- [🗄️ Database & Prisma Migrations](#database-migrations)
- [🐳 Docker Deployment](#docker-deployment)
- [🌐 API Endpoints & Swagger](#api-endpoints)
- [👥 Contributors & Credits](#contributors)
- [📄 License](#license)

---

<a id="overview"></a>
## 🌟 Overview & Value Proposition

In fast-paced Intensive Care Units (ICUs), clinical staff grapple with critical information fragmentation: vital charts on paper clipboards, siloed laboratory portals, handwritten doctor notes, and delayed shift handovers. Critical shifts lose **10 to 20 minutes per patient** just reconstructing baseline context.

**SmartCare ICU** replaces disconnected workflows with a unified, real-time clinical platform:
- **Zero-Paper Clinical Workflow**: Centralizes vitals telemetry, laboratory values, radiology/document uploads, medication schedules, diagnosis records, and progress notes.
- **Sub-5-Second 24h AI Patient Summaries**: Synthesizes complex multi-modal patient data into structured organ-system evaluations (Cardiovascular, Respiratory, Renal, Neurological).
- **Bedside Conversational RAG Assistant**: Multi-modal Retrieval-Augmented Generation with exact citations to laboratory and doctor notes for zero-hallucination bedside consultation.
- **Autonomous NEWS2 Deterioration Agent**: Continuous background vital surveillance calculating National Early Warning Scores (NEWS2) to dispatch ranked urgent doctor summonings and telemetry alerts.
- **Strict Clinical Governance**: 4-tier Role-Based Access Control (RBAC), multi-doctor treatment approval safeguards, immutable audit ledgers, and brute-force account lockout defenses.

[⬆ Back to Top](#table-of-contents)

---

<a id="screenshots"></a>
## 📸 Visual Showcase & Screenshots

<div align="center">

### 🖥️ Unified ICU Census Dashboard
![ICU Census Dashboard](./client/src/assets/screenshots/dashboard.png)
*Live bed occupancy, real-time vital telemetry, NEWS2 risk badges, and active patient alerts.*

<br/>

### 🤖 Per-Patient Bedside AI Assistant (RAG + Voice)
![AI Assistant & Clinical Chat](./client/src/assets/screenshots/ai-assistant.png)
*Bedside conversational clinical agent with verifiable source citations and voice integration.*

<br/>

### 📋 Rapid Patient Admission & Bed Allocation
![Patient Admission Workflow](./client/src/assets/screenshots/admission.png)
*Structured clinical intake, baseline vitals validation, previous admission history tracking, and bed assignment.*

<br/>

### 🗺️ Relational Data Architecture & Domain Models (ERD)
![SmartCare ICU ERD Diagram](./docs/ERD-Diagram.png)
*Complete relational entity model supporting multi-role clinical documentation, telemetry, alerts, and AI indexing.*

</div>

[⬆ Back to Top](#table-of-contents)

---

<a id="features"></a>
## ⚡ Key Features & Capabilities

### 🛏️ 1. ICU Census & Bed Management
- **Interactive Unit Grid**: Real-time bed occupancy status (Available, Occupied, Cleaning, Maintenance).
- **Admissions & Discharge Engine**: Structured patient intake with readmission safety tracking and specialist-only discharge sign-off.
- **Shift Handover Logs**: Shift-by-shift nurse and doctor assignments with continuous clinical timeline tracking.

### 📈 2. Real-Time Telemetry & NEWS2 Monitoring
- **High-Frequency Vital Signs Entry**: Record SpO2, Heart Rate, Blood Pressure, Respiratory Rate, Temperature, and GCS.
- **Mandatory Clinical Justifications**: Automated range safety checks requiring clinical justifications whenever outlier vitals are submitted.
- **Interactive Vital Trend Charts**: Tabular and graphic telemetry visualizations (via Recharts) tracking patient trajectories over 12h, 24h, and 7d horizons.
- **National Early Warning Score (NEWS2)**: Automated algorithmic scoring identifying sepsis, respiratory failure, and acute decompensation before crisis points.

### 💊 3. Medication Administration & Safety (eMAR)
- **5-Rights Administration Protocol**: Strict verification for Right Patient, Right Drug, Right Dose, Right Route, and Right Time.
- **Intelligent Frequency Engine**: Supports complex dosing intervals (Q4H, Q6H, Q8H, BID, TID, STAT, PRN) with automated schedule calculation.
- **Treatment Approval Workflow**: Mandatory double-check sign-off between residents and specialists for high-alert interventions.

### 🧪 4. Diagnostics, Labs & Clinical Notes
- **Diagnosis Tracking**: ICD-10 categorization with working, provisional, differential, and confirmed statuses.
- **Investigation Orders & Lab Results**: Reference range validation, abnormality flagging (High/Low/Critical), and instant clinical dissemination.
- **SOAP Clinical Notes**: Structured Subjective, Objective, Assessment, and Plan documentation with full audit accountability.
- **Radiology & Document Hub**: Secure document uploads with Cloudinary storage and Tesseract OCR parsing for text extraction.

### 🚨 5. Real-Time Notifications & Doctor Summoning
- **WebSockets Live Feed**: Real-time broadcasts for emergency vital flags, new laboratory results, and treatment approval requests.
- **Doctor Summoning**: High-priority instant alerts notifying available on-duty specialists to bedside emergencies with audible cues.

[⬆ Back to Top](#table-of-contents)

---

<a id="rbac"></a>
## 👥 Role-Based Access Control (RBAC)

SmartCare ICU implements strict role separation at the routing, service, and database levels:

| Capability / Module | 🛡️ System Admin | 🩺 ICU Nurse | 👨‍⚕️ Medical Resident | 👨‍🏫 ICU Specialist |
| :--- | :---: | :---: | :---: | :---: |
| **Manage Users & Beds** | ✅ Full Access | ❌ No Access | ❌ No Access | ❌ No Access |
| **View Medical Data** | ❌ Forbidden (HIPAA) | ✅ Assigned Patients | ✅ All Patients | ✅ All Patients |
| **Chart Vitals & Record eMAR** | ❌ No Access | ✅ Full Access | ✅ Full Access | ✅ Full Access |
| **Order Tests & Prescribe Meds** | ❌ No Access | ❌ Read Only | ✅ Full Access | ✅ Full Access |
| **Treatment Approval Sign-off** | ❌ No Access | ❌ No Access | ❌ Propose Only | ✅ Authorize |
| **Confirm Patient Discharge** | ❌ No Access | ❌ No Access | ❌ Request Only | ✅ Authorize |
| **Bedside AI & RAG Assistant** | ❌ No Access | ❌ No Access | ✅ Full Access | ✅ Full Access |
| **24h AI Clinical Summary** | ❌ No Access | ❌ No Access | ✅ Full Access | ✅ Full Access |
| **View Immutable Audit Logs** | ✅ Full Access | ❌ No Access | ❌ No Access | ❌ No Access |
| **Unlock Locked Accounts** | ✅ Full Access | ❌ No Access | ❌ No Access | ❌ No Access |

[⬆ Back to Top](#table-of-contents)

---

<a id="ai-engine"></a>
## 🧠 AI Engine & Clinical Decision Support

```
   ┌───────────────────────┐       ┌───────────────────────┐       ┌───────────────────────┐
   │  Electronic Health    │ ───►  │ Chunking, OCR &       │ ───►  │ Vector Indexing       │
   │  Records & Documents  │       │ Text Extraction       │       │ (Amazon Titan v2)     │
   └───────────────────────┘       └───────────────────────┘       └───────────────────────┘
                                                                               │
                                                                               ▼
   ┌───────────────────────┐       ┌───────────────────────┐       ┌───────────────────────┐
   │ Clinician Voice /     │ ───►  │ Semantic Retrieval    │ ───►  │ AWS Bedrock LLM       │
   │ Text Prompt           │       │ (Cosine Similarity)   │       │ (Meta LLaMA 3.3 70B)  │
   └───────────────────────┘       └───────────────────────┘       └───────────────────────┘
                                                                               │
                                                                               ▼
                                                                   ┌───────────────────────┐
                                                                   │ Grounded Answer with  │
                                                                   │ Source Citations      │
                                                                   └───────────────────────┘
```

1. **One-Click 24-Hour Patient Summary**:
   - Queries 24-hour telemetry, labs, interventions, and doctor notes.
   - Formats a concise report organized into Cardiovascular, Respiratory, Renal, and Neurological systems in < 5 seconds.
2. **Bedside Conversational RAG**:
   - Chunks all patient records and indexes them with semantic embeddings (`amazon.titan-embed-text-v2`).
   - Retrieves top-k contextual snippets and feeds them to Meta LLaMA 3.3 70B via AWS Bedrock.
   - Every claim links directly to its source document, author, and timestamp.
3. **Hands-Free Bedside Voice Agent**:
   - Leverages Web Speech API for real-time speech recognition and text-to-speech feedback, enabling sterile bedside queries.
4. **Autonomous NEWS2 Deterioration Engine**:
   - Background cron worker analyzing telemetry streams for physiological trend shifts, alerting staff to early sepsis or shock before decompensation.

[⬆ Back to Top](#table-of-contents)

---

<a id="architecture"></a>
## 🏗️ System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client ["Client Layer (React 19 + Vite + Tailwind v4)"]
        UI["Modern UI / Shadcn / Base UI"]
        State["Zustand Store & Hooks"]
        SocketC["Socket.IO Client"]
        Voice["Voice & Speech Engine"]
        UI --> State
        UI --> SocketC
        UI --> Voice
    end

    subgraph Gateway ["API Gateway & Security (Express 5)"]
        Auth["JWT & Cookie Auth"]
        RateLimit["Rate Limiting & HPP"]
        Audit["Immutable Audit Middleware"]
        RBAC["Role-Based Access Controller"]
    end

    subgraph Core ["Backend Application Engine"]
        Controllers["Module Controllers"]
        Services["Clinical & AI Services"]
        NEWS2["NEWS2 Vital Monitor Job"]
        SocketS["Socket.IO Realtime Gateway"]
    end

    subgraph Data ["Data & Persistence Layer"]
        PrismaORM["Prisma ORM Client"]
        Postgres[("PostgreSQL / Neon DB")]
        Cloudinary["Cloudinary Storage (PDFs/Scans)"]
        Bedrock["AWS Bedrock (LLaMA 3.3 / Titan)"]
    end

    Client -->|REST API over HTTPS| Gateway
    Client <-->|Bi-directional WebSockets| SocketS
    Gateway --> Auth --> RateLimit --> RBAC --> Audit --> Controllers
    Controllers --> Services
    Services --> PrismaORM --> Postgres
    Services --> Cloudinary
    Services --> Bedrock
    NEWS2 --> Services
    Services --> SocketS
```

[⬆ Back to Top](#table-of-contents)

---

<a id="tech-stack"></a>
## 🛠️ Tech Stack

### Frontend Application
- **Framework**: [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + `@tailwindcss/vite`
- **UI Primitives**: [Base UI](https://base-ui.com/) (`@base-ui/react`) + [Shadcn UI](https://ui.shadcn.com/)
- **Icons & Visuals**: [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Charts & Telemetry**: [Recharts](https://recharts.org/)
- **Reports**: [React-PDF](https://react-pdf.org/)
- **Real-Time Client**: [Socket.IO Client](https://socket.io/)

### Backend Application
- **Runtime**: [Node.js 18+](https://nodejs.org/)
- **Framework**: [Express 5](https://expressjs.com/)
- **ORM & Data Modeling**: [Prisma ORM 7.8](https://www.prisma.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Hosted on [Neon](https://neon.tech/))
- **Security & Protection**: `helmet`, `cors`, `express-rate-limit`, `hpp`, `bcrypt`, `jsonwebtoken`
- **Background Jobs**: `node-cron`
- **Email Service**: [Brevo HTTP API](https://www.brevo.com/) / Nodemailer SMTP
- **Logging**: [Winston](https://github.com/winstonjs/winston)

### Artificial Intelligence & Processing
- **LLM Engine**: [AWS Bedrock](https://aws.amazon.com/bedrock/) (Meta LLaMA 3.3 70B Instruct)
- **Vector Embeddings**: Amazon Titan Embeddings v2
- **OCR Engine**: [Tesseract.js](https://tesseract.projectnaptha.com/)
- **PDF Extraction**: `pdf-parse`
- **Document Cloud Storage**: [Cloudinary](https://cloudinary.com/)

[⬆ Back to Top](#table-of-contents)

---

<a id="project-structure"></a>
## 📁 Project Structure

```
ICU-Management-Project/
├── client/                     # React 19 Frontend
│   ├── public/                 # Favicons & SVGs
│   ├── src/
│   │   ├── assets/             # Screenshots, diagrams & branding
│   │   ├── components/         # Shared theme & UI primitives (Base UI)
│   │   ├── features/           # Modular clinical domain slices
│   │   │   ├── components/     # Clinical trend charts, feeds, RAG widgets
│   │   │   ├── hooks/          # React query / state hooks
│   │   │   ├── layouts/        # Main & Patient detail layouts
│   │   │   ├── pages/          # Clinical views (Dashboard, Vitals, Beds, Labs...)
│   │   │   ├── routes/         # Protected React Router v7 configuration
│   │   │   ├── services/       # Axios API client services
│   │   │   └── store/          # Zustand auth & shortcut stores
│   │   ├── lib/                # API client, Socket instance, Utilities
│   │   ├── index.css           # Tailwind CSS v4 design token configuration
│   │   └── main.jsx            # Application root mount
│   └── vite.config.js          # Vite build configuration
│
├── server/                     # Express 5 REST API & WebSocket Backend
│   ├── prisma/                 # Prisma schema definitions & SQL migrations
│   │   ├── schema.prisma       # Master Prisma schema
│   │   ├── migrations/         # Tracked historical SQL migrations
│   │   └── seed.js             # Initial database seed script
│   ├── src/
│   │   ├── config/             # Environment, Swagger, and Brevo email configs
│   │   ├── jobs/               # Background cron workers (NEWS2 monitor, logs)
│   │   ├── middlewares/        # Auth, RBAC, Rate limiter, Audit log, Error handler
│   │   ├── modules/            # Feature-driven domain modules
│   │   │   ├── admissions/     # Admission & discharge flows
│   │   │   ├── ai/             # 24h AI summary & query controllers
│   │   │   ├── alerts/         # Vital alerting & NEWS2 engine
│   │   │   ├── auth/           # Authentication, tokens, password resets
│   │   │   ├── clinicalExaminations/ # Physical exams & history
│   │   │   ├── diagnoses/      # ICD-10 diagnosis tracking
│   │   │   ├── investigationOrders/  # Lab/radiology test orders
│   │   │   ├── labResults/     # Lab values, abnormal flagging
│   │   │   ├── medicalDocuments/     # Cloudinary uploads & OCR
│   │   │   ├── medications/    # 5-Rights eMAR & scheduling engine
│   │   │   ├── notes/          # SOAP clinical documentation
│   │   │   ├── patients/       # Patient demographic registry
│   │   │   ├── rag/            # Vector embeddings & document retrieval
│   │   │   ├── treatmentApprovals/   # Specialist double-check orders
│   │   │   └── vitalSigns/     # High-frequency telemetry records
│   │   └── utils/              # Bedrock AI, Winston logger, Socket gateway
│   ├── app.js                  # Express middleware pipeline assembly
│   └── index.js                # Server entry point & Socket.IO listener
│
├── docs/                       # Technical specifications, SRS, ERD & Security specs
├── Guide/                      # Clinical guides, setup walkthroughs & testing docs
├── postman-collections/        # Complete Postman test collections by wave
└── docker-compose.yml          # Container orchestration setup
```

[⬆ Back to Top](#table-of-contents)

---

<a id="quick-start"></a>
## 🚀 Quick Start & Installation

### 📋 Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** (or `yarn` / `pnpm` / `bun`)
- **PostgreSQL Database**: Neon serverless database (recommended) or local PostgreSQL 15+

---

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/ITI-OS-Team-2026/ICU-Management-Project.git
cd ICU-Management-Project
```

---

### 2️⃣ Configure Backend
```bash
cd server
cp .env.example .env
# Edit .env with your PostgreSQL DATABASE_URL and secret keys
npm install
```

---

### 3️⃣ Initialize Database & Seed Demo Data
```bash
# Generate Prisma Client
npm run prisma:generate

# Apply migrations safely
npx prisma migrate dev

# Seed standard users, demo beds, and test accounts
npm run seed

# (Optional) Seed the vector RAG knowledge base
npm run seed:knowledge-base
```

---

### 4️⃣ Start Backend Server
```bash
npm run dev
# Server running at http://localhost:3000
```

---

### 5️⃣ Configure and Start Frontend
In a new terminal window:
```bash
cd client
cp .env.example .env
# Ensure VITE_API_URL=http://localhost:3000/api/v1 (or your server URL)

npm install
npm run dev
# Client running at http://localhost:5173
```

---

### 🔑 Default Seeded Demo Accounts

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@smartcare.icu` | `SuperSecurePassword2026!` | Manage Users, Beds & Audit Logs |
| **ICU Nurse** | `nurse@smartcare.icu` | `SuperSecurePassword2026!` | Vitals Entry & eMAR Administration |
| **Medical Resident** | `resident@smartcare.icu` | `SuperSecurePassword2026!` | Notes, Lab Orders, Diagnoses, AI Chat |
| **ICU Specialist** | `specialist@smartcare.icu` | `SuperSecurePassword2026!` | Treatment Approvals, Discharge, AI Summaries |

[⬆ Back to Top](#table-of-contents)

---

<a id="environment-config"></a>
## 🔐 Environment Configuration

### Backend (`server/.env`)
```bash
# Server Port & URLs
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# PostgreSQL Connection (Neon DIRECT host recommended)
DATABASE_URL="postgresql://user:pass@host/neondb?sslmode=require"

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=12h

# AWS Bedrock & AI Orchestration
BEDROCK_API_URL=http://apiaccess.iti.net.eg/api/v1/student/chat
BEDROCK_API_KEY=your_bedrock_key
BEDROCK_MODEL_ID=us.meta.llama3-3-70b-instruct-v1:0

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Brevo Transactional Email
EMAIL_PROVIDER=brevo
BREVO_API_KEY=your_brevo_key
EMAIL_FROM=noreply@smartcare.icu
```

### Frontend (`client/.env`)
```bash
VITE_API_URL=http://localhost:3000/api/v1
```

[⬆ Back to Top](#table-of-contents)

---

<a id="database-migrations"></a>
## 🗄️ Database & Prisma Migrations

> [!IMPORTANT]
> **Strict Team Migration Rule**: Never run `npx prisma db push` on shared databases. Always use `npx prisma migrate dev --name <migration_name>` to generate clean, trackable SQL migration history.

```bash
# Generate client artifacts
npx prisma generate

# Create and apply new migration
npx prisma migrate dev --name add_feature_tables

# Deploy migrations in CI/CD or Production
npx prisma migrate deploy

# Open visual database studio
npx prisma studio
```

[⬆ Back to Top](#table-of-contents)

---

<a id="docker-deployment"></a>
## 🐳 Docker Deployment

To launch the full containerized environment:

```bash
# Build and run with Docker Compose
docker compose up -d --build

# View container logs
docker compose logs -f
```

[⬆ Back to Top](#table-of-contents)

---

<a id="api-endpoints--swagger"></a>
## 🌐 API Endpoints & Swagger

Interactive Swagger API documentation is available when running the backend:
👉 **`http://localhost:3000/api-docs`**

### Summary of RESTful API Resources

| Domain | Base Path | Key Methods & Features |
| :--- | :--- | :--- |
| **Authentication** | `/api/v1/auth` | Login, Logout, Current User Profile, Password Reset Requests |
| **Admin Operations** | `/api/v1/admin` | User CRUD, Lock/Unlock Accounts, Bed Configuration, Audit Logs |
| **Patients** | `/api/v1/patients` | Patient Demographic Records, Admission History |
| **Admissions** | `/api/v1/admissions` | Admit Patient, Bed Allocation, Shift Handover, Discharge Sign-off |
| **Vital Signs** | `/api/v1/vital-signs` | High-frequency Telemetry, Trend History, Outlier Validation |
| **Medications** | `/api/v1/medications` | Dosing Schedules, 5-Rights eMAR Administration, Discontinue |
| **Diagnoses** | `/api/v1/diagnoses` | ICD-10 Coding, Primary/Differential/Confirmed Workflows |
| **Investigations** | `/api/v1/investigation-orders` | Lab & Radiology Orders, Urgency Triage |
| **Lab Results** | `/api/v1/lab-results` | Specimen Entry, Reference Ranges, Abnormality Flags |
| **Clinical Notes** | `/api/v1/notes` | Structured SOAP Notes, Daily Progress Updates |
| **Documents** | `/api/v1/medical-documents` | Cloudinary Storage, OCR Text Extraction, PDF Previews |
| **AI Summaries** | `/api/v1/ai/summary` | 24-Hour Multi-organ Automated Clinical Summaries |
| **RAG Assistant** | `/api/v1/rag` | Conversational Vector Search & Source Citations |
| **Alerts** | `/api/v1/alerts` | Urgent Doctor Summoning, Active Alert Acknowledgement |

[⬆ Back to Top](#table-of-contents)

---

<a id="contributors"></a>
## 👥 Contributors & Credits

This project was engineered with passion as an **ITI (Information Technology Institute) Open Source Track 2026** Graduation Project.

<div align="center">

| Contributor | GitHub Profile | Role / Focus |
| :--- | :--- | :--- |
| **Omar Ali Siad** | [@OmarAliSiad](https://github.com/OmarAliSiad) | Architecture, Full-Stack & AI Integration |
| **Ramadan Elgamal** | [@Ramadan-Elgamal](https://github.com/Ramadan-Elgamal) | Backend Services, Data Models & Security |
| **Elsayed Farg** | [@elsayedfarg](https://github.com/elsayedfarg) | Clinical Workflows, Admissions & eMAR |
| **Mohamed Ahmed** | [@mohamedahmed-dev](https://github.com/mohamedahmed-dev) | Frontend Engineering & Real-Time Telemetry |
| **Ahmed Azab** | [@ahmed-azab271](https://github.com/ahmed-azab271) | Testing, Postman Suites & Documentation |

<br/>

<p align="center">
  <a href="https://github.com/OmarAliSiad"><img src="https://avatars.githubusercontent.com/u/105920279?v=4&s=80" width="80" height="80" alt="OmarAliSiad" style="border-radius:50%; margin: 6px;" /></a>
  <a href="https://github.com/Ramadan-Elgamal"><img src="https://avatars.githubusercontent.com/u/107793891?v=4&s=80" width="80" height="80" alt="Ramadan-Elgamal" style="border-radius:50%; margin: 6px;" /></a>
  <a href="https://github.com/elsayedfarg"><img src="https://avatars.githubusercontent.com/u/103282561?v=4&s=80" width="80" height="80" alt="elsayedfarg" style="border-radius:50%; margin: 6px;" /></a>
  <a href="https://github.com/mohamedahmed-dev"><img src="https://avatars.githubusercontent.com/u/214737066?v=4&s=80" width="80" height="80" alt="mohamedahmed-dev" style="border-radius:50%; margin: 6px;" /></a>
  <a href="https://github.com/ahmed-azab271"><img src="https://avatars.githubusercontent.com/u/199368679?v=4&s=80" width="80" height="80" alt="ahmed-azab271" style="border-radius:50%; margin: 6px;" /></a>
</p>

[View Full Contribution Graph →](https://github.com/ITI-OS-Team-2026/ICU-Management-Project/graphs/contributors)

</div>

---

<a id="license"></a>
## 📄 License

This project is distributed under the **ISC / MIT License**. See [`LICENSE`](LICENSE) for more details.

<div align="center">
  <sub>Built with ❤️ by the ITI Open Source Team 2026. Designed for modern intensive care excellence.</sub>
</div>
