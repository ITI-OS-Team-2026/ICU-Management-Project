const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const labResultController = require("./labResult.controller");
const { createLabResultSchema } = require("./labResult.schema");

const admissionLabsRouter = express.Router();
const labsRouter = express.Router();

// Nested under /admissions/:id/labs
admissionLabsRouter.post(
  "/:id/labs",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createLabResultSchema }),
  labResultController.createLabResult,
);

admissionLabsRouter.get(
  "/:id/labs",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  labResultController.getLabResults,
);

// Top-level /labs/:id
labsRouter.delete(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]), // Soft archive
  labResultController.deleteLabResult,
);

module.exports = {
  admissionLabsRouter,
  labsRouter,
};
