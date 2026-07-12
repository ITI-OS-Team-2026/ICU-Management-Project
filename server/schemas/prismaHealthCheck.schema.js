const Joi = require("joi");

const createHealthCheckSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required(),
});

const updateHealthCheckSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100),
}).min(1);

const healthCheckIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

module.exports = {
  createHealthCheckSchema,
  updateHealthCheckSchema,
  healthCheckIdParamSchema,
};
