const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const vitalSignController = require("./vitalSign.controller");
const { createVitalSignSchema, updateVitalSignSchema } = require("./vitalSign.schema");

const admissionVitalsRouter = express.Router();
const vitalsRouter = express.Router();

// Routes nested under /admissions/:id/vitals
admissionVitalsRouter.post(
  "/:id/vitals",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createVitalSignSchema }),
  vitalSignController.createVitalSign
);

admissionVitalsRouter.get(
  "/:id/vitals",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  vitalSignController.getVitalSigns
);

// Standalone routes under /vitals/:id
vitalsRouter.patch(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]), // Usually only doctors can override/correct, but nurse corrections could be debated. Following standard.
  validate({ body: updateVitalSignSchema }),
  vitalSignController.updateVitalSign
);

vitalsRouter.delete(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]), // Soft delete
  vitalSignController.deleteVitalSign
);

module.exports = {
  admissionVitalsRouter,
  vitalsRouter,
};
