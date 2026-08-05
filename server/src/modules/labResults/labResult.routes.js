const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const labResultController = require("./labResult.controller");
const { createLabResultSchema } = require("./labResult.schema");

const admissionLabsRouter = express.Router();
const labsRouter = express.Router();

// Nested under /admissions/:id/labs
/**
 * @swagger
 * /admissions/{id}/labs:
 *   post:
 *     summary: Record a lab result
 *     tags: [Lab Results]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [testName, resultValue]
 *             properties:
 *               testName: { type: string }
 *               resultValue: { type: string }
 *               abnormal: { type: boolean }
 *     responses:
 *       201:
 *         description: Lab result recorded
 *   get:
 *     summary: List lab results for an admission
 *     tags: [Lab Results]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lab result list
 */
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
/**
 * @swagger
 * /labs/{id}:
 *   delete:
 *     summary: Archive a lab result (doctors only)
 *     tags: [Lab Results]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Archived
 */
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
