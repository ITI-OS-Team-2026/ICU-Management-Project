const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const { authLimiter } = require("../../middlewares/rateLimiter");
const authController = require("./auth.controller");
const { loginSchema } = require("./auth.schema");

const router = express.Router();

// POST /auth/login — public endpoint
router.post(
  "/login",
  authLimiter,
  validate({ body: loginSchema }),
  authController.login
);

// POST /auth/logout — requires authentication
router.post(
  "/logout",
  verifyToken,
  authController.logout
);

// GET /auth/me — requires authentication
router.get(
  "/me",
  verifyToken,
  authController.getMe
);

module.exports = router;
