const express = require("express");
const noteController = require("./note.controller");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const { createClinicalNoteSchema, createNursingNoteSchema } = require("./note.schema");

const admissionNotesRouter = express.Router();
const baseNotesRouter = express.Router();

// Routes nested under /admissions
/**
 * @swagger
 * /admissions/{id}/notes/clinical:
 *   post:
 *     summary: Add a clinical note (doctors only)
 *     tags: [Notes]
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
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *     responses:
 *       201:
 *         description: Note created
 *   get:
 *     summary: List clinical notes for an admission
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Clinical note list
 */
admissionNotesRouter.post(
  "/:id/notes/clinical",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createClinicalNoteSchema }),
  noteController.createClinicalNote
);

// GET /admissions/:id/notes/clinical
admissionNotesRouter.get(
  "/:id/notes/clinical",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  noteController.getClinicalNotes
);

/**
 * @swagger
 * /admissions/{id}/notes/nursing:
 *   post:
 *     summary: Add a nursing note (nurses only)
 *     tags: [Notes]
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
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *     responses:
 *       201:
 *         description: Note created
 *   get:
 *     summary: List nursing notes for an admission
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Nursing note list
 */
admissionNotesRouter.post(
  "/:id/notes/nursing",
  verifyToken,
  restrictTo(["ICU_NURSE"]),
  validate({ body: createNursingNoteSchema }),
  noteController.createNursingNote
);

// GET /admissions/:id/notes/nursing
admissionNotesRouter.get(
  "/:id/notes/nursing",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  noteController.getNursingNotes
);

// Routes nested under /notes
/**
 * @swagger
 * /notes/clinical/{id}:
 *   delete:
 *     summary: Delete a clinical note (doctors only)
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 * /notes/nursing/{id}:
 *   delete:
 *     summary: Delete a nursing note (doctors only)
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
baseNotesRouter.delete(
  "/clinical/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  noteController.deleteClinicalNote
);

// DELETE /notes/nursing/:id
baseNotesRouter.delete(
  "/nursing/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  noteController.deleteNursingNote
);

module.exports = {
  admissionNotesRouter,
  baseNotesRouter,
};
