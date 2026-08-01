const express = require("express");
const documentController = require("./document.controller");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const { createDocumentSchema } = require("./document.schema");
const { uploadSingleFile } = require("../../middlewares/uploadSingleFile");

const admissionDocumentsRouter = express.Router();
const baseDocumentsRouter = express.Router();

// Shared with assistant chat resources so both accept the same formats/size.
const uploadMiddleware = uploadSingleFile("file");

// POST /admissions/:id/documents
admissionDocumentsRouter.post(
  "/:id/documents",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  uploadMiddleware,
  validate({ body: createDocumentSchema }),
  documentController.createDocument
);

// GET /admissions/:id/documents
admissionDocumentsRouter.get(
  "/:id/documents",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  documentController.getDocuments
);

// GET /documents/:id/download
baseDocumentsRouter.get(
  "/:id/download",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  documentController.downloadDocument
);

// DELETE /documents/:id
baseDocumentsRouter.delete(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  documentController.deleteDocument
);

module.exports = {
  admissionDocumentsRouter,
  baseDocumentsRouter,
};
