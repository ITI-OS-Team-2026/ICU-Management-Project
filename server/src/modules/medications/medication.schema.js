const Joi = require("joi");

const createMedicationSchema = Joi.object({
  drug_name: Joi.string().max(200).required(),
  dosage: Joi.string().max(100).required(),
  frequency: Joi.string().max(100).required(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
});

const updateMedicationSchema = Joi.object({
  is_active: Joi.boolean().optional(),
  drug_name: Joi.string().max(200).optional(),
  dosage: Joi.string().max(100).optional(),
  frequency: Joi.string().max(100).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
}).min(1);

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
  createMedicationSchema,
  updateMedicationSchema,
  createAdministrationSchema,
  updateAdministrationSchema,
};
