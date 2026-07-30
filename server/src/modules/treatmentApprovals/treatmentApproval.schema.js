const Joi = require("joi");

const createTreatmentApprovalSchema = Joi.object({
  treatment_name: Joi.string().trim().min(2).max(255).required(),
  clinical_justification: Joi.string().trim().max(5000).allow("").allow(null),
});

const decideTreatmentApprovalSchema = Joi.object({
  approval_status: Joi.boolean().required(),
});

// Execution only ever moves forward, so IN_PROGRESS / COMPLETED are the only
// targets a nurse can post.
const executeTreatmentApprovalSchema = Joi.object({
  execution_status: Joi.string().valid("IN_PROGRESS", "COMPLETED").required(),
  execution_notes: Joi.string().trim().max(5000).allow("").allow(null),
});

module.exports = {
  createTreatmentApprovalSchema,
  decideTreatmentApprovalSchema,
  executeTreatmentApprovalSchema,
};
