const Joi = require("joi");

const STATUSES = ["SUSPECTED", "CONFIRMED", "RULED_OUT", "RESOLVED"];
const TYPES = ["PRIMARY", "SECONDARY", "COMORBIDITY", "COMPLICATION"];
const CONCERN_OUTCOMES = ["ADDRESSED", "DISMISSED"];

// Loose ICD-10 shape (A00, J44.1, S72.001A) — enough to catch a typo without
// pretending to validate against the real code set.
const icdCodeRule = Joi.string()
  .pattern(/^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/)
  .max(20)
  .messages({
    "string.pattern.base": "ICD-10 codes look like J44.1 or A41 — letter, two digits, optional suffix.",
  });

const diagnosisCreateSchema = Joi.object({
  condition_name: Joi.string().max(255).required(),
  icd_code: icdCodeRule.optional().allow(null, ""),
  type: Joi.string()
    .valid(...TYPES)
    .default("SECONDARY"),
  // A new diagnosis enters the differential as suspected unless the clinician
  // already has the evidence in hand.
  status: Joi.string().valid("SUSPECTED", "CONFIRMED").default("SUSPECTED"),
  clinical_notes: Joi.string().max(4000).optional().allow(null, ""),
  onset_date: Joi.date().iso().max("now").optional().messages({
    "date.max": "Onset cannot be in the future.",
  }),
});

const diagnosisUpdateSchema = Joi.object({
  condition_name: Joi.string().max(255).optional(),
  icd_code: icdCodeRule.optional().allow(null, ""),
  type: Joi.string()
    .valid(...TYPES)
    .optional(),
  clinical_notes: Joi.string().max(4000).optional().allow(null, ""),
  onset_date: Joi.date().iso().max("now").optional().allow(null),
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
  resolved_at: Joi.date().iso().max("now").when("status", {
    is: "RESOLVED",
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
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
