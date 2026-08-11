const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");

const createClinicalNote = async (req, admissionId, authorId, content) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot add note to non-active admission", 400);
  }

  return auditedTransaction(req, { action: "CREATE", targetTable: "ClinicalNote" }, async (tx) => {
    const note = await tx.clinicalNote.create({
      data: {
        admissionId,
        authorId,
        content,
      },
    });
    return {
      targetId: note.id,
      newValues: note,
      result: note,
    };
  });
};

const getClinicalNotes = async (admissionId) => {
  return await prisma.clinicalNote.findMany({
    where: { admissionId },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
  });
};

const deleteClinicalNote = async (req, noteId) => {
  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new APIError("Clinical note not found", 404);
  }

  return auditedTransaction(req, { action: "ARCHIVE", targetTable: "ClinicalNote" }, async (tx) => {
    await tx.clinicalNote.delete({
      where: { id: noteId },
    });
    return {
      targetId: noteId,
      oldValues: note,
      newValues: null,
      result: true,
    };
  });
};

const createNursingNote = async (req, admissionId, authorId, noteContent) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot add note to non-active admission", 400);
  }

  return auditedTransaction(req, { action: "CREATE", targetTable: "NursingNote" }, async (tx) => {
    const note = await tx.nursingNote.create({
      data: {
        admissionId,
        authorId,
        note: noteContent,
      },
    });
    return {
      targetId: note.id,
      newValues: note,
      result: note,
    };
  });
};

const getNursingNotes = async (admissionId) => {
  return await prisma.nursingNote.findMany({
    where: { admissionId },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
  });
};

const deleteNursingNote = async (req, noteId) => {
  const note = await prisma.nursingNote.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new APIError("Nursing note not found", 404);
  }

  return auditedTransaction(req, { action: "ARCHIVE", targetTable: "NursingNote" }, async (tx) => {
    await tx.nursingNote.delete({
      where: { id: noteId },
    });
    return {
      targetId: noteId,
      oldValues: note,
      newValues: null,
      result: true,
    };
  });
};

module.exports = {
  createClinicalNote,
  getClinicalNotes,
  deleteClinicalNote,
  createNursingNote,
  getNursingNotes,
  deleteNursingNote,
};
