const fs = require("fs/promises");
const path = require("path");
const config = require("../../config/env");
const logger = require("../../utils/logger");
const tesseract = require("tesseract.js");

// Tesseract.js v7: langPath must point to the *directory* containing the
// .traineddata file. We use the bundled eng.traineddata at server/ so OCR
// never requires a network download.
const TESSDATA_DIR = path.resolve(__dirname, "..", "..", "..");

// Require the library entry point directly: pdf-parse's index.js runs a demo file
// read when it believes it is the main module, which breaks under Jest.
const pdfParse = require("pdf-parse/lib/pdf-parse.js");


/**
 * Raised when a document cannot contribute text to the RAG index for a benign,
 * permanent reason (e.g. a scanned image with no OCR available). Callers mark
 * these documents SKIPPED rather than FAILED — retrying would not help.
 */
class UnsupportedDocumentError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsupportedDocumentError";
  }
}

/**
 * Raised when text extraction failed for a transient/technical reason
 * (corrupt file, unreadable path). These documents are marked FAILED and can
 * be retried through the re-index endpoint.
 */
class ExtractionError extends Error {
  constructor(message) {
    super(message);
    this.name = "ExtractionError";
  }
}

const TEXT_EXTENSIONS = new Set([".txt", ".text", ".md", ".csv", ".log"]);
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
]);

/**
 * Collapse the whitespace noise typical of PDF text layers while keeping
 * paragraph boundaries, which the chunker uses as preferred split points.
 */
const normalizeExtractedText = (raw) => {
  if (!raw) return "";

  return (
    String(raw)
      .replace(/\r\n?/g, "\n")
      // Strip NUL, zero-width and BOM characters that PDF text layers often carry.
      .replace(/[\u0000\u200B-\u200D\uFEFF]/g, "")
      // Soft-hyphen line wrapping produced by PDF extractors: "hyper-\ntension"
      .replace(/(\w)-\n(\w)/g, "$1$2")
      .replace(/[ \t\u00A0]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
};

/**
 * Inject Cloudinary image transformation parameters into a Cloudinary URL so
 * that a thumbnail-sized upload is served at a resolution suitable for OCR.
 *
 * Cloudinary URLs look like:
 *   https://res.cloudinary.com/<cloud>/image/upload/<version>/<public_id>
 * or with existing transformations:
 *   https://res.cloudinary.com/<cloud>/image/upload/<transforms>/<version>/<public_id>
 *
 * We insert `w_2000,q_100` after `/upload/` so Tesseract gets a large enough
 * scan to recognise text from. Non-Cloudinary URLs are returned unchanged.
 */
const withCloudinaryUpscale = (url) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  // Only inject once — avoid stacking transformations on re-index runs.
  if (url.includes("/w_2000")) return url;
  return url.replace("/upload/", "/upload/w_2000,q_100/");
};

/**
 * Read file content from different storage types.
 * Supports: local filesystem, Cloudinary URLs, and database BLOBs.
 * When the document is an image on Cloudinary the URL is rewritten to request
 * a high-resolution render so OCR has enough pixels to work with.
 */
const readFileBuffer = async (options) => {
  const { storageType, filePath, cloudinaryUrl, fileContent, mimeType, originalName } = options;

  if (storageType === "blob" && fileContent) {
    // Database BLOB storage
    return fileContent;
  } else if (storageType === "cloudinary" && cloudinaryUrl) {
    // Cloudinary URL → fetch via HTTP.
    // For images we request a high-resolution render so Tesseract has enough
    // pixels to extract text. PDFs and other formats are fetched as-is.
    const fetch = require("node-fetch");
    const extension = path.extname(originalName || "").toLowerCase();
    const normalizedMime = (mimeType || "").toLowerCase();
    const isImage =
      normalizedMime.startsWith("image/") || IMAGE_EXTENSIONS.has(extension);

    const fetchUrl = isImage ? withCloudinaryUpscale(cloudinaryUrl) : cloudinaryUrl;
    if (isImage && fetchUrl !== cloudinaryUrl) {
      logger.info("Fetching Cloudinary image at high-res for OCR: %s", fetchUrl);
    }

    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new ExtractionError(
          `Failed to fetch from Cloudinary: ${response.status}`,
        );
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (err) {
      throw new ExtractionError(
        `Could not download document from Cloudinary: ${err.message}`,
      );
    }
  } else if (storageType === "local" && filePath) {
    // Local filesystem
    try {
      return await fs.readFile(filePath);
    } catch (err) {
      throw new ExtractionError(
        `Could not read file from disk: ${err.message}`,
      );
    }
  } else {
    throw new ExtractionError("Document has no valid storage location.");
  }
};

const extractPlainText = async (buffer) => {
  return { text: buffer.toString("utf8"), pageCount: null };
};

/**
 * Run Tesseract OCR with the correct Tesseract.js v7 API.
 *
 * In v7, `tesseract.recognize(image, lang, options)` takes *worker* options
 * (langPath, logger, gzip …) as the third argument — NOT Tesseract engine
 * parameters like tessedit_pageseg_mode. Engine parameters must be applied
 * via `worker.setParameters()` before calling `worker.recognize()`.
 */
const recognizeImage = async (buffer, psm) => {
  const worker = await tesseract.createWorker("eng", 1, {
    // Point to the bundled eng.traineddata — avoids any network download.
    langPath: TESSDATA_DIR,
    // Suppress verbose per-character progress logs in server output.
    logger: () => {},
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      preserve_interword_spaces: "0",
      user_defined_dpi: "300",
    });
    const { data } = await worker.recognize(buffer);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
};

const extractImageText = async (buffer) => {
  try {
    let text = await recognizeImage(buffer, tesseract.PSM.AUTO);
    if (String(text).trim().length < 32) {
      logger.warn(
        "OCR returned a very short result, retrying with sparse text mode.",
      );
      text = await recognizeImage(buffer, tesseract.PSM.SPARSE_TEXT);
    }
    return { text, pageCount: 1 };
  } catch (err) {
    logger.warn("OCR failed: %s", err.message);
    throw new ExtractionError(
      "OCR could not extract text from this image. The image may be too low-resolution or corrupt.",
    );
  }
};

const extractPdfText = async (buffer) => {
  let parsed;
  try {
    parsed = await pdfParse(buffer);
  } catch (err) {
    logger.warn("PDF text extraction failed: %s", err.message);
    throw new ExtractionError(
      "The PDF could not be parsed. It may be corrupt, password-protected, or not a valid PDF.",
    );
  }

  return { text: parsed.text || "", pageCount: parsed.numpages ?? null };
};

/**
 * Extract indexable plain text from a document in any storage type.
 *
 * @param {Object} options
 * @param {string} [options.filePath]      — absolute path on disk (for local storage)
 * @param {string} [options.cloudinaryUrl] — Cloudinary URL (for cloud storage)
 * @param {Buffer} [options.fileContent]   — raw file content (for BLOB storage)
 * @param {string} [options.storageType]   — "local" | "cloudinary" | "blob"
 * @param {string} [options.mimeType]      — mime type captured at upload time
 * @param {string} [options.originalName]  — used as an extension fallback
 * @returns {Promise<{ text: string, pageCount: number|null, extractor: string, truncated: boolean }>}
 * @throws {UnsupportedDocumentError} when the format carries no extractable text
 * @throws {ExtractionError} when extraction was attempted but failed
 */
const extractText = async (options) => {
  const { mimeType, originalName, storageType = "local" } = options;

  // Read file buffer from appropriate storage
  const buffer = await readFileBuffer(options);

  const extension = path.extname(originalName || "").toLowerCase();
  const normalizedMime = (mimeType || "").toLowerCase();

  let result;
  let extractor;

  if (normalizedMime === "application/pdf" || extension === ".pdf") {
    result = await extractPdfText(buffer);
    extractor = "pdf-parse";
  } else if (
    normalizedMime.startsWith("text/") ||
    TEXT_EXTENSIONS.has(extension)
  ) {
    result = await extractPlainText(buffer);
    extractor = "utf8";
  } else if (
    normalizedMime.startsWith("image/") ||
    IMAGE_EXTENSIONS.has(extension)
  ) {
    result = await extractImageText(buffer);
    extractor = "tesseract-ocr";
  } else {
    throw new UnsupportedDocumentError(
      `No text extractor is available for "${mimeType || extension || "this file type"}".`,
    );
  }

  const normalized = normalizeExtractedText(result.text);

  const isImage =
    normalizedMime.startsWith("image/") || IMAGE_EXTENSIONS.has(extension);

  // Tesseract often extracts a few garbage characters (like "BRAI GI bd") from
  // non-text images like X-rays. If an image yields < 32 chars, consider it empty.
  if (!normalized || (isImage && normalized.length < 32)) {
    // Distinguish image documents from other types so the UI can show a
    // targeted explanation rather than a generic OCR failure message.

    throw new UnsupportedDocumentError(
      isImage
        ? "No text found in this image. X-rays, scans, and photos cannot be searched by the AI assistant — only images that contain printed or typed text (e.g. scanned forms or reports) are indexable."
        : "No readable text was found in this document.",
    );
  }

  const truncated = normalized.length > config.ragMaxDocumentChars;

  return {
    text: truncated
      ? normalized.slice(0, config.ragMaxDocumentChars)
      : normalized,
    pageCount: result.pageCount,
    extractor,
    truncated,
  };
};

module.exports = {
  extractText,
  normalizeExtractedText,
  UnsupportedDocumentError,
  ExtractionError,
};
