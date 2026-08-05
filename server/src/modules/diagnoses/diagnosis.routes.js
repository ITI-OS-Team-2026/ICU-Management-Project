const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const diagnosisController = require("./diagnosis.controller");
const {
  diagnosisCreateSchema,
  diagnosisUpdateSchema,
  diagnosisStatusSchema,
  concernCreateSchema,
  concernRespondSchema,
} = require("./diagnosis.schema");

const admissionDiagnosisRouter = express.Router();
const diagnosisRouter = express.Router();
const concernRouter = express.Router();

const DOCTORS = ["MEDICAL_RESIDENT", "ICU_SPECIALIST"];
const CLINICAL_STAFF = ["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"];

// ---------------------------------------------------------
// DIAGNOSES — doctors write, all clinical staff read
// ---------------------------------------------------------

admissionDiagnosisRouter.post(
  "/:id/diagnoses",
  verifyToken,
  restrictTo(DOCTORS),
  validate({ body: diagnosisCreateSchema }),
  diagnosisController.createDiagnosis
);

admissionDiagnosisRouter.get(
  "/:id/diagnoses",
  verifyToken,
  restrictTo(CLINICAL_STAFF),
  diagnosisController.getDiagnoses
);

// Every unanswered nursing concern on this admission, for the doctor's queue.
admissionDiagnosisRouter.get(
  "/:id/diagnosis-concerns",
  verifyToken,
  restrictTo(CLINICAL_STAFF),
  diagnosisController.getOpenConcerns
);

// Amend the wording, code, type or reasoning. Status is deliberately excluded.
diagnosisRouter.patch(
  "/:id",
  verifyToken,
  restrictTo(DOCTORS),
  validate({ body: diagnosisUpdateSchema }),
  diagnosisController.updateDiagnosis
);

// Move through the differential — confirm, rule out, resolve. Reason required.
diagnosisRouter.patch(
  "/:id/status",
  verifyToken,
  restrictTo(DOCTORS),
  validate({ body: diagnosisStatusSchema }),
  diagnosisController.changeStatus
);

diagnosisRouter.delete(
  "/:id",
  verifyToken,
  restrictTo(DOCTORS),
  diagnosisController.deleteDiagnosis
);

// ---------------------------------------------------------
// NURSE PARTICIPATION
// ---------------------------------------------------------

// Proof the bedside nurse has seen this diagnosis.
diagnosisRouter.post(
  "/:id/acknowledge",
  verifyToken,
  restrictTo(["ICU_NURSE"]),
  diagnosisController.acknowledgeDiagnosis
);

// A nursing observation that the presentation does not fit the diagnosis.
diagnosisRouter.post(
  "/:id/concerns",
  verifyToken,
  restrictTo(["ICU_NURSE"]),
  validate({ body: concernCreateSchema }),
  diagnosisController.raiseConcern
);

// Only a doctor closes a concern, and only with an answer.
concernRouter.patch(
  "/:id",
  verifyToken,
  restrictTo(DOCTORS),
  validate({ body: concernRespondSchema }),
  diagnosisController.respondToConcern
);

module.exports = { admissionDiagnosisRouter, diagnosisRouter, concernRouter };
