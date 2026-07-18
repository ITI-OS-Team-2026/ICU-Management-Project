const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const medicationController = require("./medication.controller");
const {
  createMedicationSchema,
  updateMedicationSchema,
  createAdministrationSchema,
  updateAdministrationSchema,
} = require("./medication.schema");

const admissionMedicationsRouter = express.Router();
const medicationsRouter = express.Router();
const administrationsRouter = express.Router();

// ---------------------------------------------------------
// PRESCRIPTIONS
// ---------------------------------------------------------

// Nested under /admissions/:id/medications
admissionMedicationsRouter.post(
  "/:id/medications",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createMedicationSchema }),
  medicationController.createMedication
);

admissionMedicationsRouter.get(
  "/:id/medications",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  medicationController.getMedications
);

// Nested under /medications/:id
medicationsRouter.patch(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: updateMedicationSchema }),
  medicationController.updateMedication
);

medicationsRouter.delete(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  medicationController.deleteMedication
);

// ---------------------------------------------------------
// ADMINISTRATIONS (eMAR)
// ---------------------------------------------------------

// Nested under /medications/:id/administrations
medicationsRouter.post(
  "/:id/administrations",
  verifyToken,
  restrictTo(["ICU_NURSE"]),
  validate({ body: createAdministrationSchema }),
  medicationController.logAdministration
);

medicationsRouter.get(
  "/:id/administrations",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  medicationController.getAdministrations
);

// Nested under /medication-administrations/:id
administrationsRouter.patch(
  "/:id",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]), // Allowed for nurses to correct their logs
  validate({ body: updateAdministrationSchema }),
  medicationController.updateAdministration
);

administrationsRouter.delete(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  medicationController.deleteAdministration
);

module.exports = {
  admissionMedicationsRouter,
  medicationsRouter,
  administrationsRouter,
};
