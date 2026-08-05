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

// POST /rag/query — ask a question about one admission
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

// GET /rag/chats — the caller's chats, most recently active first
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

// GET /rag/chats/:chatId/resources — attached files and their indexing state
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

// GET /rag/admissions/:admissionId/index — knowledge-base status for the admission
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

// GET /rag/documents/:documentId/status — poll a single document's progress
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
