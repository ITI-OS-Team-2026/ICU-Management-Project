const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");

const createClinicalNote = async (admissionId, authorId, content) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot add note to non-active admission", 400);
  }

  return await prisma.clinicalNote.create({
    data: {
      admissionId,
      authorId,
      content,
    },
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

const deleteClinicalNote = async (noteId) => {
  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new APIError("Clinical note not found", 404);
  }

  await prisma.clinicalNote.delete({
    where: { id: noteId },
  });
};

const createNursingNote = async (admissionId, authorId, noteContent) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot add note to non-active admission", 400);
  }

  return await prisma.nursingNote.create({
    data: {
      admissionId,
      authorId,
      note: noteContent,
    },
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

const deleteNursingNote = async (noteId) => {
  const note = await prisma.nursingNote.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new APIError("Nursing note not found", 404);
  }

  await prisma.nursingNote.delete({
    where: { id: noteId },
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
