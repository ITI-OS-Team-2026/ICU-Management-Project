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
  bed_number: Joi.string().trim().min(1).max(20).required().messages({
    "string.max": "bed_number must be at most 20 characters",
  }),
});

const bedUpdateSchema = Joi.object({
  status: Joi.string().valid("AVAILABLE", "OCCUPIED", "MAINTENANCE").required(),
});

const userResetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
  }),
});

const auditLogQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow("").optional(),
  eventLevel: Joi.string().valid("All", "Info", "Warning", "Critical").optional(),
  category: Joi.string()
    .valid("All", "Patients", "Admissions", "Documents", "Admin")
    .optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
});

module.exports = {
  userCreateSchema,
  userUpdateSchema,
  userResetPasswordSchema,
  bedCreateSchema,
  bedUpdateSchema,
  auditLogQuerySchema,
};
