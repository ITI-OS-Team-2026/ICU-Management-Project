const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const { authLimiter, passwordResetLimiter } = require("../../middlewares/rateLimiter");
const authController = require("./auth.controller");
const { loginSchema, changePasswordSchema } = require("./auth.schema");

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in
 *     description: Rate limited (5 attempts / 15 min). Sets the `smartcare_token` HttpOnly cookie on success.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: specialist@smartcare.icu }
 *               password: { type: string, format: password, example: SuperSecurePassword2026! }
 *     responses:
 *       200:
 *         description: Authenticated user profile
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked after too many failed attempts
 */
router.post(
  "/login",
  authLimiter,
  validate({ body: loginSchema }),
  authController.login
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out
 *     description: Clears the auth cookie and records the logout event.
 *     tags: [Auth]
 *     responses:
 *       204:
 *         description: Logged out
 */
router.post(
  "/logout",
  verifyToken,
  authController.logout
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the current session's user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Not authenticated
 */
router.get(
  "/me",
  verifyToken,
  authController.getMe
);

/**
 * @swagger
 * /auth/password:
 *   put:
 *     summary: Change the current user's password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password, minLength: 6 }
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Current password incorrect
 */
router.put(
  "/password",
  verifyToken,
  passwordResetLimiter,
  validate({ body: changePasswordSchema }),
  authController.changePassword
);

module.exports = router;
