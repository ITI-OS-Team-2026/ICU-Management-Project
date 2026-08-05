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

/**
 * @swagger
 * /admissions/{id}/diagnoses:
 *   post:
 *     summary: Add a diagnosis (doctors only)
 *     tags: [Diagnoses]
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
 *             required: [conditionName]
 *             properties:
 *               conditionName: { type: string }
 *               type: { type: string, enum: [PRIMARY, SECONDARY] }
 *     responses:
 *       201:
 *         description: Diagnosis created
 *   get:
 *     summary: List diagnoses for an admission
 *     tags: [Diagnoses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Diagnosis list
 */
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
/**
 * @swagger
 * /admissions/{id}/diagnosis-concerns:
 *   get:
 *     summary: List open nursing concerns raised against this admission's diagnoses
 *     tags: [Diagnoses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Open concerns
 */
admissionDiagnosisRouter.get(
  "/:id/diagnosis-concerns",
  verifyToken,
  restrictTo(CLINICAL_STAFF),
  diagnosisController.getOpenConcerns
);

// Amend the wording, code, type or reasoning. Status is deliberately excluded.
/**
 * @swagger
 * /diagnoses/{id}:
 *   patch:
 *     summary: Amend a diagnosis's wording, code, type, or reasoning
 *     description: Status is deliberately excluded here — use PATCH /diagnoses/{id}/status.
 *     tags: [Diagnoses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated diagnosis
 *   delete:
 *     summary: Delete a diagnosis
 *     tags: [Diagnoses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
diagnosisRouter.patch(
  "/:id",
  verifyToken,
  restrictTo(DOCTORS),
  validate({ body: diagnosisUpdateSchema }),
  diagnosisController.updateDiagnosis
);

// Move through the differential — confirm, rule out, resolve. Reason required.
/**
 * @swagger
 * /diagnoses/{id}/status:
 *   patch:
 *     summary: Move a diagnosis through the differential (confirm, rule out, resolve)
 *     description: Requires a reason for the change.
 *     tags: [Diagnoses]
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
 *             required: [status, reason]
 *             properties:
 *               status: { type: string, enum: [CONFIRMED, SUSPECTED, RULED_OUT, RESOLVED] }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Updated diagnosis
 */
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
/**
 * @swagger
 * /diagnoses/{id}/acknowledge:
 *   post:
 *     summary: Record that the bedside nurse has seen this diagnosis
 *     tags: [Diagnoses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Acknowledged
 */
diagnosisRouter.post(
  "/:id/acknowledge",
  verifyToken,
  restrictTo(["ICU_NURSE"]),
  diagnosisController.acknowledgeDiagnosis
);

// A nursing observation that the presentation does not fit the diagnosis.
/**
 * @swagger
 * /diagnoses/{id}/concerns:
 *   post:
 *     summary: Raise a nursing concern that the presentation doesn't fit the diagnosis
 *     tags: [Diagnoses]
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
 *             required: [concern]
 *             properties:
 *               concern: { type: string }
 *     responses:
 *       201:
 *         description: Concern raised
 */
diagnosisRouter.post(
  "/:id/concerns",
  verifyToken,
  restrictTo(["ICU_NURSE"]),
  validate({ body: concernCreateSchema }),
  diagnosisController.raiseConcern
);

// Only a doctor closes a concern, and only with an answer.
/**
 * @swagger
 * /diagnosis-concerns/{id}:
 *   patch:
 *     summary: Respond to and close a nursing concern (doctors only)
 *     tags: [Diagnoses]
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
 *             required: [response]
 *             properties:
 *               response: { type: string }
 *     responses:
 *       200:
 *         description: Concern closed
 */
concernRouter.patch(
  "/:id",
  verifyToken,
  restrictTo(DOCTORS),
  validate({ body: concernRespondSchema }),
  diagnosisController.respondToConcern
);

module.exports = { admissionDiagnosisRouter, diagnosisRouter, concernRouter };
