const Joi = require("joi");

const createSummarySchema = Joi.object({
  admission_id: Joi.string().uuid().required(),
  summary_type: Joi.string().valid("24_HOUR", "ON_DEMAND").required(),
});

const createQuerySchema = Joi.object({
  admission_id: Joi.string().uuid().required(),
  question: Joi.string().trim().min(1).max(2000).required(),
  include_history: Joi.boolean().default(false),
});

const queryLogsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const patientSummaryParamsSchema = Joi.object({
  admissionId: Joi.string().uuid().required(),
});

const deleteSummaryParamsSchema = Joi.object({
  summaryId: Joi.string().uuid().required(),
});

module.exports = {
  createSummarySchema,
  createQuerySchema,
  queryLogsQuerySchema,
  patientSummaryParamsSchema,
  deleteSummaryParamsSchema,
};
