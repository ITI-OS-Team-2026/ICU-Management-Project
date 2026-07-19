const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const examinationController = require("./examination.controller");
const { createExaminationSchema } = require("./examination.schema");

const admissionExaminationsRouter = express.Router();

// Routes nested under /admissions/:id/examinations
admissionExaminationsRouter.post(
  "/:id/examinations",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createExaminationSchema }),
  examinationController.createExamination
);

admissionExaminationsRouter.get(
  "/:id/examinations",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  examinationController.getExaminations
);

module.exports = {
  admissionExaminationsRouter
};
