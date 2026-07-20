const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const patientController = require("./patient.controller");
const {
  patientCreateSchema,
  patientQuerySchema,
  allergyCreateSchema,
  medicalHistoryCreateSchema,
  medicalHistoryUpdateSchema
} = require("./patient.schema");

const router = express.Router();

// Patients
router.post(
  "/",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: patientCreateSchema }),
  patientController.createPatient
);

router.get(
  "/",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ query: patientQuerySchema }),
  patientController.getPatients
);

router.get(
  "/:id",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  patientController.getPatientById
);

router.delete(
  "/:id",
  verifyToken,
  restrictTo(["ICU_SPECIALIST"]),
  patientController.deletePatient
);

// Allergies
router.post(
  "/:id/allergies",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: allergyCreateSchema }),
  patientController.createAllergy
);

router.get(
  "/:id/allergies",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  patientController.getAllergies
);

router.delete(
  "/allergies/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  patientController.deleteAllergy
);

// Medical History
router.post(
  "/:id/medical-history",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: medicalHistoryCreateSchema }),
  patientController.createMedicalHistory
);

router.get(
  "/:id/medical-history",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  patientController.getMedicalHistory
);

router.patch(
  "/:id/medical-history",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: medicalHistoryUpdateSchema }),
  patientController.updateMedicalHistory
);

module.exports = router;
