const Joi = require("joi");

const createClinicalNoteSchema = Joi.object({
  content: Joi.string().trim().required().messages({
    "string.empty": "Clinical note content cannot be empty",
    "any.required": "Clinical note content is required",
  }),
});

const createNursingNoteSchema = Joi.object({
  note: Joi.string().trim().required().messages({
    "string.empty": "Nursing note cannot be empty",
    "any.required": "Nursing note is required",
  }),
});

module.exports = {
  createClinicalNoteSchema,
  createNursingNoteSchema,
};
