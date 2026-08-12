const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");

const createLabResult = async (req, admissionId, data, userId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot record lab results for an inactive admission", 409);
  }

  return await auditedTransaction(req, { action: "CREATE", targetTable: "LabResult" }, async (tx) => {
    const result = await tx.labResult.create({
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

    return {
      result,
      targetId: result.id,
      userId,
      newValues: {
        testName: result.testName,
        resultValue: result.resultValue,
        abnormal: result.abnormal,
      }
    };
  });
};

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

const deleteLabResult = async (req, id, userId) => {
  const labResult = await prisma.labResult.findUnique({
    where: { id },
  });

  if (!labResult) {
    throw new APIError("Lab result not found", 404);
  }

  if (labResult.isArchived) {
    throw new APIError("Lab result is already archived", 409);
  }

  await auditedTransaction(req, { action: "ARCHIVE", targetTable: "LabResult" }, async (tx) => {
    const result = await tx.labResult.update({
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
        testName: labResult.testName,
        resultValue: labResult.resultValue,
        abnormal: labResult.abnormal,
      }
    };
  });
};

module.exports = {
  createLabResult,
  getLabResults,
  deleteLabResult,
};
