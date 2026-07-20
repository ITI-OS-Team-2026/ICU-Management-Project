const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const documentController = require("./document.controller");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const { createDocumentSchema } = require("./document.schema");
const APIError = require("../../utils/APIError");

const admissionDocumentsRouter = express.Router();
const baseDocumentsRouter = express.Router();

// ponytail: Ensure the upload folder exists.
const uploadDir = path.join(__dirname, "../../../uploads/documents");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "text/plain",
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new APIError("Unsupported file type. Only PDF, JPEG, PNG, and TXT are allowed.", 415), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
}).single("file");

// Custom wrapper to format multer errors to 413 or 415
const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new APIError("File size limit exceeded (max 10MB)", 413));
      }
      return next(new APIError(err.message, 400));
    } else if (err) {
      return next(err);
    }
    next();
  });
};

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
