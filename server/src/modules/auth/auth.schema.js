const Joi = require("joi");

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
    "string.empty": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
    "string.empty": "Password is required",
  }),
});

// currentPassword is optional — admins can skip it
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().optional().allow('').messages({
    "string.empty": "Current password cannot be empty (omit it if you are an admin)",
  }),
  newPassword: Joi.string().min(6).required().messages({
    "any.required": "New password is required",
    "string.empty": "New password is required",
    "string.min": "New password must be at least 6 characters long",
  }),
});

module.exports = {
  loginSchema,
  changePasswordSchema,
};
