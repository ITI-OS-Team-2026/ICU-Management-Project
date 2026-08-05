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

/**
 * @swagger
 * /admissions/{id}/documents:
 *   post:
 *     summary: Upload a medical document
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               documentType: { type: string }
 *     responses:
 *       201:
 *         description: Document uploaded and queued for embedding
 *   get:
 *     summary: List documents for an admission
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Document list
 */
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

/**
 * @swagger
 * /documents/{id}/download:
 *   get:
 *     summary: Download a document's original file
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: File stream
 * /documents/{id}:
 *   delete:
 *     summary: Delete a document (doctors only)
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
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
