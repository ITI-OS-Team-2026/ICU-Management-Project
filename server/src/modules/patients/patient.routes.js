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
  "/patients",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: patientCreateSchema }),
  patientController.createPatient
);

router.get(
  "/patients",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ query: patientQuerySchema }),
  patientController.getPatients
);

router.get(
  "/patients/:id",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  patientController.getPatientById
);

router.delete(
  "/patients/:id",
  verifyToken,
  restrictTo(["ICU_SPECIALIST"]),
  patientController.deletePatient
);

// Allergies
router.post(
  "/patients/:id/allergies",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: allergyCreateSchema }),
  patientController.createAllergy
);

router.get(
  "/patients/:id/allergies",
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
  "/patients/:id/medical-history",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: medicalHistoryCreateSchema }),
  patientController.createMedicalHistory
);

router.get(
  "/patients/:id/medical-history",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  patientController.getMedicalHistory
);

router.patch(
  "/patients/:id/medical-history",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: medicalHistoryUpdateSchema }),
  patientController.updateMedicalHistory
);

module.exports = router;
