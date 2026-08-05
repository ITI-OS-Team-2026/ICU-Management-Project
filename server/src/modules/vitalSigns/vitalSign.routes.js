const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const vitalSignController = require("./vitalSign.controller");
const { createVitalSignSchema, updateVitalSignSchema } = require("./vitalSign.schema");

const admissionVitalsRouter = express.Router();
const vitalsRouter = express.Router();

// Routes nested under /admissions/:id/vitals
/**
 * @swagger
 * /admissions/{id}/vitals:
 *   post:
 *     summary: Record a vital sign reading
 *     tags: [Vitals]
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
 *             properties:
 *               temperature: { type: number }
 *               pulse: { type: integer }
 *               systolicBp: { type: integer }
 *               diastolicBp: { type: integer }
 *               respiratoryRate: { type: integer }
 *               spo2: { type: integer }
 *     responses:
 *       201:
 *         description: Vital sign recorded
 *   get:
 *     summary: List vital sign history for an admission
 *     tags: [Vitals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Vitals history
 */
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
/**
 * @swagger
 * /vitals/{id}:
 *   patch:
 *     summary: Correct a vital sign reading (doctors only)
 *     tags: [Vitals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated reading
 *   delete:
 *     summary: Soft-delete a vital sign reading (doctors only)
 *     tags: [Vitals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
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
