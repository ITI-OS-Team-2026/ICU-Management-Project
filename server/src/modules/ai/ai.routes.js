const express = require("express");
const aiController = require("./ai.controller");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const {
  createSummarySchema,
  createQuerySchema,
  queryLogsQuerySchema,
  patientSummaryParamsSchema,
  deleteSummaryParamsSchema,
} = require("./ai.schema");

const aiRouter = express.Router();
const admissionAiRouter = express.Router();

/**
 * @swagger
 * /ai/summaries/{summaryId}:
 *   delete:
 *     summary: Soft-delete an AI-generated summary (doctors only)
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: summaryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 * /ai/summaries/{summaryId}/restore:
 *   patch:
 *     summary: Restore a soft-deleted summary (doctors only)
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: summaryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Restored summary
 */
aiRouter.delete(
  "/summaries/:summaryId",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ params: deleteSummaryParamsSchema }),
  aiController.deleteSummary
);

aiRouter.patch(
  "/summaries/:summaryId/restore",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ params: deleteSummaryParamsSchema }),
  aiController.restoreSummary
);

/**
 * @swagger
 * /ai/summary:
 *   post:
 *     summary: Generate an AI clinical summary for an admission (doctors only)
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [admissionId]
 *             properties:
 *               admissionId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Summary generated
 * /ai/query:
 *   post:
 *     summary: Ask a free-form AI question about an admission (doctors only)
 *     tags: [AI]
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
 *         description: AI answer, logged
 */
aiRouter.post(
  "/summary",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createSummarySchema }),
  aiController.createSummary
);

aiRouter.post(
  "/query",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createQuerySchema }),
  aiController.createQuery
);

/**
 * @swagger
 * /admissions/{id}/summaries:
 *   get:
 *     summary: List AI-generated summaries for an admission
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Summary list
 * /admissions/{id}/ai-query-logs:
 *   get:
 *     summary: List AI query history for an admission (doctors only)
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Query log
 */
admissionAiRouter.get(
  "/:id/summaries",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  aiController.getSummaries
);

admissionAiRouter.get(
  "/:id/ai-query-logs",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ query: queryLogsQuerySchema }),
  aiController.getQueryLogs
);

/**
 * @swagger
 * /ai/admissions/{admissionId}/patient-summary:
 *   post:
 *     summary: Generate an AI-powered clinical summary via Bedrock (doctors only)
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: admissionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Generated summary
 * /ai/admissions/{admissionId}/patient-context:
 *   get:
 *     summary: Get the aggregated patient data context used for AI prompts (no LLM call)
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: admissionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Aggregated context
 */
aiRouter.post(
  "/admissions/:admissionId/patient-summary",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ params: patientSummaryParamsSchema }),
  aiController.generatePatientSummary
);

aiRouter.get(
  "/admissions/:admissionId/patient-context",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ params: patientSummaryParamsSchema }),
  aiController.getPatientContext
);

module.exports = {
  aiRouter,
  admissionAiRouter,
};
