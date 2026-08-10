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

/**
 * Password complexity rules (applied to every user-chosen password):
 *   • At least 8 characters
 *   • At least one uppercase letter  (A–Z)
 *   • At least one lowercase letter  (a–z)
 *   • At least one digit             (0–9)
 *   • At least one special character (!@#$%^&*…)
 *
 * currentPassword is optional — admins can skip it (they have no "old" credential
 * to verify against when they reset another user's password via the inbox).
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]).{8,}$/;

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().optional().allow("").messages({
    "string.empty": "Current password cannot be empty (omit it if you are an admin)",
  }),
  newPassword: Joi.string()
    .min(8)
    .pattern(PASSWORD_REGEX)
    .required()
    .messages({
      "any.required": "New password is required",
      "string.empty": "New password is required",
      "string.min": "Password must be at least 8 characters long",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }),
});

module.exports = {
  loginSchema,
  changePasswordSchema,
};
