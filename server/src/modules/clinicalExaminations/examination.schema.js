const Joi = require("joi");

const createExaminationSchema = Joi.object({
  general_exams: Joi.object().required().messages({
    "any.required": "general_exams is required",
    "object.base": "general_exams must be a JSON object"
  }),
  local_exams: Joi.object().required().messages({
    "any.required": "local_exams is required",
    "object.base": "local_exams must be a JSON object"
  })
});

module.exports = {
  createExaminationSchema
};
