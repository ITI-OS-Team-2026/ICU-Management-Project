# Treatment Approval Guide

## Overview

The Treatment Approval system implements a two-phase lifecycle for ICU treatments: **approval** followed by **execution** (by a nurse). ICU Specialists' treatments are **auto-approved** on creation, while Medical Residents' requests require specialist approval first.

---

## Data Model

### TreatmentApproval

| Field                 | Type                                          | Description                                |
| --------------------- | --------------------------------------------- | ------------------------------------------ |
| id                    | UUID                                          | Primary key                                |
| admissionId           | UUID                                          | Links to patient admission                 |
| treatmentName         | String                                        | Name of the treatment                      |
| clinicalJustification | String (optional)                             | Why the treatment is needed                |
| approvalStatus        | `null` / `true` / `false`                     | Pending / Approved / Rejected              |
| executionStatus       | `NOT_STARTED` / `IN_PROGRESS` / `COMPLETED`   | Bedside execution state                    |
| requestedById         | UUID                                          | Doctor who requested                       |
| approvedById          | UUID (nullable)                               | Specialist who approved/rejected           |
| startedById           | UUID (nullable)                               | Nurse who started execution                |
| completedById         | UUID (nullable)                               | Nurse who completed execution              |
| isArchived            | Boolean                                       | Soft-delete flag (for withdrawals)         |

---

## Workflow

### Specialist Creates a Treatment (auto-approved)

```
ICU Specialist creates a treatment
            |
    Auto-approved immediately
    (approvalStatus = true, approvedBy = self)
            |
    Ready for nurse execution
```

Specialists do not need anyone else's sign-off. The treatment is created with `approvalStatus = true` and is immediately available for nurse execution. No notifications are sent to other specialists.

### Resident Requests a Treatment (needs approval)

```
Medical Resident creates a treatment request
                    |
        approvalStatus = null (PENDING)
                    |
    All ICU Specialists are notified
                    |
        ICU Specialist reviews the request
               /            \
          Approve           Reject
     (status = true)    (status = false)
              |                |
    Requester notified   Requester notified
        (INFO)              (ALERT)
```

### Phase 2: Execution (only if approved)

```
    ICU Nurse starts the treatment
                |
    executionStatus = IN_PROGRESS
    (requester + approver notified)
                |
    ICU Nurse completes the treatment
    (can attach bedside notes)
                |
    executionStatus = COMPLETED
    (requester + approver notified)
```

Execution transitions are **forward-only**: `NOT_STARTED` -> `IN_PROGRESS` -> `COMPLETED` (or straight to `COMPLETED` for short procedures).

### Withdrawal

A requester can **withdraw** their own request while it is still pending (soft-archive). Once approved or rejected, it cannot be withdrawn. Specialist auto-approved treatments cannot be withdrawn (they are already approved).

---

## Role Permissions

| Action                  | Allowed Roles                      | Notes                                      |
| ----------------------- | ---------------------------------- | ------------------------------------------ |
| Create a treatment      | `ICU_SPECIALIST`                   | Auto-approved, no approval needed          |
| Request a treatment     | `MEDICAL_RESIDENT`                 | Requires specialist approval               |
| View treatment list     | `ICU_NURSE`, `MEDICAL_RESIDENT`, `ICU_SPECIALIST` |                                |
| Approve / Reject        | `ICU_SPECIALIST` only              | Only for resident requests, irreversible   |
| Execute (start/complete)| `ICU_NURSE` only                   | Can attach bedside notes                   |
| Withdraw                | `MEDICAL_RESIDENT`, `ICU_SPECIALIST` | Own pending requests only                |

---

## API Endpoints

All routes require authentication.

| Method | Route                                        | Description                    |
| ------ | -------------------------------------------- | ------------------------------ |
| POST   | `/admissions/:id/treatment-approvals`        | Create a treatment (auto-approved for specialists) or request approval (for residents) |
| GET    | `/admissions/:id/treatment-approvals`        | List treatments (filterable by `status` and `execution` query params) |
| PATCH  | `/treatment-approvals/:id`                   | Approve or reject              |
| PATCH  | `/treatment-approvals/:id/execution`         | Record start or completion     |
| DELETE | `/treatment-approvals/:id`                   | Withdraw a pending request     |

---

## Notification Flow

All notifications are fire-and-forget (failures never block the main operation).

| Event                          | Who Gets Notified                             | Type  |
| ------------------------------ | --------------------------------------------- | ----- |
| Resident request created       | All active ICU Specialists (except requester)  | ALERT |
| Specialist treatment created   | No one (auto-approved)                        | —     |
| Approved                       | Original requester                            | INFO  |
| Rejected                       | Original requester                            | ALERT |
| Execution started              | Requester + Approver                          | INFO  |
| Execution completed            | Requester + Approver                          | INFO  |

---

## Frontend (`PatientTreatmentApprovalsPage.jsx`)

- **Filter tabs**: All / Pending / Approved / Rejected
- **Approval cards**: Show requester info, clinical justification, and timestamps
- **Role-aware UI**:
  - **Specialists** see "Create Treatment" button and dialog (since their treatments are auto-approved)
  - **Residents** see "Request Approval" button and dialog (since they need specialist sign-off)
  - **Specialists** see inline approve/reject buttons on pending resident requests
  - **Nurses** see the execution strip on approved treatments
- **Execution confirmation dialog**: With bedside notes textarea

All mutations are wrapped in `auditedTransaction` for audit logging.
