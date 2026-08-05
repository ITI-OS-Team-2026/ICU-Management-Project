const Joi = require("joi");

const FREQUENCIES = [
  "OD",
  "BD",
  "TDS",
  "QDS",
  "Q4H",
  "Q6H",
  "Q8H",
  "Q12H",
  "PRN",
  "STAT",
  "CONTINUOUS",
  "OTHER",
];

const ROUTES = ["IV", "PO", "IM", "SC", "INH", "TOPICAL", "PR", "NG"];

// OTHER is the only frequency that carries free text, and it must carry it —
// otherwise the order says nothing about when to give the drug.
const frequencyTextRule = Joi.string().max(100).when("frequency", {
  is: "OTHER",
  then: Joi.required().messages({
    "any.required": "frequency_text is required when frequency is OTHER.",
  }),
  otherwise: Joi.optional().allow(null, ""),
});

const createMedicationSchema = Joi.object({
  drug_name: Joi.string().max(200).required(),
  dosage: Joi.string().max(100).required(),
  frequency: Joi.string()
    .valid(...FREQUENCIES)
    .required(),
  frequency_text: frequencyTextRule,
  route: Joi.string()
    .valid(...ROUTES)
    .required(),
  instructions: Joi.string().max(2000).optional().allow(null, ""),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().min(Joi.ref("start_date")).optional().messages({
    "date.min": "end_date cannot be before start_date.",
  }),
  // Set by the prescriber only after the UI has shown them the allergy conflict.
  acknowledge_allergy: Joi.boolean().optional().default(false),
});

const updateMedicationSchema = Joi.object({
  is_active: Joi.boolean().optional(),
  drug_name: Joi.string().max(200).optional(),
  dosage: Joi.string().max(100).optional(),
  frequency: Joi.string()
    .valid(...FREQUENCIES)
    .optional(),
  frequency_text: Joi.string().max(100).optional().allow(null, ""),
  route: Joi.string()
    .valid(...ROUTES)
    .optional(),
  instructions: Joi.string().max(2000).optional().allow(null, ""),
  start_date: Joi.date().iso().optional().allow(null),
  end_date: Joi.date().iso().optional().allow(null),
  acknowledge_allergy: Joi.boolean().optional().default(false),
}).min(1);

const discontinueMedicationSchema = Joi.object({
  discontinue_reason: Joi.string().max(1000).required().messages({
    "any.required": "A discontinue_reason is required so the ward knows why the drug was stopped.",
  }),
});

const createAdministrationSchema = Joi.object({
  status: Joi.string().valid("ADMINISTERED", "REFUSED", "HELD", "MISSED").required(),
  administered_dose: Joi.string().max(100).when("status", {
    is: "ADMINISTERED",
    then: Joi.required(),
    otherwise: Joi.optional().allow(null, ""),
  }),
  notes: Joi.string().when("status", {
    not: "ADMINISTERED",
    then: Joi.required().messages({
      "any.required": "Notes are required when status is not ADMINISTERED to explain the clinical decision.",
    }),
    otherwise: Joi.optional().allow(null, ""),
  }),
  scheduled_time: Joi.date().iso().required(),
  administered_at: Joi.date().iso().optional(),
});

const updateAdministrationSchema = Joi.object({
  status: Joi.string().valid("ADMINISTERED", "REFUSED", "HELD", "MISSED").optional(),
  administered_dose: Joi.string().max(100).optional().allow(null, ""),
  notes: Joi.string().optional().allow(null, ""),
  scheduled_time: Joi.date().iso().optional(),
  administered_at: Joi.date().iso().optional(),
  modification_reason: Joi.string().required().messages({
    "any.required": "A modification_reason is required to correct an administration log.",
  }),
}).min(2); // must have modification_reason + at least one field to change

module.exports = {
  FREQUENCIES,
  ROUTES,
  createMedicationSchema,
  updateMedicationSchema,
  discontinueMedicationSchema,
  createAdministrationSchema,
  updateAdministrationSchema,
};
