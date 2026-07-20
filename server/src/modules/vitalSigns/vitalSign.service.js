const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");

const logVitalSign = async (admissionId, data, userId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot log vitals for an inactive admission", 409);
  }

  const vitalSign = await prisma.vitalSign.create({
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

const updateVitalSign = async (id, data, userId) => {
  const existing = await prisma.vitalSign.findUnique({
    where: { id },
  });

  if (!existing || existing.isArchived) {
    throw new APIError("Vital sign record not found", 404);
  }

  // Transaction for append-only behavior
  return await prisma.$transaction(async (tx) => {
    // Soft delete old record
    await tx.vitalSign.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    // Create new record
    const newRecord = await tx.vitalSign.create({
      data: {
        admissionId: existing.admissionId,
        recordedById: userId, // User making the correction
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

    return newRecord;
  });
};

const deleteVitalSign = async (id) => {
  const vitalSign = await prisma.vitalSign.findUnique({
    where: { id },
  });

  if (!vitalSign) {
    throw new APIError("Vital sign record not found", 404);
  }

  if (vitalSign.isArchived) {
    throw new APIError("Vital sign is already archived", 409);
  }

  await prisma.vitalSign.update({
    where: { id },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });
};

module.exports = {
  logVitalSign,
  getVitalSigns,
  updateVitalSign,
  deleteVitalSign,
};
