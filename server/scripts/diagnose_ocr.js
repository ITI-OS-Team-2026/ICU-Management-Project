/**
 * Standalone OCR diagnostic — uses the server's own modules.
 * Run from the server/ directory with:
 *   node scripts/diagnose_ocr.js
 */

const path = require("path");
process.chdir(path.resolve(__dirname, ".."));
require("dotenv").config();

const tesseract = require("tesseract.js");

const TESSDATA_DIR = path.resolve(__dirname, "..");

async function recognizeWithWorker(buffer, psm, label) {
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
  // Load the prisma client using the server's setup
  const prisma = require("../src/utils/prismaClient");

  console.log("Fetching JPEG document from database...\n");

  const doc = await prisma.medicalDocument.findFirst({
    where: {
      OR: [
        { mimeType: "image/jpeg" },
        { mimeType: "image/jpg" },
        { originalFilename: { contains: ".jpg" } },
        { originalFilename: { contains: ".jpeg" } },
      ],
    },
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      storageType: true,
      cloudinaryUrl: true,
      embeddingStatus: true,
      chunkCount: true,
      embeddingError: true,
    },
  });

  if (!doc) {
    console.error("No JPEG document found in DB.");
    process.exit(1);
  }

  console.log("Document:", JSON.stringify({
    id: doc.id,
    name: doc.originalFilename,
    mimeType: doc.mimeType,
    storageType: doc.storageType,
    cloudinaryUrl: doc.cloudinaryUrl,
    embeddingStatus: doc.embeddingStatus,
    chunkCount: doc.chunkCount,
    embeddingError: doc.embeddingError,
  }, null, 2));

  // Fetch the image
  let buffer;
  if (doc.storageType === "cloudinary" && doc.cloudinaryUrl) {
    console.log("\nDownloading from Cloudinary:", doc.cloudinaryUrl);
    const fetch = require("node-fetch");
    const response = await fetch(doc.cloudinaryUrl);
    if (!response.ok) throw new Error(`Cloudinary fetch failed: ${response.status}`);
    buffer = Buffer.from(await response.arrayBuffer());
  } else if (doc.storageType === "blob") {
    console.log("\nLoading from DB blob...");
    const full = await prisma.medicalDocument.findUnique({
      where: { id: doc.id },
      select: { fileContent: true },
    });
    buffer = full.fileContent;
  } else {
    throw new Error("Unknown storage type: " + doc.storageType);
  }

  console.log(`Image buffer: ${buffer.length} bytes\n`);

  console.log("=== OCR Pass 1: PSM AUTO ===");
  const text1 = await recognizeWithWorker(buffer, tesseract.PSM.AUTO, "AUTO");
  console.log(`Extracted ${text1.trim().length} chars`);
  console.log("--- Result preview (first 500 chars) ---");
  console.log(text1.trim().slice(0, 500) || "(empty)");

  if (text1.trim().length < 32) {
    console.log("\n=== OCR Pass 2: PSM SPARSE_TEXT ===");
    const text2 = await recognizeWithWorker(buffer, tesseract.PSM.SPARSE_TEXT, "SPARSE");
    console.log(`Extracted ${text2.trim().length} chars`);
    console.log("--- Result preview ---");
    console.log(text2.trim().slice(0, 500) || "(empty)");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
