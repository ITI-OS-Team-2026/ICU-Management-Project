const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const adminController = require("./admin.controller");
const {
  userCreateSchema,
  userUpdateSchema,
  bedCreateSchema,
  bedUpdateSchema,
  auditLogQuerySchema,
  auditLogStatsQuerySchema,
  loginAttemptQuerySchema,
  loginAttemptStatsQuerySchema
} = require("./admin.schema");

const router = express.Router();

// Require admin role for most routes
// Users
router.post(
  "/users",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  validate({ body: userCreateSchema }),
  adminController.createUser
);

router.get(
  "/users/stats",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  adminController.getUserStats
);

router.get(
  "/users",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN", "ICU_SPECIALIST", "MEDICAL_RESIDENT", "ICU_NURSE"]),
  adminController.getUsers
);

router.get(
  "/users/:id",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  adminController.getUserById
);

router.patch(
  "/users/:id",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  validate({ body: userUpdateSchema }),
  adminController.updateUser
);

router.delete(
  "/users/:id",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  adminController.deleteUser
);

// Beds
router.post(
  "/beds",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  validate({ body: bedCreateSchema }),
  adminController.createBed
);

// Ward-wide counts for the bed grid, which is paged and can't total its own rows.
router.get(
  "/beds/stats",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN", "ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  adminController.getBedStats
);

router.get(
  "/beds",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN", "ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  adminController.getBeds
);

router.patch(
  "/beds/:id",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  validate({ body: bedUpdateSchema }),
  adminController.updateBed
);

// Audit Logs
router.get(
  "/audit-logs/stats",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  validate({ query: auditLogStatsQuerySchema }),
  adminController.getAuditLogStats
);

router.get(
  "/audit-logs",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  validate({ query: auditLogQuerySchema }),
  adminController.getAuditLogs
);

// Login Attempts
router.get(
  "/login-attempts/stats",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  validate({ query: loginAttemptStatsQuerySchema }),
  adminController.getLoginAttemptStats
);

router.get(
  "/login-attempts",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  validate({ query: loginAttemptQuerySchema }),
  adminController.getLoginAttempts
);

module.exports = router;
