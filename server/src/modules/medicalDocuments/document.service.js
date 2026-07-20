const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");
const crypto = require("crypto");

const createDocument = async (admissionId, uploadedBy, file, documentType, req) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.status !== "ACTIVE") {
    throw new APIError("Cannot add document to non-active admission", 409);
  }

  const document = await auditedTransaction(req, { action: "CREATE", targetTable: "MedicalDocument" }, async (tx) => {
    const doc = await tx.medicalDocument.create({
      data: {
        admissionId,
        uploadedBy,
        documentType,
        originalFilename: file.originalname,
        filePath: file.path,
        embeddingStatus: "PENDING",
      },
    });

    return {
      targetId: doc.id,
      newValues: doc,
      result: doc,
    };
  });

  setTimeout(async () => {
    try {
      const dummyId = crypto.randomUUID();
      const dummyVector = "[" + Array(768).fill(0.0).join(",") + "]";
      
      await prisma.$executeRawUnsafe(
        `INSERT INTO document_embeddings (id, document_id, admission_id, chunk_text, embedding) VALUES ($1, $2, $3, $4, $5::vector)`,
        dummyId,
        document.id,
        admissionId,
        `Chunk text from original document ${file.originalname}`,
        dummyVector
      );

      await prisma.medicalDocument.update({
        where: { id: document.id },
        data: { embeddingStatus: "COMPLETED" },
      });
    } catch (err) {
      console.error("Async embedding job simulation failed:", err);
      try {
        await prisma.medicalDocument.update({
          where: { id: document.id },
          data: { embeddingStatus: "FAILED" },
        });
      } catch (e) {}
    }
  }, 100);

  return document;
};

const getDocuments = async (admissionId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw new APIError("Admission not found", 404);
  }

  return await prisma.medicalDocument.findMany({
    where: {
      admissionId,
      isArchived: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      uploader: {
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

const getDocumentById = async (id) => {
  const doc = await prisma.medicalDocument.findUnique({
    where: { id },
  });

  if (!doc || doc.isArchived) {
    throw new APIError("Document not found", 404);
  }

  return doc;
};

const deleteDocument = async (id, req) => {
  const doc = await prisma.medicalDocument.findUnique({
    where: { id },
  });

  if (!doc || doc.isArchived) {
    throw new APIError("Document not found", 404);
  }

  await auditedTransaction(req, { action: "ARCHIVE", targetTable: "MedicalDocument" }, async (tx) => {
    const archived = await tx.medicalDocument.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return {
      targetId: archived.id,
      oldValues: doc,
      newValues: archived,
      result: archived,
    };
  });
};

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
};
