const fs = require("fs/promises");
const path = require("path");
const config = require("../../config/env");
const logger = require("../../utils/logger");

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
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff"]);

/**
 * Collapse the whitespace noise typical of PDF text layers while keeping
 * paragraph boundaries, which the chunker uses as preferred split points.
 */
const normalizeExtractedText = (raw) => {
  if (!raw) return "";

  return String(raw)
    .replace(/\r\n?/g, "\n")
    // Strip NUL, zero-width and BOM characters that PDF text layers often carry.
    .replace(/[\u0000\u200B-\u200D\uFEFF]/g, "")
    // Soft-hyphen line wrapping produced by PDF extractors: "hyper-\ntension"
    .replace(/(\w)-\n(\w)/g, "$1$2")
    .replace(/[ \t\u00A0]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

/**
 * Read file content from different storage types.
 * Supports: local filesystem, Cloudinary URLs, and database BLOBs.
 */
const readFileBuffer = async (options) => {
  const { storageType, filePath, cloudinaryUrl, fileContent } = options;

  if (storageType === "blob" && fileContent) {
    // Database BLOB storage
    return fileContent;
  } else if (storageType === "cloudinary" && cloudinaryUrl) {
    // Cloudinary URL → fetch via HTTP
    const fetch = require("node-fetch");
    try {
      const response = await fetch(cloudinaryUrl);
      if (!response.ok) {
        throw new ExtractionError(`Failed to fetch from Cloudinary: ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (err) {
      throw new ExtractionError(`Could not download document from Cloudinary: ${err.message}`);
    }
  } else if (storageType === "local" && filePath) {
    // Local filesystem
    try {
      return await fs.readFile(filePath);
    } catch (err) {
      throw new ExtractionError(`Could not read file from disk: ${err.message}`);
    }
  } else {
    throw new ExtractionError("Document has no valid storage location.");
  }
};

const extractPlainText = async (buffer) => {
  return { text: buffer.toString("utf8"), pageCount: null };
};

const extractPdfText = async (buffer) => {
  let parsed;
  try {
    parsed = await pdfParse(buffer);
  } catch (err) {
    logger.warn("PDF text extraction failed: %s", err.message);
    throw new ExtractionError(
      "The PDF could not be parsed. It may be corrupt, password-protected, or not a valid PDF."
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
  } else if (normalizedMime.startsWith("text/") || TEXT_EXTENSIONS.has(extension)) {
    result = await extractPlainText(buffer);
    extractor = "utf8";
  } else if (normalizedMime.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
    throw new UnsupportedDocumentError(
      "Image documents carry no machine-readable text. Enable OCR or upload a PDF/text version to include this document in AI answers."
    );
  } else {
    throw new UnsupportedDocumentError(
      `No text extractor is available for "${mimeType || extension || "this file type"}".`
    );
  }

  const normalized = normalizeExtractedText(result.text);

  if (!normalized) {
    throw new UnsupportedDocumentError(
      "No readable text was found in this document. Scanned pages require OCR, which is not enabled."
    );
  }

  const truncated = normalized.length > config.ragMaxDocumentChars;

  return {
    text: truncated ? normalized.slice(0, config.ragMaxDocumentChars) : normalized,
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
