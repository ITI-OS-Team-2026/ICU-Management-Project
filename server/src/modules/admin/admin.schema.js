const Joi = require("joi");

const userCreateSchema = Joi.object({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid("nurse", "resident", "specialist", "admin").required(),
});

const userUpdateSchema = Joi.object({
  role: Joi.string().valid("nurse", "resident", "specialist", "admin").optional(),
  status: Joi.string().valid("ACTIVE", "INACTIVE", "LOCKED", "SUSPENDED").optional(),
}).min(1);

const bedCreateSchema = Joi.object({
  bed_number: Joi.string().required(),
});

const bedUpdateSchema = Joi.object({
  status: Joi.string().valid("AVAILABLE", "OCCUPIED", "MAINTENANCE").required(),
});

module.exports = {
  userCreateSchema,
  userUpdateSchema,
  bedCreateSchema,
  bedUpdateSchema,
};
