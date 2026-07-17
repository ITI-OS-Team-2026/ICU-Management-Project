const Joi = require("joi");

const admissionCreateSchema = Joi.object({
  patient_id: Joi.string().uuid().required(),
  bed_id: Joi.string().uuid().required(),
  doctor_id: Joi.string().uuid().required(),
  admission_reason: Joi.string().allow(null, "").optional(),
  place_of_transfer: Joi.string().allow(null, "").optional(),
  transfer_doctor_name: Joi.string().allow(null, "").optional(),
  chief_complaint: Joi.string().allow(null, "").optional(),
  symptoms_related_system: Joi.string().allow(null, "").optional(),
  symptoms_other_systems: Joi.string().allow(null, "").optional(),
  previous_investigations: Joi.string().allow(null, "").optional(),
  previous_treatments: Joi.string().allow(null, "").optional(),
  provisional_diagnosis: Joi.string().allow(null, "").optional(),
});

const admissionQuerySchema = Joi.object({
  status: Joi.string().valid("ACTIVE", "DISCHARGED", "ARCHIVED").optional(),
  bed_id: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).default(10).optional(),
});

const nurseAssignSchema = Joi.object({
  nurse_id: Joi.string().uuid().required(),
});

module.exports = {
  admissionCreateSchema,
  admissionQuerySchema,
  nurseAssignSchema,
};
