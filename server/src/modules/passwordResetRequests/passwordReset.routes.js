const express = require("express");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const controller = require("./passwordReset.controller");

// ── User routes (any authenticated user) ───────────────────────────────────
const userRouter = express.Router();

userRouter.post("/", verifyToken, controller.createRequest);
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
