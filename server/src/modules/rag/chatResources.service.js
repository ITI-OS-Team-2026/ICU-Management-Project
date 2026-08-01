const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const logger = require("../../utils/logger");
const { auditedTransaction } = require("../../middlewares/auditLog");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
  isConfigured: cloudinaryConfigured,
} = require("../../utils/cloudinaryClient");
const { queueIndexing } = require("./indexing.service");

/**
 * Resources attached to a Medical Knowledge Assistant chat.
 *
 * A resource is a `medical_documents` row with `chat_session_id` set and
 * `admission_id` null, so it inherits the existing extract → chunk → embed
 * pipeline (including PDF parsing and image OCR) for free. Retrieval only ever
 * surfaces a resource inside the chat it was uploaded to — see
 * retrieveKnowledgeContext in rag.service.js.
 *
 * Lifecycle: the DB row and its chunks are cascade-deleted with the chat, and
 * the Cloudinary original is destroyed here, so deleting a chat leaves nothing
 * behind in either store.
 */

const DOCUMENT_TYPE = "chat_resource";

const formatResource = (row) => ({
  id: row.id,
  chat_id: row.chatSessionId,
  // Null while the file is still staged in the composer; set to the message it
  // was sent with once the clinician asks a question.
  message_id: row.messageId || null,
  original_filename: row.originalFilename,
  mime_type: row.mimeType,
  file_size: row.fileSize,
  storage_type: row.storageType,
  // Drives thumbnail-vs-card rendering in the client.
  is_image: Boolean(row.mimeType && row.mimeType.startsWith("image/")),
  embedding_status: row.embeddingStatus,
  embedding_error: row.embeddingError,
  chunk_count: row.chunkCount,
  // Only a COMPLETED document has chunks the assistant can retrieve.
  is_searchable: row.embeddingStatus === "COMPLETED" && row.chunkCount > 0,
  created_at: row.createdAt,
});

/** The chat, or 404 — identical ownership rule to chat.service. */
const assertOwnedSession = async (userId, chatId) => {
  const session = await prisma.aiChatSession.findFirst({ where: { id: chatId, userId } });
  if (!session) throw new APIError("Chat not found", 404);
  return session;
};

const assertOwnedResource = async (userId, chatId, documentId) => {
  await assertOwnedSession(userId, chatId);

  const resource = await prisma.medicalDocument.findFirst({
    where: { id: documentId, chatSessionId: chatId, isArchived: false },
  });

  if (!resource) throw new APIError("Resource not found", 404);
  return resource;
};

/**
 * Best-effort removal of the stored original. A Cloudinary failure must not
 * block the clinician's delete — the DB row goes either way, so a failure here
 * leaves an orphaned file that is logged rather than a resource they cannot
 * get rid of.
 */
const destroyStoredFile = async (resource) => {
  if (resource.storageType !== "cloudinary" || !resource.cloudinaryPublicId) return true;

  try {
    const result = await deleteFromCloudinary(resource.cloudinaryPublicId, {
      url: resource.cloudinaryUrl,
    });

    // "not found" means it is already gone — nothing left behind either way.
    if (result?.result === "ok" || result?.result === "not found") return true;

    logger.warn(
      "Cloudinary delete returned '%s' for chat resource %s (%s)",
      result?.result,
      resource.id,
      resource.cloudinaryPublicId
    );
    return false;
  } catch (err) {
    logger.warn(
      "Cloudinary delete failed for chat resource %s (%s): %s",
      resource.id,
      resource.cloudinaryPublicId,
      err.message
    );
    return false;
  }
};

// ─── Public API ──────────────────────────────────────────────────────────────

const listResources = async (userId, chatId) => {
  await assertOwnedSession(userId, chatId);

  const rows = await prisma.medicalDocument.findMany({
    where: { chatSessionId: chatId, isArchived: false },
    orderBy: { createdAt: "asc" },
  });

  return rows.map(formatResource);
};

/**
 * Attach a file to a chat: store the original, register it, and queue indexing
 * out of band so a slow embedding provider never holds up the upload response.
 * The client polls `GET /rag/chats/:chatId/resources` for `embedding_status`.
 */
const addResource = async (userId, chatId, file, req) => {
  await assertOwnedSession(userId, chatId);

  if (!file) throw new APIError("A file is required.", 400);

  let storageFields;
  if (cloudinaryConfigured()) {
    // Namespaced by chat so a filename reused across chats cannot collide on
    // the public_id and overwrite the earlier upload.
    const result = await uploadToCloudinary(file.buffer, `chat-${chatId}-${file.originalname}`);
    storageFields = {
      storageType: "cloudinary",
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
    };
  } else {
    storageFields = { storageType: "blob", fileContent: file.buffer };
  }

  const resource = await auditedTransaction(
    req,
    { action: "CREATE", targetTable: "MedicalDocument" },
    async (tx) => {
      const created = await tx.medicalDocument.create({
        data: {
          chatSessionId: chatId,
          admissionId: null,
          uploadedBy: userId,
          documentType: DOCUMENT_TYPE,
          originalFilename: file.originalname,
          mimeType: file.mimetype || null,
          fileSize: Number.isFinite(file.size) ? file.size : null,
          embeddingStatus: "PENDING",
          ...storageFields,
        },
      });

      return { targetId: created.id, newValues: created, result: created };
    }
  );

  queueIndexing(resource.id);

  return formatResource(resource);
};

/**
 * The stored bytes for one resource, for thumbnails, the lightbox and PDF
 * viewing. Proxied through the API rather than handing out the Cloudinary URL:
 * ownership is re-checked on every read, and the cookie-authenticated fetch
 * avoids the cross-origin redirect problem the documents module hit.
 *
 * @returns {Promise<{ filename: string, contentType: string, buffer?: Buffer, url?: string }>}
 */
const getResourceFile = async (userId, chatId, documentId) => {
  const resource = await assertOwnedResource(userId, chatId, documentId);

  const contentType = resource.mimeType || "application/octet-stream";

  if (resource.storageType === "cloudinary" && resource.cloudinaryUrl) {
    return { filename: resource.originalFilename, contentType, url: resource.cloudinaryUrl };
  }

  if (resource.storageType === "blob" && resource.fileContent) {
    return { filename: resource.originalFilename, contentType, buffer: resource.fileContent };
  }

  throw new APIError("File is not available", 404);
};

/** Remove one resource: Cloudinary original first, then the row (chunks cascade). */
const removeResource = async (userId, chatId, documentId, req) => {
  const resource = await assertOwnedResource(userId, chatId, documentId);

  const fileRemoved = await destroyStoredFile(resource);

  return await auditedTransaction(
    req,
    { action: "ARCHIVE", targetTable: "MedicalDocument" },
    async (tx) => {
      // Hard delete, unlike patient documents: a chat resource is personal
      // working material with no clinical record to preserve.
      await tx.medicalDocument.delete({ where: { id: documentId } });

      return {
        targetId: documentId,
        oldValues: {
          id: documentId,
          chat_session_id: chatId,
          original_filename: resource.originalFilename,
          cloudinary_public_id: resource.cloudinaryPublicId,
          file_removed: fileRemoved,
        },
        result: {
          status: "success",
          message: `Removed "${resource.originalFilename}".`,
          deleted: 1,
          file_removed: fileRemoved,
        },
      };
    }
  );
};

/**
 * Destroy the stored originals for entire chats, ahead of the DB delete that
 * cascades their rows away. Called by chat.service before a chat (or all of a
 * clinician's chats) is deleted.
 *
 * @returns {Promise<{ resources: number, files_removed: number }>}
 */
const purgeResourcesForSessions = async (sessionIds) => {
  if (!sessionIds || sessionIds.length === 0) return { resources: 0, files_removed: 0 };

  const resources = await prisma.medicalDocument.findMany({
    where: { chatSessionId: { in: sessionIds } },
    select: { id: true, storageType: true, cloudinaryPublicId: true, cloudinaryUrl: true },
  });

  let filesRemoved = 0;
  for (const resource of resources) {
    // Sequential on purpose: Cloudinary rate-limits bursts, and a chat holds a
    // handful of files at most.
    // eslint-disable-next-line no-await-in-loop
    if (await destroyStoredFile(resource)) filesRemoved += 1;
  }

  return { resources: resources.length, files_removed: filesRemoved };
};

module.exports = {
  listResources,
  addResource,
  removeResource,
  getResourceFile,
  purgeResourcesForSessions,
  formatResource,
  DOCUMENT_TYPE,
};
