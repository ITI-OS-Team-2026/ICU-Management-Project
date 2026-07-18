const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const diagnosisController = require("./diagnosis.controller");
const { diagnosisCreateSchema, diagnosisUpdateSchema } = require("./diagnosis.schema");

const admissionDiagnosisRouter = express.Router();
const diagnosisRouter = express.Router();

admissionDiagnosisRouter.post(
  "/:id/diagnoses",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: diagnosisCreateSchema }),
  diagnosisController.createDiagnosis
);

admissionDiagnosisRouter.get(
  "/:id/diagnoses",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  diagnosisController.getDiagnoses
);

diagnosisRouter.patch(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: diagnosisUpdateSchema }),
  diagnosisController.updateDiagnosis
);

diagnosisRouter.delete(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  diagnosisController.deleteDiagnosis
);

module.exports = { admissionDiagnosisRouter, diagnosisRouter };
