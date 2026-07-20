const Joi = require("joi");

const createDocumentSchema = Joi.object({
  document_type: Joi.string().trim().required().messages({
    "string.empty": "Document type cannot be empty",
    "any.required": "Document type is required",
  }),
});

module.exports = {
  createDocumentSchema,
};
