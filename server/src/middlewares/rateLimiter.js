const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const APIError = require("../utils/APIError");

// General API rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
  validate: { trustProxy: false, xForwardedForHeader: false },
  handler: (req, res, next) => {
    throw new APIError("Too many requests, please try again later.", 429);
  },
});

// Authentication rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Only 5 login/signup attempts per 15 minutes
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  validate: { trustProxy: false, xForwardedForHeader: false },
  handler: (req, res, next) => {
    throw new APIError("Too many login attempts, please try again later.", 429);
  },
});

// Password reset rate limiter (very strict) — authenticated route.
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3, // Only 3 password reset attempts per hour, per account
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  validate: { trustProxy: false, xForwardedForHeader: false },
  handler: (req, res, next) => {
    throw new APIError(
      "Too many password reset attempts, please try again in 1 hour.",
      429,
    );
  },
});

// Password reset rate limiter — public/unauthenticated route (login page).
const publicPasswordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    return `${ipKeyGenerator(clientIp)}:${email}`;
  },
  handler: (req, res, next) => {
    throw new APIError(
      "Too many password reset attempts, please try again in 1 hour.",
      429,
    );
  },
});

// File upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // 10 uploads per hour
  standardHeaders: "draft-8",
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  handler: (req, res, next) => {
    throw new APIError(
      "Too many upload attempts, please try again later.",
      429,
    );
  },
});

module.exports = {
  limiter,
  authLimiter,
  passwordResetLimiter,
  publicPasswordResetLimiter,
  uploadLimiter,
};
