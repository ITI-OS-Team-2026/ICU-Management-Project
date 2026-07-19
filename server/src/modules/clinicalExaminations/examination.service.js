const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");

const createExamination = async (admissionId, examinerId, data) => {
  // Verify admission exists and is active
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId }
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }
  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot add examination to an inactive admission", 400);
  }

  // Create clinical examination
  const examination = await prisma.clinicalExamination.create({
    data: {
      admissionId,
      examinerId,
      generalExams: data.general_exams,
      localExams: data.local_exams
    }
  });

  return examination;
};

const getExaminations = async (admissionId) => {
  // Verify admission exists
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId }
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  const examinations = await prisma.clinicalExamination.findMany({
    where: {
      admissionId,
      isArchived: false
    },
    include: {
      examiner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return examinations;
};

module.exports = {
  createExamination,
  getExaminations
};
