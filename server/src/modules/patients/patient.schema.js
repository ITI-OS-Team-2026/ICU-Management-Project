const Joi = require("joi");

const patientCreateSchema = Joi.object({
  mrn: Joi.string().required(),
  national_id: Joi.string().allow(null, "").optional(),
  name: Joi.string().required(),
  age: Joi.number().integer().min(0).required(),
  gender: Joi.string().allow(null, "").optional(),
  residence: Joi.string().allow(null, "").optional(),
  occupation: Joi.string().allow(null, "").optional(),
  marital_status: Joi.string().valid("SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER").allow(null, "").optional(),
  handedness: Joi.string().valid("RIGHT", "LEFT", "AMBIDEXTROUS", "UNKNOWN").allow(null, "").optional(),
  children_count: Joi.number().integer().min(0).allow(null).optional(),
  youngest_child_age: Joi.string().allow(null, "").optional(),
});

const patientQuerySchema = Joi.object({
  mrn: Joi.string().optional(),
  name: Joi.string().optional(),
  include_archived: Joi.string().valid("true", "false").optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).default(10).optional(),
});

const allergyCreateSchema = Joi.object({
  allergen: Joi.string().required(),
  severity: Joi.string().allow(null, "").optional(),
});

const medicalHistoryCreateSchema = Joi.object({
  diabetes_dm: Joi.boolean().optional(),
  hypertension_htn: Joi.boolean().optional(),
  past_similar_conditions: Joi.string().allow(null, "").optional(),
  past_diseases: Joi.alternatives().try(Joi.array(), Joi.object()).allow(null).optional(),
  previous_operations: Joi.boolean().optional(),
  operations_details: Joi.string().allow(null, "").optional(),
  has_allergies: Joi.boolean().optional(),
  traveled_abroad: Joi.boolean().optional(),
  consanguinity: Joi.boolean().optional(),
  family_similar_conditions: Joi.string().allow(null, "").optional(),
  inherited_diseases: Joi.alternatives().try(Joi.array(), Joi.object()).allow(null).optional(),
  free_text: Joi.string().allow(null, "").optional(),
  custom_fields: Joi.object().allow(null).optional(),
  special_habits: Joi.string().allow(null, "").optional(),
  blood_transfusion: Joi.boolean().optional(),
});

const medicalHistoryUpdateSchema = Joi.object({
  diabetes_dm: Joi.boolean().optional(),
  hypertension_htn: Joi.boolean().optional(),
  past_similar_conditions: Joi.string().allow(null, "").optional(),
  past_diseases: Joi.alternatives().try(Joi.array(), Joi.object()).allow(null).optional(),
  previous_operations: Joi.boolean().optional(),
  operations_details: Joi.string().allow(null, "").optional(),
  has_allergies: Joi.boolean().optional(),
  traveled_abroad: Joi.boolean().optional(),
  consanguinity: Joi.boolean().optional(),
  family_similar_conditions: Joi.string().allow(null, "").optional(),
  inherited_diseases: Joi.alternatives().try(Joi.array(), Joi.object()).allow(null).optional(),
  free_text: Joi.string().allow(null, "").optional(),
  custom_fields: Joi.object().allow(null).optional(),
  special_habits: Joi.string().allow(null, "").optional(),
  blood_transfusion: Joi.boolean().optional(),
}).min(1);

module.exports = {
  patientCreateSchema,
  patientQuerySchema,
  allergyCreateSchema,
  medicalHistoryCreateSchema,
  medicalHistoryUpdateSchema,
};
