const multer = require("multer");
const APIError = require("../utils/APIError");

/**
 * Single-file upload middleware shared by patient documents and assistant chat
 * resources, so both accept exactly the same formats and size ceiling.
 *
 * Files are kept in memory and streamed straight to Cloudinary — no disk writes.
 */

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

// Every type here has a text extractor in modules/rag/textExtractor.js, so an
// accepted upload can always be indexed (images go through OCR).
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "text/plain"];

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new APIError("Unsupported file type. Only PDF, JPEG, PNG, and TXT are allowed.", 415),
      false
    );
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter,
});

/**
 * @param {string} [field] — multipart field name carrying the file
 * @returns Express middleware that populates `req.file`, translating multer's
 *   own errors into the API's 413/400 shape.
 */
const uploadSingleFile = (field = "file") => {
  const handler = upload.single(field);

  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new APIError("File size limit exceeded (max 10MB)", 413));
        }
        return next(new APIError(err.message, 400));
      }
      if (err) return next(err);
      next();
    });
  };
};

module.exports = { uploadSingleFile, ALLOWED_MIME_TYPES, MAX_FILE_BYTES };
