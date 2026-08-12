const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");

const { auditedTransaction } = require("../../middlewares/auditLog");

const logVitalSign = async (req, admissionId, data, userId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot log vitals for an inactive admission", 409);
  }

  const vitalSign = await auditedTransaction(
    req,
    { action: "CREATE", targetTable: "VitalSign" },
    async (tx) => {
      const created = await tx.vitalSign.create({
        data: {
          admissionId,
          recordedById: userId,
          temperature: data.temperature,
          pulse: data.pulse,
          systolicBp: data.systolic_bp,
          diastolicBp: data.diastolic_bp,
          respiratoryRate: data.respiratory_rate,
          spo2: data.spo2,
          isOverride: data.is_override || false,
          overrideReason: data.override_reason,
        },
      });

      return {
        result: created,
        targetId: created.id,
        userId,
        newValues: {
          temperature: created.temperature,
          pulse: created.pulse,
          systolicBp: created.systolicBp,
          diastolicBp: created.diastolicBp,
          respiratoryRate: created.respiratoryRate,
          spo2: created.spo2,
          isOverride: created.isOverride,
          overrideReason: created.overrideReason,
        }
      };
    }
  );

  return vitalSign;
};

const getVitalSigns = async (admissionId, query) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  const { from, to, limit } = query;

  const where = {
    admissionId,
    isArchived: false,
  };

  if (from || to) {
    where.recordedAt = {};
    if (from) where.recordedAt.gte = new Date(from);
    if (to) where.recordedAt.lte = new Date(to);
  }

  const vitalSigns = await prisma.vitalSign.findMany({
    where,
    orderBy: {
      recordedAt: "desc",
    },
    take: limit ? parseInt(limit, 10) : undefined,
    include: {
      recordedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  return vitalSigns;
};

const updateVitalSign = async (req, id, data, userId) => {
  const existing = await prisma.vitalSign.findUnique({
    where: { id },
  });

  if (!existing || existing.isArchived) {
    throw new APIError("Vital sign record not found", 404);
  }

  return await auditedTransaction(
    req,
    { action: "UPDATE", targetTable: "VitalSign" },
    async (tx) => {
      await tx.vitalSign.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      const newRecord = await tx.vitalSign.create({
        data: {
          admissionId: existing.admissionId,
          recordedById: userId,
          temperature: data.temperature !== undefined ? data.temperature : existing.temperature,
          pulse: data.pulse !== undefined ? data.pulse : existing.pulse,
          systolicBp: data.systolic_bp !== undefined ? data.systolic_bp : existing.systolicBp,
          diastolicBp: data.diastolic_bp !== undefined ? data.diastolic_bp : existing.diastolicBp,
          respiratoryRate: data.respiratory_rate !== undefined ? data.respiratory_rate : existing.respiratoryRate,
          spo2: data.spo2 !== undefined ? data.spo2 : existing.spo2,
          isOverride: data.is_override !== undefined ? data.is_override : existing.isOverride,
          overrideReason: data.override_reason !== undefined ? data.override_reason : existing.overrideReason,
        },
        include: {
          recordedBy: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      });

      return {
        result: newRecord,
        targetId: newRecord.id,
        userId,
        oldValues: {
          id: existing.id,
          temperature: existing.temperature,
          pulse: existing.pulse,
          systolicBp: existing.systolicBp,
          diastolicBp: existing.diastolicBp,
          respiratoryRate: existing.respiratoryRate,
          spo2: existing.spo2,
          isOverride: existing.isOverride,
          overrideReason: existing.overrideReason,
        },
        newValues: {
          id: newRecord.id,
          temperature: newRecord.temperature,
          pulse: newRecord.pulse,
          systolicBp: newRecord.systolicBp,
          diastolicBp: newRecord.diastolicBp,
          respiratoryRate: newRecord.respiratoryRate,
          spo2: newRecord.spo2,
          isOverride: newRecord.isOverride,
          overrideReason: newRecord.overrideReason,
        }
      };
    }
  );
};

const deleteVitalSign = async (req, id, userId) => {
  const vitalSign = await prisma.vitalSign.findUnique({
    where: { id },
  });

  if (!vitalSign) {
    throw new APIError("Vital sign record not found", 404);
  }

  if (vitalSign.isArchived) {
    throw new APIError("Vital sign is already archived", 409);
  }

  await auditedTransaction(
    req,
    { action: "ARCHIVE", targetTable: "VitalSign" },
    async (tx) => {
      const result = await tx.vitalSign.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      return {
        result,
        targetId: id,
        userId,
        oldValues: {
          temperature: vitalSign.temperature,
          pulse: vitalSign.pulse,
          systolicBp: vitalSign.systolicBp,
          diastolicBp: vitalSign.diastolicBp,
          respiratoryRate: vitalSign.respiratoryRate,
          spo2: vitalSign.spo2,
        }
      };
    }
  );
};

module.exports = {
  logVitalSign,
  getVitalSigns,
  updateVitalSign,
  deleteVitalSign,
};
