const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const APIError = require("../utils/APIError");

// General API rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
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
  handler: (req, res, next) => {
    throw new APIError("Too many login attempts, please try again later.", 429);
  },
});

// Password reset rate limiter (very strict) — authenticated route.
// Keyed by the requesting account, not IP: this is a shared hospital app,
// and IP-keying meant one nurse's attempts consumed the *entire ward's*
// shared workstation/NAT budget, locking every other clinician on that
// terminal out of requesting their own reset for the next hour. Per-account
// keying is also strictly more correct here — we know exactly who's asking.
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3, // Only 3 password reset attempts per hour, per account
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  handler: (req, res, next) => {
    throw new APIError(
      "Too many password reset attempts, please try again in 1 hour.",
      429,
    );
  },
});

// Password reset rate limiter — public/unauthenticated route (login page).
// There's no account to key by yet, so this combines IP with the *target*
// email instead of IP alone, for the same reason as above: a shared clinic
// terminal has one IP but many clinicians, each requesting a reset for their
// own distinct email. Keying by IP+email means they no longer share a
// budget, while a single email still can't be hammered from that IP, and a
// single IP still can't rapid-fire many different targets unbounded (each
// new email it tries only gets 3 attempts before it, too, is throttled).
const publicPasswordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    return `${ipKeyGenerator(req.ip)}:${email}`;
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
