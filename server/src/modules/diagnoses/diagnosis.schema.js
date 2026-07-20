const Joi = require("joi");

const diagnosisCreateSchema = Joi.object({
  condition_name: Joi.string().required(),
  status: Joi.string().valid("ACTIVE", "RESOLVED", "CHRONIC").default("ACTIVE"),
});

const diagnosisUpdateSchema = Joi.object({
  condition_name: Joi.string().optional(),
  status: Joi.string().valid("ACTIVE", "RESOLVED", "CHRONIC").optional(),
});

module.exports = {
  diagnosisCreateSchema,
  diagnosisUpdateSchema,
};
