const express = require("express");
const aiController = require("./ai.controller");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const {
  createSummarySchema,
  createQuerySchema,
  queryLogsQuerySchema,
} = require("./ai.schema");

const aiRouter = express.Router();
const admissionAiRouter = express.Router();

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

module.exports = {
  aiRouter,
  admissionAiRouter,
};
