const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");
const notificationService = require("../notifications/notification.service");

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
};

const APPROVAL_INCLUDE = {
  requester: { select: USER_SELECT },
  approver: { select: USER_SELECT },
  starter: { select: USER_SELECT },
  completer: { select: USER_SELECT },
};

// Execution is forward-only: a treatment can be started then completed, or
// completed outright, but never rewound.
const EXECUTION_ORDER = { NOT_STARTED: 0, IN_PROGRESS: 1, COMPLETED: 2 };

// Notifications must never roll back the clinical write, so they run outside
// the audited transaction and swallow their own failures.
const notifyQuietly = async (payload) => {
  try {
    await notificationService.createNotification(payload);
  } catch (err) {
    console.error("Failed to send treatment approval notification:", err);
  }
};

const getAdmissionOrThrow = async (admissionId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
    include: {
      patient: { select: { id: true, name: true } },
      bed: { select: { id: true, bedNumber: true } },
    },
  });

  if (!admission || admission.isArchived) {
    throw new APIError("Admission not found", 404);
  }

  return admission;
};

const createTreatmentApproval = async (admissionId, requestedBy, data, req) => {
  const admission = await getAdmissionOrThrow(admissionId);

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot request a treatment approval on a non-active admission", 409);
  }

  const approval = await auditedTransaction(
    req,
    { action: "CREATE", targetTable: "TreatmentApproval" },
    async (tx) => {
      const created = await tx.treatmentApproval.create({
        data: {
          admissionId,
          requestedBy,
          treatmentName: data.treatment_name,
          clinicalJustification: data.clinical_justification || null,
        },
        include: APPROVAL_INCLUDE,
      });

      return {
        targetId: created.id,
        newValues: {
          treatmentName: created.treatmentName,
          clinicalJustification: created.clinicalJustification,
          admissionId: created.admissionId,
        },
        result: created,
      };
    }
  );

  // Any active specialist can decide, so alert all of them except the requester.
  const specialists = await prisma.user.findMany({
    where: {
      role: "ICU_SPECIALIST",
      status: "ACTIVE",
      id: { not: requestedBy },
    },
    select: { id: true },
  });

  const requesterName = [approval.requester?.firstName, approval.requester?.lastName]
    .filter(Boolean)
    .join(" ");

  await Promise.all(
    specialists.map((specialist) =>
      notifyQuietly({
        userId: specialist.id,
        title: "Treatment approval requested",
        message:
          `Dr. ${requesterName} requested approval for "${approval.treatmentName}" ` +
          `for patient ${admission.patient?.name} in bed ${admission.bed?.bedNumber}.`,
        type: "ALERT",
        metadata: {
          entityType: "TREATMENT_APPROVAL",
          entityId: approval.id,
          admissionId,
        },
      })
    )
  );

  return approval;
};

const getTreatmentApprovals = async (admissionId, filters = {}) => {
  await getAdmissionOrThrow(admissionId);

  const where = { admissionId, isArchived: false };

  if (filters.status === "PENDING") {
    where.approvalStatus = null;
  } else if (filters.status === "APPROVED") {
    where.approvalStatus = true;
  } else if (filters.status === "REJECTED") {
    where.approvalStatus = false;
  }

  if (filters.execution) {
    where.executionStatus = filters.execution;
  }

  return await prisma.treatmentApproval.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    include: APPROVAL_INCLUDE,
  });
};

const decideTreatmentApproval = async (id, approverId, approvalStatus, req) => {
  const existing = await prisma.treatmentApproval.findUnique({
    where: { id },
    include: {
      admission: {
        include: {
          patient: { select: { name: true } },
          bed: { select: { bedNumber: true } },
        },
      },
    },
  });

  if (!existing || existing.isArchived) {
    throw new APIError("Treatment approval not found", 404);
  }

  if (existing.approvalStatus !== null) {
    throw new APIError("This treatment approval has already been decided", 409);
  }

  const approval = await auditedTransaction(
    req,
    { action: "UPDATE", targetTable: "TreatmentApproval" },
    async (tx) => {
      const updated = await tx.treatmentApproval.update({
        where: { id },
        data: {
          approvalStatus,
          approvedBy: approverId,
          approvedAt: new Date(),
        },
        include: APPROVAL_INCLUDE,
      });

      return {
        targetId: updated.id,
        oldValues: { approvalStatus: existing.approvalStatus, approvedBy: existing.approvedBy },
        newValues: { approvalStatus: updated.approvalStatus, approvedBy: updated.approvedBy },
        result: updated,
      };
    }
  );

  const approverName = [approval.approver?.firstName, approval.approver?.lastName]
    .filter(Boolean)
    .join(" ");

  await notifyQuietly({
    userId: approval.requestedBy,
    title: approvalStatus ? "Treatment approved" : "Treatment rejected",
    message:
      `Dr. ${approverName} ${approvalStatus ? "approved" : "rejected"} "${approval.treatmentName}" ` +
      `for patient ${existing.admission?.patient?.name} in bed ${existing.admission?.bed?.bedNumber}.`,
    type: approvalStatus ? "INFO" : "ALERT",
    metadata: {
      entityType: "TREATMENT_APPROVAL",
      entityId: approval.id,
      admissionId: approval.admissionId,
    },
  });

  return approval;
};

// Bedside execution log — the nurse records that an approved treatment was
// actually started and finished.
const executeTreatmentApproval = async (id, nurseId, data, req) => {
  const existing = await prisma.treatmentApproval.findUnique({
    where: { id },
    include: {
      admission: {
        include: {
          patient: { select: { name: true } },
          bed: { select: { bedNumber: true } },
        },
      },
    },
  });

  if (!existing || existing.isArchived) {
    throw new APIError("Treatment approval not found", 404);
  }

  if (existing.approvalStatus !== true) {
    throw new APIError(
      existing.approvalStatus === null
        ? "This treatment is still awaiting specialist approval"
        : "This treatment was rejected and cannot be carried out",
      409
    );
  }

  const nextStatus = data.execution_status;

  if (EXECUTION_ORDER[nextStatus] <= EXECUTION_ORDER[existing.executionStatus]) {
    throw new APIError(
      `Treatment execution cannot move from ${existing.executionStatus} to ${nextStatus}`,
      409
    );
  }

  const now = new Date();
  const changes = { executionStatus: nextStatus };

  if (data.execution_notes !== undefined && data.execution_notes !== null) {
    changes.executionNotes = data.execution_notes || null;
  }

  if (nextStatus === "IN_PROGRESS") {
    changes.startedBy = nurseId;
    changes.startedAt = now;
  } else {
    changes.completedBy = nurseId;
    changes.completedAt = now;
    // Completed without a recorded start (short procedure) — stamp the start too.
    if (existing.executionStatus === "NOT_STARTED") {
      changes.startedBy = nurseId;
      changes.startedAt = now;
    }
  }

  const approval = await auditedTransaction(
    req,
    { action: "UPDATE", targetTable: "TreatmentApproval" },
    async (tx) => {
      const updated = await tx.treatmentApproval.update({
        where: { id },
        data: changes,
        include: APPROVAL_INCLUDE,
      });

      return {
        targetId: updated.id,
        oldValues: { executionStatus: existing.executionStatus },
        newValues: { executionStatus: updated.executionStatus },
        result: updated,
      };
    }
  );

  const actor = nextStatus === "IN_PROGRESS" ? approval.starter : approval.completer;
  const nurseName = [actor?.firstName, actor?.lastName].filter(Boolean).join(" ") || "A nurse";
  const verb = nextStatus === "IN_PROGRESS" ? "started" : "completed";

  // Keep the clinicians who asked for and authorised the treatment in the loop.
  const recipients = [...new Set([approval.requestedBy, approval.approvedBy].filter(Boolean))];

  await Promise.all(
    recipients.map((userId) =>
      notifyQuietly({
        userId,
        title: `Treatment ${verb}`,
        message:
          `${nurseName} ${verb} "${approval.treatmentName}" for patient ` +
          `${existing.admission?.patient?.name} in bed ${existing.admission?.bed?.bedNumber}.`,
        type: "INFO",
        metadata: {
          entityType: "TREATMENT_APPROVAL",
          entityId: approval.id,
          admissionId: approval.admissionId,
        },
      })
    )
  );

  return approval;
};

const deleteTreatmentApproval = async (id, req) => {
  const existing = await prisma.treatmentApproval.findUnique({ where: { id } });

  if (!existing || existing.isArchived) {
    throw new APIError("Treatment approval not found", 404);
  }

  if (existing.approvalStatus !== null) {
    throw new APIError("Cannot withdraw a treatment approval that has already been decided", 409);
  }

  if (existing.requestedBy !== req.user.id) {
    throw new APIError("You can only withdraw your own treatment approval requests", 403);
  }

  await auditedTransaction(req, { action: "ARCHIVE", targetTable: "TreatmentApproval" }, async (tx) => {
    const archived = await tx.treatmentApproval.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() },
    });

    return {
      targetId: archived.id,
      oldValues: { isArchived: existing.isArchived },
      newValues: { isArchived: archived.isArchived },
      result: archived,
    };
  });
};

module.exports = {
  createTreatmentApproval,
  getTreatmentApprovals,
  decideTreatmentApproval,
  executeTreatmentApproval,
  deleteTreatmentApproval,
};
