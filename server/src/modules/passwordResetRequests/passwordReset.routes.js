const express = require("express");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const controller = require("./passwordReset.controller");

const { passwordResetLimiter, publicPasswordResetLimiter } = require("../../middlewares/rateLimiter");

// ── User routes (any authenticated user) ───────────────────────────────────
const userRouter = express.Router();

/**
 * @swagger
 * /password-reset-requests:
 *   post:
 *     summary: Ask an admin to reset your password (authenticated)
 *     tags: [Password Reset Requests]
 *     responses:
 *       201:
 *         description: Request created
 * /password-reset-requests/public:
 *   post:
 *     summary: Ask for a password reset without being signed in
 *     description: >
 *       For someone locked out who can't reach the authenticated route above.
 *       Rate limited by IP+target-email rather than IP alone, since shared
 *       hospital terminals would otherwise let one clinician's attempts lock
 *       out everyone else on that terminal. The response never reveals
 *       whether the email actually matched an account.
 *     tags: [Password Reset Requests]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       201:
 *         description: Request submitted (regardless of whether the email matched an account)
 * /password-reset-requests/my:
 *   get:
 *     summary: List the caller's own reset requests
 *     tags: [Password Reset Requests]
 *     responses:
 *       200:
 *         description: Request list
 * /password-reset-requests/mark-seen:
 *   post:
 *     summary: Mark the caller's resolved requests as seen
 *     tags: [Password Reset Requests]
 *     responses:
 *       200:
 *         description: Marked
 * /password-reset-requests/unseen-count:
 *   get:
 *     summary: Count the caller's unseen admin replies
 *     tags: [Password Reset Requests]
 *     responses:
 *       200:
 *         description: Count
 */
// verifyToken must run first — passwordResetLimiter keys by req.user.id.
userRouter.post("/", verifyToken, passwordResetLimiter, controller.createRequest);

// No verifyToken — this is specifically for someone who cannot sign in and so
// cannot reach the authenticated route above. publicPasswordResetLimiter keys
// by IP+target-email (not IP alone) — see its definition in rateLimiter.js
// for why: this app is used from shared hospital terminals, where IP-alone
// keying let one clinician's attempts lock out everyone else on that
// terminal. See passwordReset.service.js's createPublicRequest for why the
// response never reveals whether the email actually matched an account.
userRouter.post("/public", publicPasswordResetLimiter, controller.createPublicRequest);
userRouter.get("/my", verifyToken, controller.getMyRequests);
userRouter.post("/mark-seen", verifyToken, controller.markRequestsSeen);
userRouter.get("/unseen-count", verifyToken, controller.countUnseenReplies);

// ── Admin routes ────────────────────────────────────────────────────────────
const adminRouter = express.Router();

/**
 * @swagger
 * /admin/password-reset-requests:
 *   get:
 *     summary: List all password reset requests (SYSTEM_ADMIN)
 *     tags: [Password Reset Requests]
 *     responses:
 *       200:
 *         description: Request list
 * /admin/password-reset-requests/pending-count:
 *   get:
 *     summary: Count pending password reset requests (SYSTEM_ADMIN)
 *     tags: [Password Reset Requests]
 *     responses:
 *       200:
 *         description: Count
 * /admin/password-reset-requests/{id}/resolve:
 *   post:
 *     summary: Resolve a password reset request (SYSTEM_ADMIN)
 *     tags: [Password Reset Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Resolved request
 */
adminRouter.get(
  "/",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  controller.getAllRequests
);
adminRouter.get(
  "/pending-count",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  controller.countPendingRequests
);
adminRouter.post(
  "/:id/resolve",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  controller.resolveRequest
);

module.exports = { userRouter, adminRouter };
