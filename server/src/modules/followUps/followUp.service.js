const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");


const createFollowUp = async (admissionId, authorId, data, req) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot add follow-up to non-active admission", 409);
  }

  return await auditedTransaction(req, { action: "CREATE", targetTable: "FollowUp" }, async (tx) => {
    const followUp = await tx.followUp.create({
      data: {
        admissionId,
        authorId,
        subjective: data.subjective || null,
        objective: data.objective || null,
        assessment: data.assessment || null,
        plan: data.plan || null,
      },
    });

    return {
      targetId: followUp.id,
      newValues: followUp,
      result: followUp,
    };
  });
};

const getFollowUps = async (admissionId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  return await prisma.followUp.findMany({
    where: {
      admissionId,
      isArchived: false,
    },
    orderBy: {
      recordedAt: "desc",
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });
};

const deleteFollowUp = async (id, req) => {
  const followUp = await prisma.followUp.findUnique({
    where: { id },
  });

  if (!followUp || followUp.isArchived) {
    throw new APIError("Follow-up not found", 404);
  }

  await auditedTransaction(req, { action: "ARCHIVE", targetTable: "FollowUp" }, async (tx) => {
    const archived = await tx.followUp.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return {
      targetId: archived.id,
      oldValues: followUp,
      newValues: archived,
      result: archived,
    };
  });
};

module.exports = {
  createFollowUp,
  getFollowUps,
  deleteFollowUp,
};
