const express = require("express");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const controller = require("./passwordReset.controller");

const { passwordResetLimiter, publicPasswordResetLimiter } = require("../../middlewares/rateLimiter");

// ── User routes (any authenticated user) ───────────────────────────────────
const userRouter = express.Router();

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
