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

// DELETE /ai/summaries/:summaryId — Resident, Specialist
aiRouter.delete(
  "/summaries/:summaryId",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ params: deleteSummaryParamsSchema }),
  aiController.deleteSummary
);

// PATCH /ai/summaries/:summaryId/restore — Resident, Specialist
aiRouter.patch(
  "/summaries/:summaryId/restore",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ params: deleteSummaryParamsSchema }),
  aiController.restoreSummary
);

// POST /ai/summary — Resident, Specialist
aiRouter.post(
  "/summary",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createSummarySchema }),
  aiController.createSummary
);

// POST /ai/query — Resident, Specialist
aiRouter.post(
  "/query",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createQuerySchema }),
  aiController.createQuery
);

// GET /admissions/:id/summaries — Nurse, Resident, Specialist
admissionAiRouter.get(
  "/:id/summaries",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  aiController.getSummaries
);

// GET /admissions/:id/ai-query-logs — Resident, Specialist
admissionAiRouter.get(
  "/:id/ai-query-logs",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ query: queryLogsQuerySchema }),
  aiController.getQueryLogs
);

// POST /ai/admissions/:admissionId/patient-summary — Resident, Specialist
// Generates an AI-powered clinical summary using Bedrock
aiRouter.post(
  "/admissions/:admissionId/patient-summary",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ params: patientSummaryParamsSchema }),
  aiController.generatePatientSummary
);

// GET /ai/admissions/:admissionId/patient-context — Resident, Specialist
// Returns the aggregated patient data context (no LLM call)
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
