const express = require("express");
const ragController = require("./rag.controller");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const {
  queryBodySchema,
  admissionParamsSchema,
  documentParamsSchema,
  historyQuerySchema,
  chunksQuerySchema,
  chatParamsSchema,
  chatListQuerySchema,
  chatBodySchema,
  chatTitleBodySchema,
  chatResourceParamsSchema,
} = require("./rag.schema");
const { uploadSingleFile } = require("../../middlewares/uploadSingleFile");

const ragRouter = express.Router();

// Asking questions and reading the conversation is a clinician decision-support
// action — Residents and Specialists only (FR-3.1). Nurses see indexing status
// so they know whether an upload of theirs made it into the knowledge base.
const CLINICIAN_ROLES = ["MEDICAL_RESIDENT", "ICU_SPECIALIST"];
const ALL_CLINICAL_ROLES = ["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"];

/**
 * @swagger
 * /rag/query:
 *   post:
 *     summary: Ask a question about one admission's indexed documents (doctors only)
 *     tags: [RAG]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [admissionId, question]
 *             properties:
 *               admissionId: { type: string, format: uuid }
 *               question: { type: string }
 *     responses:
 *       201:
 *         description: AI answer with cited source chunks
 * /rag/admissions/{admissionId}/history:
 *   get:
 *     summary: Get the conversation transcript for an admission
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: admissionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Transcript
 *   delete:
 *     summary: Clear the conversation for an admission
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: admissionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Cleared
 */
ragRouter.post(
  "/query",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ body: queryBodySchema }),
  ragController.createQuery
);

// GET /rag/admissions/:admissionId/history — conversation transcript
ragRouter.get(
  "/admissions/:admissionId/history",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ params: admissionParamsSchema, query: historyQuerySchema }),
  ragController.getHistory
);

// DELETE /rag/admissions/:admissionId/history — clear the conversation
ragRouter.delete(
  "/admissions/:admissionId/history",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ params: admissionParamsSchema }),
  ragController.clearHistory
);

// ─── Assistant chats ─────────────────────────────────────────────────────────
// Every route below is scoped to the authenticated clinician: the service only
// ever matches sessions owned by req.user.id, so one clinician cannot read,
// rename or delete another's chat even with a valid id.

/**
 * @swagger
 * /rag/chats:
 *   get:
 *     summary: List the caller's assistant chats, most recently active first
 *     tags: [RAG]
 *     responses:
 *       200:
 *         description: Chat list
 *   post:
 *     summary: Start a new empty assistant chat
 *     tags: [RAG]
 *     responses:
 *       201:
 *         description: Chat created
 *   delete:
 *     summary: Delete every chat the caller owns
 *     tags: [RAG]
 *     responses:
 *       204:
 *         description: Deleted
 * /rag/chats/{chatId}:
 *   get:
 *     summary: Get one chat with its full transcript
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Chat and messages
 *   patch:
 *     summary: Rename a chat
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *     responses:
 *       200:
 *         description: Renamed
 *   delete:
 *     summary: Delete one chat, its messages, and its resources
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
ragRouter.get(
  "/chats",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ query: chatListQuerySchema }),
  ragController.listChats
);

// POST /rag/chats — start an empty chat
ragRouter.post(
  "/chats",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ body: chatBodySchema }),
  ragController.createChat
);

// DELETE /rag/chats — delete every chat the caller owns
ragRouter.delete(
  "/chats",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  ragController.deleteAllChats
);

// GET /rag/chats/:chatId — one chat with its full transcript
ragRouter.get(
  "/chats/:chatId",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ params: chatParamsSchema }),
  ragController.getChat
);

// PATCH /rag/chats/:chatId — rename a chat
ragRouter.patch(
  "/chats/:chatId",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ params: chatParamsSchema, body: chatTitleBodySchema }),
  ragController.renameChat
);

// DELETE /rag/chats/:chatId — delete one chat, its messages and its resources
ragRouter.delete(
  "/chats/:chatId",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ params: chatParamsSchema }),
  ragController.deleteChat
);

// ─── Chat resources ──────────────────────────────────────────────────────────
// Reference files attached to a chat. Only retrievable inside that chat, and
// removed from Cloudinary as well as the database when either the resource or
// the whole chat is deleted.

/**
 * @swagger
 * /rag/chats/{chatId}/resources:
 *   get:
 *     summary: List files attached to a chat and their indexing state
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Attached files
 *   post:
 *     summary: Attach a file to a chat
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: File attached and queued for indexing
 * /rag/chats/{chatId}/resources/{documentId}/file:
 *   get:
 *     summary: Get an attached file's bytes (for inline preview/download)
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: File stream
 * /rag/chats/{chatId}/resources/{documentId}:
 *   delete:
 *     summary: Detach and destroy an attached file
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Removed
 */
ragRouter.get(
  "/chats/:chatId/resources",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ params: chatParamsSchema }),
  ragController.listChatResources
);

// POST /rag/chats/:chatId/resources — attach a file (multipart field "file")
ragRouter.post(
  "/chats/:chatId/resources",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  // Multer runs before validation so req.params is still parsed for the service.
  uploadSingleFile("file"),
  validate({ params: chatParamsSchema }),
  ragController.addChatResource
);

// GET /rag/chats/:chatId/resources/:documentId/file — the bytes, served inline
// for thumbnails, the lightbox and PDF viewing
ragRouter.get(
  "/chats/:chatId/resources/:documentId/file",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ params: chatResourceParamsSchema }),
  ragController.getChatResourceFile
);

// DELETE /rag/chats/:chatId/resources/:documentId — detach and destroy one file
ragRouter.delete(
  "/chats/:chatId/resources/:documentId",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ params: chatResourceParamsSchema }),
  ragController.removeChatResource
);

/**
 * @swagger
 * /rag/admissions/{admissionId}/index:
 *   get:
 *     summary: Get knowledge-base indexing status for an admission
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: admissionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Index status per document
 * /rag/admissions/{admissionId}/reindex:
 *   post:
 *     summary: Re-queue pending/failed documents for an admission
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: admissionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Re-queued
 */
ragRouter.get(
  "/admissions/:admissionId/index",
  verifyToken,
  restrictTo(ALL_CLINICAL_ROLES),
  validate({ params: admissionParamsSchema }),
  ragController.getAdmissionIndexStatus
);

// POST /rag/admissions/:admissionId/reindex — re-queue pending/failed documents
ragRouter.post(
  "/admissions/:admissionId/reindex",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ params: admissionParamsSchema }),
  ragController.reindexAdmission
);

/**
 * @swagger
 * /rag/documents/{documentId}/status:
 *   get:
 *     summary: Poll a single document's indexing progress
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Status
 * /rag/documents/{documentId}/reindex:
 *   post:
 *     summary: Force a fresh extract-and-embed cycle for a document (doctors only)
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Re-queued
 * /rag/documents/{documentId}/chunks:
 *   get:
 *     summary: Inspect the indexed text chunks the AI can see for a document (doctors only)
 *     tags: [RAG]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Chunk list
 */
ragRouter.get(
  "/documents/:documentId/status",
  verifyToken,
  restrictTo(ALL_CLINICAL_ROLES),
  validate({ params: documentParamsSchema }),
  ragController.getDocumentStatus
);

// POST /rag/documents/:documentId/reindex — force a fresh extract → embed cycle
ragRouter.post(
  "/documents/:documentId/reindex",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ params: documentParamsSchema }),
  ragController.reindexDocument
);

// GET /rag/documents/:documentId/chunks — inspect exactly what the AI can see
ragRouter.get(
  "/documents/:documentId/chunks",
  verifyToken,
  restrictTo(CLINICIAN_ROLES),
  validate({ params: documentParamsSchema, query: chunksQuerySchema }),
  ragController.getDocumentChunks
);

module.exports = { ragRouter };
