const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");
const { queueIndexing } = require("../rag/indexing.service");
const { uploadToCloudinary, isConfigured: cloudinaryConfigured } = require("../../utils/cloudinaryClient");

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

  // Upload to Cloudinary when configured; otherwise fall back to DB blob storage.
  let storageFields;
  if (cloudinaryConfigured()) {
    const result = await uploadToCloudinary(file.buffer, file.originalname);
    storageFields = {
      storageType: "cloudinary",
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
    };
  } else {
    storageFields = {
      storageType: "blob",
      fileContent: file.buffer,
    };
  }

  const document = await auditedTransaction(req, { action: "CREATE", targetTable: "MedicalDocument" }, async (tx) => {
    const doc = await tx.medicalDocument.create({
      data: {
        admissionId,
        uploadedBy,
        documentType,
        originalFilename: file.originalname,
        mimeType: file.mimetype || null,
        fileSize: Number.isFinite(file.size) ? file.size : null,
        embeddingStatus: "PENDING",
        ...storageFields,
      },
    });

    return {
      targetId: doc.id,
      newValues: doc,
      result: doc,
    };
  });

  // RAG indexing runs out of band so a slow embedding provider never delays the
  // upload response. Progress is polled through GET /rag/documents/:id/status.
  queueIndexing(document.id);

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
    // Chunks are kept so an archived document can be restored without
    // re-embedding; retrieval joins medical_documents and filters on
    // is_archived, so archived content can never reach an AI answer.
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
