const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const admissionController = require("./admission.controller");
const {
  admissionCreateSchema,
  admissionQuerySchema,
  nurseAssignSchema,
  fullAdmissionCreateSchema,
} = require("./admission.schema");
const notificationController = require("../notifications/notification.controller");

const router = express.Router();

const clinicalRoles = ["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"];
const nurseOrSpecialist = ["ICU_NURSE", "ICU_SPECIALIST"];

router.post(
  "/",
  verifyToken,
  restrictTo(clinicalRoles),
  validate({ body: admissionCreateSchema }),
  admissionController.createAdmission
);

router.post(
  "/full",
  verifyToken,
  restrictTo(clinicalRoles),
  validate({ body: fullAdmissionCreateSchema }),
  admissionController.createFullAdmission
);

router.get(
  "/",
  verifyToken,
  restrictTo(clinicalRoles),
  validate({ query: admissionQuerySchema }),
  admissionController.getAdmissions
);

router.get(
  "/:id",
  verifyToken,
  restrictTo(clinicalRoles),
  admissionController.getAdmissionById
);

router.patch(
  "/:id/discharge",
  verifyToken,
  restrictTo(["ICU_SPECIALIST"]),
  admissionController.dischargeAdmission
);

router.delete(
  "/:id",
  verifyToken,
  restrictTo(["ICU_SPECIALIST"]),
  admissionController.archiveAdmission
);

router.post(
  "/:id/nurses",
  verifyToken,
  restrictTo(nurseOrSpecialist),
  validate({ body: nurseAssignSchema }),
  admissionController.assignNurse
);

router.get(
  "/:id/nurses",
  verifyToken,
  restrictTo(clinicalRoles),
  admissionController.getAdmissionNurses
);

router.delete(
  "/:id/nurses/:nurseId",
  verifyToken,
  restrictTo(nurseOrSpecialist),
  admissionController.unassignNurse
);

router.post(
  "/:id/summon",
  verifyToken,
  restrictTo(["ICU_NURSE"]),
  notificationController.summonDoctor
);

module.exports = router;
