const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");

// POST — record a lab result against an admission.
// Only allowed while the admission is ACTIVE (same guard as diagnoses/vitals/medications/investigationOrders).
const createLabResult = async (admissionId, data, userId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot record lab results for an inactive admission", 409);
  }

  return prisma.labResult.create({
    data: {
      admissionId: admission.id,
      recordedById: userId,
      testName: data.test_name,
      resultValue: data.result_value,
      abnormal: data.abnormal,
    },
    include: {
      recordedBy: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
  });
};

// GET — list lab results for an admission, filtered by date range and/or abnormal flag.
const getLabResults = async (admissionId, query) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  const { from, to, abnormal } = query;

  const where = {
    admissionId,
    isArchived: false,
  };

  if (from || to) {
    where.recordedAt = {};
    if (from) where.recordedAt.gte = new Date(from);
    if (to) where.recordedAt.lte = new Date(to);
  }

  if (abnormal !== undefined) {
    where.abnormal = abnormal === "true";
  }

  return prisma.labResult.findMany({
    where,
    orderBy: { recordedAt: "desc" },
    include: {
      recordedBy: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
  });
};

// DELETE — soft-archive a lab result (lab_results has is_archived/archived_at per ERD).
const deleteLabResult = async (id) => {
  const labResult = await prisma.labResult.findUnique({
    where: { id },
  });

  if (!labResult) {
    throw new APIError("Lab result not found", 404);
  }

  if (labResult.isArchived) {
    throw new APIError("Lab result is already archived", 409);
  }

  await prisma.labResult.update({
    where: { id },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });
};

module.exports = {
  createLabResult,
  getLabResults,
  deleteLabResult,
};
