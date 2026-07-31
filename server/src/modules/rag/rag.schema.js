const Joi = require("joi");

const queryBodySchema = Joi.object({
  admission_id: Joi.string().uuid().optional().allow(null),
  question: Joi.string().trim().min(3).max(2000).required().messages({
    "string.min": "Please ask a question of at least 3 characters.",
  }),
  include_history: Joi.boolean().default(false),
  top_k: Joi.number().integer().min(1).max(25).default(6),
  mode: Joi.string().valid("patient", "knowledge").default("patient").messages({
    "any.only": "Mode must be 'patient' (requires admission_id) or 'knowledge' (general medical questions)",
  }),
})
  .custom((value, helpers) => {
    // Patient mode requires admission_id; knowledge mode must NOT have admission_id
    if (value.mode === "patient" && !value.admission_id) {
      return helpers.error("object.missing", { label: "admission_id" });
    }
    if (value.mode === "knowledge" && value.admission_id) {
      return helpers.error("any.invalid");
    }
    return value;
  });

const admissionParamsSchema = Joi.object({
  admissionId: Joi.string().uuid().required(),
});

const documentParamsSchema = Joi.object({
  documentId: Joi.string().uuid().required(),
});

const historyQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(30),
});

const chunksQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
});

module.exports = {
  queryBodySchema,
  admissionParamsSchema,
  documentParamsSchema,
  historyQuerySchema,
  chunksQuerySchema,
};
