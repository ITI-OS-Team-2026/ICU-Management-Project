const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const adminController = require("./admin.controller");
const {
  userCreateSchema,
  userUpdateSchema,
  bedCreateSchema,
  bedUpdateSchema
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
  "/users",
  verifyToken,
  restrictTo(["SYSTEM_ADMIN"]),
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

module.exports = router;
