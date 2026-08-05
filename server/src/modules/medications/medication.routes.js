const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const medicationController = require("./medication.controller");
const {
  createMedicationSchema,
  updateMedicationSchema,
  discontinueMedicationSchema,
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
/**
 * @swagger
 * /admissions/{id}/medications:
 *   post:
 *     summary: Prescribe a medication (doctors only)
 *     tags: [Medications]
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
 *             required: [drugName, dosage, frequency]
 *             properties:
 *               drugName: { type: string }
 *               dosage: { type: string }
 *               frequency: { type: string }
 *               route: { type: string }
 *     responses:
 *       201:
 *         description: Medication order created
 *   get:
 *     summary: List medication orders for an admission
 *     tags: [Medications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Medication list
 */
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

// The day's dose schedule for every active order — what the nurse works from.
/**
 * @swagger
 * /admissions/{id}/mar:
 *   get:
 *     summary: Get today's Medication Administration Record (MAR) schedule
 *     tags: [Medications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dose schedule for every active order
 */
admissionMedicationsRouter.get(
  "/:id/mar",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  medicationController.getMar
);

// Nested under /medications/:id
/**
 * @swagger
 * /medications/{id}:
 *   patch:
 *     summary: Amend a medication order (doctors only)
 *     tags: [Medications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated order
 *   delete:
 *     summary: Discontinue a medication order (doctors only)
 *     description: Soft-deletes — the order stays in the record marked inactive with the reason it was stopped.
 *     tags: [Medications]
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Discontinued
 */
medicationsRouter.patch(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: updateMedicationSchema }),
  medicationController.updateMedication
);

// Discontinue rather than delete: the order stays in the record, marked
// inactive with the reason it was stopped.
medicationsRouter.delete(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: discontinueMedicationSchema }),
  medicationController.deleteMedication
);

// ---------------------------------------------------------
// ADMINISTRATIONS (eMAR)
// ---------------------------------------------------------

// Nested under /medications/:id/administrations
/**
 * @swagger
 * /medications/{id}/administrations:
 *   post:
 *     summary: Log a dose administration (nurses only)
 *     tags: [Medications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Administration logged
 *   get:
 *     summary: List administration history for a medication order
 *     tags: [Medications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Administration history
 */
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
/**
 * @swagger
 * /medication-administrations/{id}:
 *   patch:
 *     summary: Correct a logged administration
 *     tags: [Medications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     summary: Delete a logged administration (doctors only)
 *     tags: [Medications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
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
