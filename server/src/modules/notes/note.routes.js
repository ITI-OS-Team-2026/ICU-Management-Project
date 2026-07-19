const express = require("express");
const noteController = require("./note.controller");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const { createClinicalNoteSchema, createNursingNoteSchema } = require("./note.schema");

const admissionNotesRouter = express.Router();
const baseNotesRouter = express.Router();

// Routes nested under /admissions
// POST /admissions/:id/notes/clinical
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

// POST /admissions/:id/notes/nursing
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
// DELETE /notes/clinical/:id
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
