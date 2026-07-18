const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");

const createDiagnosis = async (admissionId, data, userId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot add diagnosis to an inactive admission", 409);
  }

  const diagnosis = await prisma.diagnosis.create({
    data: {
      admissionId: admission.id,
      conditionName: data.condition_name,
      status: data.status || "ACTIVE",
      diagnosedById: userId,
    },
  });

  return diagnosis;
};

const getDiagnoses = async (admissionId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  const diagnoses = await prisma.diagnosis.findMany({
    where: {
      admissionId,
      isArchived: false,
    },
    include: {
      diagnosedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
    orderBy: {
      diagnosedAt: "desc",
    },
  });

  return diagnoses;
};

const deleteDiagnosis = async (id) => {
  const diagnosis = await prisma.diagnosis.findUnique({
    where: { id },
  });

  if (!diagnosis) {
    throw new APIError("Diagnosis not found", 404);
  }

  if (diagnosis.isArchived) {
    throw new APIError("Diagnosis is already archived", 409);
  }

  await prisma.diagnosis.update({
    where: { id },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });
};

const updateDiagnosis = async (id, data, userId) => {
  const existing = await prisma.diagnosis.findUnique({
    where: { id },
  });
  if (!existing || existing.isArchived) {
    throw new APIError("Diagnosis not found", 404);
  }

  const newConditionName = data.condition_name || existing.conditionName;
  const newStatus = data.status || existing.status;

  return await prisma.$transaction(async (tx) => {
    // Archive the old record
    await tx.diagnosis.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    // Create the new record with the updated state
    const newDiagnosis = await tx.diagnosis.create({
      data: {
        admissionId: existing.admissionId,
        conditionName: newConditionName,
        status: newStatus,
        diagnosedById: userId, // The doctor making the update takes authorship
      },
      include: {
        diagnosedBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    return newDiagnosis;
  });
};

module.exports = {
  createDiagnosis,
  getDiagnoses,
  updateDiagnosis,
  deleteDiagnosis,
};
