const Joi = require("joi");
const { AUDIT_CATEGORIES } = require("./auditCategories");

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

// Must match AUDIT_RANGES in admin.service.js — an unlisted value there falls
// back to the default rather than erroring, but rejecting it here means a
// typo'd range surfaces as a 400 instead of silently returning the wrong window.
const AUDIT_RANGE_VALUES = ["24h", "today", "7d", "30d", "all"];

const auditLogQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow("").optional(),
  eventLevel: Joi.string().valid("All", "Info", "Warning", "Critical").optional(),
  // Derived, not repeated: adding a category in auditCategories.js must not
  // require remembering to widen this list too.
  category: Joi.string()
    .valid("All", ...AUDIT_CATEGORIES)
    .optional(),
  range: Joi.string().valid(...AUDIT_RANGE_VALUES).optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
});

/** The stats cards share the list's window, and take no other filter. */
const auditLogStatsQuerySchema = Joi.object({
  range: Joi.string().valid(...AUDIT_RANGE_VALUES).optional(),
});

module.exports = {
  userCreateSchema,
  userUpdateSchema,
  userResetPasswordSchema,
  bedCreateSchema,
  bedUpdateSchema,
  auditLogQuerySchema,
  auditLogStatsQuerySchema,
};
