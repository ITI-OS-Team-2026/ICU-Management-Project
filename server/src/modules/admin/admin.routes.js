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

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Create a user
 *     tags: [Admin - Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, email, role]
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               email: { type: string, format: email }
 *               role: { type: string, enum: [nurse, resident, specialist, admin] }
 *     responses:
 *       201:
 *         description: User created
 *   get:
 *     summary: List users
 *     description: Every clinical role can read this (used for staff pickers); only SYSTEM_ADMIN can write.
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, INACTIVE, LOCKED, SUSPENDED] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated user list
 */
router.post(
  "/users",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  validate({ body: userCreateSchema }),
  adminController.createUser
);

/**
 * @swagger
 * /admin/users/stats:
 *   get:
 *     summary: User counts by status
 *     tags: [Admin - Users]
 *     responses:
 *       200:
 *         description: Counts
 */
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

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User
 *       404:
 *         description: Not found
 *   patch:
 *     summary: Update a user's role or status
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: { type: string, enum: [nurse, resident, specialist, admin] }
 *               status: { type: string, enum: [ACTIVE, INACTIVE, LOCKED, SUSPENDED] }
 *     responses:
 *       200:
 *         description: Updated user
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
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

/**
 * @swagger
 * /admin/beds:
 *   post:
 *     summary: Create a bed
 *     tags: [Admin - Beds]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bed_number]
 *             properties:
 *               bed_number: { type: string, example: ICU-01 }
 *     responses:
 *       201:
 *         description: Bed created
 *   get:
 *     summary: List beds
 *     description: Omit `page`/`limit` to get every bed as a plain array (used by bed pickers); pass them for a paginated `{ data, meta }` payload.
 *     tags: [Admin - Beds]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [AVAILABLE, OCCUPIED, MAINTENANCE] }
 *       - in: query
 *         name: search
 *         description: Matches bed number or the current occupant's patient name.
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Bed list
 */
router.post(
  "/beds",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  validate({ body: bedCreateSchema }),
  adminController.createBed
);

// Ward-wide counts for the bed grid, which is paged and can't total its own rows.
/**
 * @swagger
 * /admin/beds/stats:
 *   get:
 *     summary: Ward-wide bed counts by status
 *     tags: [Admin - Beds]
 *     responses:
 *       200:
 *         description: Counts
 */
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

/**
 * @swagger
 * /admin/beds/{id}:
 *   patch:
 *     summary: Change a bed's status
 *     description: OCCUPIED can only be set through the admission workflow; a bed must be AVAILABLE before it can go to MAINTENANCE.
 *     tags: [Admin - Beds]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [AVAILABLE, MAINTENANCE] }
 *     responses:
 *       200:
 *         description: Updated bed
 */
router.patch(
  "/beds/:id",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
  validate({ body: bedUpdateSchema }),
  adminController.updateBed
);

// Audit Logs

/**
 * @swagger
 * /admin/audit-logs/stats:
 *   get:
 *     summary: Audit log summary counts for a time window
 *     description: Uses the same `range` as the list, so the cards can never disagree with the rows below them.
 *     tags: [Admin - Audit Logs]
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [24h, today, 7d, 30d, all], default: 24h }
 *     responses:
 *       200:
 *         description: Counts
 * /admin/audit-logs:
 *   get:
 *     summary: List audit log entries
 *     tags: [Admin - Audit Logs]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: eventLevel
 *         schema: { type: string, enum: [All, Info, Warning, Critical] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [24h, today, 7d, 30d, all], default: 24h }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated audit log
 */
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

/**
 * @swagger
 * /admin/login-attempts/stats:
 *   get:
 *     summary: Login attempt summary counts for a time window
 *     tags: [Admin - Login Attempts]
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [24h, today, 7d, 30d, all], default: 24h }
 *     responses:
 *       200:
 *         description: Counts, including currently locked accounts
 * /admin/login-attempts:
 *   get:
 *     summary: List login attempts
 *     tags: [Admin - Login Attempts]
 *     parameters:
 *       - in: query
 *         name: search
 *         description: Matches email, IP address, or the matched user's name.
 *         schema: { type: string }
 *       - in: query
 *         name: outcome
 *         schema: { type: string, enum: [All, SUCCESS, FAILED] }
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [24h, today, 7d, 30d, all], default: 24h }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated login attempt log
 */
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
