const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const logger = require("../../utils/logger");
const { auditedTransaction } = require("../../middlewares/auditLog");
const notificationService = require("../notifications/notification.service");

// A diagnosis moves through the differential in one direction at a time.
// Anything not listed here is a data-entry mistake, not a clinical event.
const ALLOWED_TRANSITIONS = {
  SUSPECTED: ["CONFIRMED", "RULED_OUT"],
  // A confirmed condition can resolve, or turn out to have been wrong.
  CONFIRMED: ["RESOLVED", "RULED_OUT"],
  // Relapse: a resolved condition can become active again.
  RESOLVED: ["CONFIRMED"],
  // Ruled out is terminal — a new diagnosis should be raised instead, so the
  // record shows the condition was reconsidered rather than silently revived.
  RULED_OUT: [],
};

const diagnosisInclude = {
  diagnosedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
  originalDiagnosedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
  statusChangedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
  acknowledgements: {
    include: { nurse: { select: { id: true, firstName: true, lastName: true, role: true } } },
    orderBy: { acknowledgedAt: "asc" },
  },
  concerns: {
    include: {
      raisedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      respondedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  },
};

const auditableFields = (d) => ({
  conditionName: d.conditionName,
  type: d.type,
  status: d.status,
  clinicalNotes: d.clinicalNotes,
  onsetDate: d.onsetDate,
});

const notifyAssignedNurses = async (admissionId, { title, message, type = "INFO", metadata }) => {
  try {
    const assignments = await prisma.admissionNurse.findMany({
      where: { admissionId, isArchived: false, unassignedAt: null },
      select: { nurseId: true },
    });

    await Promise.all(
      assignments.map((assignment) =>
        notificationService.createNotification({
          userId: assignment.nurseId,
          title,
          message,
          type,
          metadata,
        })
      )
    );
  } catch (err) {
    // The diagnosis is already committed and is the source of truth; a failed
    // notification must not undo it.
    logger.error(`Failed to notify nurses for admission ${admissionId}: ${err.message}`);
  }
};

const notifyDoctors = async (admissionId, { title, message, type = "ALERT", metadata }) => {
  try {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      select: { doctorId: true },
    });
    if (!admission?.doctorId) return;

    await notificationService.createNotification({
      userId: admission.doctorId,
      title,
      message,
      type,
      metadata,
    });
  } catch (err) {
    logger.error(`Failed to notify the attending doctor for ${admissionId}: ${err.message}`);
  }
};

// Two live rows for the same condition fragment the problem list and confuse
// the AI summary, which reads this table directly.
const findDuplicates = async (admissionId, conditionName, client = prisma, excludeId = null) => {
  const open = await client.diagnosis.findMany({
    where: {
      admissionId,
      isArchived: false,
      status: { in: ["SUSPECTED", "CONFIRMED"] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const name = conditionName.trim().toLowerCase();
  return open.filter((d) => d.conditionName.trim().toLowerCase() === name);
};

// Only one condition can be the reason for admission. Promoting a new primary
// demotes the incumbent rather than silently allowing two.
const demoteExistingPrimary = async (tx, admissionId, exceptId = null) => {
  await tx.diagnosis.updateMany({
    where: {
      admissionId,
      isArchived: false,
      type: "PRIMARY",
      status: { in: ["SUSPECTED", "CONFIRMED"] },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    data: { type: "SECONDARY" },
  });
};

const createDiagnosis = async (req, admissionId, data, userId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
    include: { patient: { select: { name: true } } },
  });

  if (!admission) throw new APIError("Admission not found", 404);
  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot add diagnosis to an inactive admission", 409);
  }

  const duplicates = await findDuplicates(admissionId, data.condition_name);

  const diagnosis = await auditedTransaction(
    req,
    { action: "CREATE", targetTable: "Diagnosis" },
    async (tx) => {
      if (data.type === "PRIMARY") {
        await demoteExistingPrimary(tx, admissionId);
      }

      const created = await tx.diagnosis.create({
        data: {
          admissionId: admission.id,
          conditionName: data.condition_name,
          type: data.type || "SECONDARY",
          status: data.status || "SUSPECTED",
          clinicalNotes: data.clinical_notes || null,
          onsetDate: data.onset_date ? new Date(data.onset_date) : null,
          diagnosedById: userId,
          originalDiagnosedById: userId,
        },
        include: diagnosisInclude,
      });

      return { result: created, targetId: created.id, userId, newValues: auditableFields(created) };
    }
  );

  await notifyAssignedNurses(admissionId, {
    title: "New diagnosis recorded",
    message: `${diagnosis.conditionName} (${diagnosis.status.toLowerCase()}) for ${admission.patient?.name}.`,
    metadata: { admissionId, diagnosisId: diagnosis.id },
  });

  return {
    ...diagnosis,
    duplicateWarning: duplicates.length > 0 ? duplicates.map((d) => d.id) : undefined,
  };
};

const getDiagnoses = async (admissionId, query = {}) => {
  const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
  if (!admission) throw new APIError("Admission not found", 404);

  const where = { admissionId, isArchived: false };
  if (query.status) where.status = query.status;

  return await prisma.diagnosis.findMany({
    where,
    include: diagnosisInclude,
    // Primary first, then newest — the problem list should read top-down.
    orderBy: [{ type: "asc" }, { diagnosedAt: "desc" }],
  });
};

// Amending is append-only: the old row is archived and a new one written, so
// the version a nurse acknowledged is never rewritten underneath them.
const updateDiagnosis = async (req, id, data, userId) => {
  const existing = await prisma.diagnosis.findUnique({ where: { id } });
  if (!existing || existing.isArchived) throw new APIError("Diagnosis not found", 404);

  // Status changes carry a mandatory clinical reason, so they go through
  // changeStatus rather than riding along with an edit to the wording.
  if (data.status && data.status !== existing.status) {
    throw new APIError(
      "Use PATCH /diagnoses/:id/status to change a diagnosis status so the clinical reason is recorded.",
      400
    );
  }

  const nextType = data.type || existing.type;

  const updated = await auditedTransaction(
    req,
    { action: "UPDATE", targetTable: "Diagnosis" },
    async (tx) => {
      await tx.diagnosis.update({
        where: { id },
        data: { isArchived: true, archivedAt: new Date() },
      });

      if (nextType === "PRIMARY") {
        await demoteExistingPrimary(tx, existing.admissionId, id);
      }

      const created = await tx.diagnosis.create({
        data: {
          admissionId: existing.admissionId,
          conditionName: data.condition_name || existing.conditionName,
          type: nextType,
          status: existing.status,
          clinicalNotes:
            data.clinical_notes !== undefined ? data.clinical_notes : existing.clinicalNotes,
          onsetDate:
            data.onset_date !== undefined
              ? data.onset_date
                ? new Date(data.onset_date)
                : null
              : existing.onsetDate,
          // The amending clinician owns the new version; the original author
          // is carried forward so authorship is never lost.
          diagnosedById: userId,
          originalDiagnosedById: existing.originalDiagnosedById || existing.diagnosedById,
          ruledOutReason: existing.ruledOutReason,
          resolvedAt: existing.resolvedAt,
          resolutionReason: existing.resolutionReason,
          statusChangedById: existing.statusChangedById,
        },
        include: diagnosisInclude,
      });

      return {
        result: created,
        targetId: created.id,
        userId,
        oldValues: { id: existing.id, ...auditableFields(existing) },
        newValues: { id: created.id, ...auditableFields(created) },
      };
    }
  );

  await notifyAssignedNurses(existing.admissionId, {
    title: "Diagnosis amended",
    message: `${updated.conditionName} was amended — please review and acknowledge.`,
    metadata: { admissionId: existing.admissionId, diagnosisId: updated.id },
  });

  return updated;
};

/**
 * Move a diagnosis through the differential. Each destination demands its own
 * justification, which is the whole point of recording the transition.
 */
const changeStatus = async (req, id, data, userId) => {
  const existing = await prisma.diagnosis.findUnique({ where: { id } });
  if (!existing || existing.isArchived) throw new APIError("Diagnosis not found", 404);

  const next = data.status;
  if (next === existing.status) {
    throw new APIError(`Diagnosis is already ${next}`, 409);
  }

  const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(next)) {
    throw new APIError(
      allowed.length === 0
        ? `A ${existing.status} diagnosis cannot change status. Raise a new diagnosis instead.`
        : `Cannot move a ${existing.status} diagnosis to ${next}. Allowed: ${allowed.join(", ")}.`,
      409
    );
  }

  const updated = await auditedTransaction(
    req,
    { action: "UPDATE", targetTable: "Diagnosis" },
    async (tx) => {
      const result = await tx.diagnosis.update({
        where: { id },
        data: {
          status: next,
          statusChangedById: userId,
          // Each outcome writes only its own field, so a relapse does not
          // inherit the reason a previous episode was closed.
          clinicalNotes:
            next === "CONFIRMED" && data.reason ? data.reason : existing.clinicalNotes,
          ruledOutReason: next === "RULED_OUT" ? data.reason : null,
          resolutionReason: next === "RESOLVED" ? data.reason : null,
          resolvedAt: next === "RESOLVED" ? new Date(data.resolved_at || Date.now()) : null,
        },
        include: diagnosisInclude,
      });

      return {
        result,
        targetId: id,
        userId,
        oldValues: { status: existing.status },
        newValues: { status: next, reason: data.reason },
      };
    }
  );

  await notifyAssignedNurses(existing.admissionId, {
    title: `Diagnosis ${next.toLowerCase().replace("_", " ")}`,
    message: `${existing.conditionName} is now ${next.replace("_", " ").toLowerCase()} — ${data.reason}`,
    metadata: { admissionId: existing.admissionId, diagnosisId: id },
  });

  return updated;
};

const deleteDiagnosis = async (req, id, userId) => {
  const existing = await prisma.diagnosis.findUnique({ where: { id } });
  if (!existing) throw new APIError("Diagnosis not found", 404);
  if (existing.isArchived) throw new APIError("Diagnosis is already archived", 409);

  await auditedTransaction(req, { action: "ARCHIVE", targetTable: "Diagnosis" }, async (tx) => {
    const result = await tx.diagnosis.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() },
    });

    return { result, targetId: id, userId, oldValues: auditableFields(existing) };
  });
};

// =======================
// NURSE ACKNOWLEDGEMENT
// =======================

const acknowledgeDiagnosis = async (req, id, userId) => {
  const diagnosis = await prisma.diagnosis.findUnique({ where: { id } });
  if (!diagnosis || diagnosis.isArchived) throw new APIError("Diagnosis not found", 404);

  const existing = await prisma.diagnosisAcknowledgement.findUnique({
    where: { diagnosisId_nurseId: { diagnosisId: id, nurseId: userId } },
  });
  if (existing) return existing;

  return await auditedTransaction(
    req,
    { action: "CREATE", targetTable: "DiagnosisAcknowledgement" },
    async (tx) => {
      const created = await tx.diagnosisAcknowledgement.create({
        data: { diagnosisId: id, nurseId: userId },
        include: { nurse: { select: { id: true, firstName: true, lastName: true, role: true } } },
      });

      return {
        result: created,
        targetId: created.id,
        userId,
        newValues: { diagnosisId: id, conditionName: diagnosis.conditionName },
      };
    }
  );
};

// =======================
// NURSING CONCERNS
// =======================

const raiseConcern = async (req, id, data, userId) => {
  const diagnosis = await prisma.diagnosis.findUnique({
    where: { id },
    include: { admission: { select: { id: true, patient: { select: { name: true } } } } },
  });
  if (!diagnosis || diagnosis.isArchived) throw new APIError("Diagnosis not found", 404);

  const concern = await auditedTransaction(
    req,
    { action: "CREATE", targetTable: "DiagnosisConcern" },
    async (tx) => {
      const created = await tx.diagnosisConcern.create({
        data: { diagnosisId: id, raisedById: userId, note: data.note },
        include: {
          raisedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      });

      return {
        result: created,
        targetId: created.id,
        userId,
        newValues: { diagnosisId: id, conditionName: diagnosis.conditionName, note: data.note },
      };
    }
  );

  await notifyDoctors(diagnosis.admissionId, {
    title: "Nursing concern raised",
    message: `${concern.raisedBy.firstName} ${concern.raisedBy.lastName} raised a concern about "${diagnosis.conditionName}" for ${diagnosis.admission?.patient?.name}: ${data.note}`,
    metadata: { admissionId: diagnosis.admissionId, diagnosisId: id, concernId: concern.id },
  });

  return concern;
};

const respondToConcern = async (req, concernId, data, userId) => {
  const existing = await prisma.diagnosisConcern.findUnique({
    where: { id: concernId },
    include: { diagnosis: { select: { admissionId: true, conditionName: true } } },
  });
  if (!existing) throw new APIError("Concern not found", 404);
  if (existing.status !== "OPEN") throw new APIError("This concern has already been answered", 409);

  const concern = await auditedTransaction(
    req,
    { action: "UPDATE", targetTable: "DiagnosisConcern" },
    async (tx) => {
      const result = await tx.diagnosisConcern.update({
        where: { id: concernId },
        data: {
          status: data.status,
          responseNote: data.response_note,
          respondedById: userId,
          respondedAt: new Date(),
        },
        include: {
          raisedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          respondedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      });

      return {
        result,
        targetId: concernId,
        userId,
        oldValues: { status: existing.status },
        newValues: { status: data.status, responseNote: data.response_note },
      };
    }
  );

  // The nurse who raised it is the one waiting on an answer.
  try {
    await notificationService.createNotification({
      userId: existing.raisedById,
      title: `Concern ${data.status.toLowerCase()}`,
      message: `Your concern about "${existing.diagnosis?.conditionName}" was answered: ${data.response_note}`,
      type: "INFO",
      metadata: { admissionId: existing.diagnosis?.admissionId, concernId },
    });
  } catch (err) {
    logger.error(`Failed to notify the nurse who raised concern ${concernId}: ${err.message}`);
  }

  return concern;
};

const getOpenConcerns = async (admissionId) => {
  return await prisma.diagnosisConcern.findMany({
    where: { status: "OPEN", diagnosis: { admissionId, isArchived: false } },
    include: {
      raisedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      diagnosis: { select: { id: true, conditionName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

module.exports = {
  ALLOWED_TRANSITIONS,
  findDuplicates,
  createDiagnosis,
  getDiagnoses,
  updateDiagnosis,
  changeStatus,
  deleteDiagnosis,
  acknowledgeDiagnosis,
  raiseConcern,
  respondToConcern,
  getOpenConcerns,
};
