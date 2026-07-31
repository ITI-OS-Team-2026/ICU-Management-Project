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
} = require("./rag.schema");

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
