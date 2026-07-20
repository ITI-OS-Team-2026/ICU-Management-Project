const Joi = require("joi");

const createLabResultSchema = Joi.object({
  test_name: Joi.string().trim().max(255).required(),
  result_value: Joi.string().trim().required(),
  abnormal: Joi.boolean().default(false),
});

module.exports = {
  createLabResultSchema,
};
