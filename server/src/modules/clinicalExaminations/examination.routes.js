const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const examinationController = require("./examination.controller");
const { createExaminationSchema } = require("./examination.schema");

const admissionExaminationsRouter = express.Router();

// Routes nested under /admissions/:id/examinations
/**
 * @swagger
 * /admissions/{id}/examinations:
 *   post:
 *     summary: Record a structured clinical examination (doctors only)
 *     tags: [Clinical Examinations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Examination recorded
 *   get:
 *     summary: List clinical examinations for an admission
 *     tags: [Clinical Examinations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Examination list
 */
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
