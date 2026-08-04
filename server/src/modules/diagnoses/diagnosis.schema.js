const Joi = require("joi");

const STATUSES = ["SUSPECTED", "CONFIRMED", "RULED_OUT", "RESOLVED"];
const TYPES = ["PRIMARY", "SECONDARY", "COMORBIDITY", "COMPLICATION"];
const CONCERN_OUTCOMES = ["ADDRESSED", "DISMISSED"];

const diagnosisCreateSchema = Joi.object({
  condition_name: Joi.string().max(255).required(),
  type: Joi.string()
    .valid(...TYPES)
    .default("SECONDARY"),
  // A new diagnosis enters the differential as suspected unless the clinician
  // already has the evidence in hand.
  status: Joi.string().valid("SUSPECTED", "CONFIRMED").default("SUSPECTED"),
  clinical_notes: Joi.string().max(4000).optional().allow(null, ""),
});

const diagnosisUpdateSchema = Joi.object({
  condition_name: Joi.string().max(255).optional(),
  type: Joi.string()
    .valid(...TYPES)
    .optional(),
  clinical_notes: Joi.string().max(4000).optional().allow(null, ""),
  // Present only so the service can reject it with a helpful message rather
  // than Joi rejecting it as an unknown key.
  status: Joi.string()
    .valid(...STATUSES)
    .optional(),
}).min(1);

const diagnosisStatusSchema = Joi.object({
  status: Joi.string()
    .valid("CONFIRMED", "RULED_OUT", "RESOLVED")
    .required(),
  reason: Joi.string().max(2000).required().messages({
    "any.required":
      "A clinical reason is required — it is the record of why the differential moved.",
  }),
});

const concernCreateSchema = Joi.object({
  note: Joi.string().max(2000).required().messages({
    "any.required": "Describe what you are seeing that does not fit this diagnosis.",
  }),
});

const concernRespondSchema = Joi.object({
  status: Joi.string()
    .valid(...CONCERN_OUTCOMES)
    .required(),
  response_note: Joi.string().max(2000).required().messages({
    "any.required": "The nurse who raised this needs an answer, not just a status.",
  }),
});

const diagnosisQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...STATUSES)
    .optional(),
});

module.exports = {
  STATUSES,
  TYPES,
  diagnosisCreateSchema,
  diagnosisUpdateSchema,
  diagnosisStatusSchema,
  concernCreateSchema,
  concernRespondSchema,
  diagnosisQuerySchema,
};
