/**
 * Standalone OCR diagnostic — run with:
 *   node scripts/test_ocr.js
 *
 * Downloads the uploaded JPEG from Cloudinary (or a local test image)
 * and runs the fixed Tesseract.js v7 OCR pipeline on it.
 */

require("dotenv").config();

const path = require("path");
const fetch = require("node-fetch");
const tesseract = require("tesseract.js");

const TESSDATA_DIR = path.resolve(__dirname, "..");

const CLOUDINARY_URL = process.argv[2]; // pass as first arg, or hardcode below

async function recognizeImage(buffer, psm, label) {
  const worker = await tesseract.createWorker("eng", 1, {
    langPath: TESSDATA_DIR,
    logger: (m) => {
      if (m.status && m.progress !== undefined) {
        process.stdout.write(`\r  [${label}] ${m.status} ${(m.progress * 100).toFixed(0)}%   `);
      }
    },
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      preserve_interword_spaces: "0",
      user_defined_dpi: "300",
    });
    const { data } = await worker.recognize(buffer);
    process.stdout.write("\n");
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}

async function main() {
  const url = CLOUDINARY_URL;

  if (!url) {
    console.error("Usage: node scripts/test_ocr.js <cloudinary-url-or-image-url>");
    console.error("Example: node scripts/test_ocr.js https://res.cloudinary.com/.../download_1.jpeg");
    process.exit(1);
  }

  console.log("Fetching image from:", url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`Image downloaded: ${buffer.length} bytes\n`);

  console.log("=== Pass 1: PSM AUTO ===");
  const text1 = await recognizeImage(buffer, tesseract.PSM.AUTO, "AUTO");
  const trimmed1 = text1.trim();
  console.log(`Length: ${trimmed1.length} chars`);
  console.log("--- OCR result ---");
  console.log(trimmed1 || "(empty)");

  if (trimmed1.length < 32) {
    console.log("\n=== Pass 2: PSM SPARSE_TEXT ===");
    const text2 = await recognizeImage(buffer, tesseract.PSM.SPARSE_TEXT, "SPARSE");
    const trimmed2 = text2.trim();
    console.log(`Length: ${trimmed2.length} chars`);
    console.log("--- OCR result ---");
    console.log(trimmed2 || "(empty)");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
