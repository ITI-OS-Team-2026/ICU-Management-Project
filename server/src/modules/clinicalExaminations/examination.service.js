const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");

const createExamination = async (req, admissionId, examinerId, data) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot add examination to an inactive admission", 409);
  }

  return await auditedTransaction(req, { action: "CREATE", targetTable: "ClinicalExamination" }, async (tx) => {
    const result = await tx.clinicalExamination.create({
      data: {
        admissionId: admission.id,
        examinerId,
        generalExams: data.general_exams,
        localExams: data.local_exams,
      },
      include: {
        examiner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return {
      result,
      targetId: result.id,
      userId: examinerId,
      newValues: {
        generalExams: result.generalExams,
        localExams: result.localExams,
      }
    };
  });
};

const getExaminations = async (admissionId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  const examinations = await prisma.clinicalExamination.findMany({
    where: { admissionId },
    orderBy: { examinedAt: "desc" },
    include: {
      examiner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  return examinations;
};

module.exports = {
  createExamination,
  getExaminations
};
