#!/usr/bin/env node
/**
 * Seed knowledge base documents to Cloudinary.
 * Run this script to upload medical knowledge PDFs to Cloudinary and register them in the database.
 *
 * Usage: node scripts/seedKnowledgeBase.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const prisma = require("../src/utils/prismaClient");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../src/utils/cloudinaryClient");
const cloudinary = require("../src/utils/cloudinaryClient");
const { indexDocument } = require("../src/modules/rag/indexing.service");
const fs = require("fs");

const KNOWLEDGE_BASE_DIR = path.join(__dirname, "../uploads/documents");

const KNOWLEDGE_DOCS = [
  {
    filename: "ICU_Clinical_Fundamentals.pdf",
    displayName: "ICU Clinical Fundamentals",
    docType: "clinical",
  },
  {
    filename: "Patient_History_Taking_Protocol.pdf",
    displayName: "Patient History Taking Protocol",
    docType: "clinical",
  },
  {
    filename: "Mechanical_Ventilation_Protocols.pdf",
    displayName: "Mechanical Ventilation Protocols",
    docType: "clinical",
  },
  {
    filename: "Hemodynamics_and_Cardiovascular_Management.pdf",
    displayName: "Hemodynamics & Cardiovascular Management",
    docType: "clinical",
  },
  {
    filename: "ICU_Medications_and_Sedation_Protocol.pdf",
    displayName: "ICU Medications & Sedation Protocol",
    docType: "clinical",
  },
  {
    filename: "Laboratory_Results_Interpretation.pdf",
    displayName: "Laboratory Results Interpretation",
    docType: "clinical",
  },
  {
    filename: "Common_ICU_Emergencies_Protocols.pdf",
    displayName: "Common ICU Emergencies Protocols",
    docType: "clinical",
  },
];

async function seedKnowledgeBase() {
  console.log("🔄 Seeding knowledge base to Cloudinary...\n");

  if (!cloudinary.isConfigured()) {
    console.error("❌ Cloudinary not configured. Check CLOUDINARY_* env vars.");
    process.exit(1);
  }

  // Get or create system admin user for uploads
  const admin = await prisma.user.findFirst({
    where: { role: "SYSTEM_ADMIN" },
  });

  if (!admin) {
    console.error("❌ No system admin found. Run seed.js first.");
    process.exit(1);
  }

  // Get first admission for metadata (knowledge base docs are global but must reference an admission)
  let firstAdmission = await prisma.admission.findFirst();

  if (!firstAdmission) {
    console.error("❌ No admissions found. Run seed.js first.");
    process.exit(1);
  }

  let successCount = 0;
  let skipCount = 0;

  for (const doc of KNOWLEDGE_DOCS) {
    const filePath = path.join(KNOWLEDGE_BASE_DIR, doc.filename);

    // Skip if file doesn't exist
    if (!fs.existsSync(filePath)) {
      console.warn(`⊘  Skipped: ${doc.filename} (file not found)`);
      skipCount++;
      continue;
    }

    try {
      // Check if already exists
      const existing = await prisma.medicalDocument.findFirst({
        where: {
          originalFilename: doc.filename,
          isKnowledgeBase: true,
        },
      });

      // Delete old version from Cloudinary if it exists
      if (existing && existing.cloudinaryPublicId) {
        try {
          console.log(`🗑️  Removing old version from Cloudinary...`);
          await deleteFromCloudinary(existing.cloudinaryPublicId);
          console.log(`   ✓ Old version deleted`);
        } catch (err) {
          console.warn(
            `   ⚠️  Could not delete from Cloudinary: ${err.message}`,
          );
        }
      }

      // Upload new version to Cloudinary
      console.log(`⬆️  Uploading ${doc.filename} to Cloudinary...`);
      const fileBuffer = fs.readFileSync(filePath);
      const cloudinaryResult = await uploadToCloudinary(
        fileBuffer,
        doc.filename,
      );

      console.log(
        `   → URL: ${cloudinaryResult.secure_url.substring(0, 60)}...`,
      );

      // Save or update in database
      const created = await prisma.medicalDocument.upsert({
        where: { id: existing?.id || "" },
        create: {
          admissionId: firstAdmission.id,
          uploadedBy: admin.id,
          documentType: doc.docType,
          originalFilename: doc.filename,
          mimeType: "application/pdf",
          fileSize: fileBuffer.length,
          isKnowledgeBase: true,
          storageType: "cloudinary",
          cloudinaryUrl: cloudinaryResult.secure_url,
          cloudinaryPublicId: cloudinaryResult.public_id,
          embeddingStatus: "PENDING",
        },
        update: {
          storageType: "cloudinary",
          cloudinaryUrl: cloudinaryResult.secure_url,
          cloudinaryPublicId: cloudinaryResult.public_id,
          embeddingStatus: "PENDING",
        },
      });

      console.log(
        `✓ Registered: ${doc.displayName} (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB)`,
      );

      // Embed synchronously (awaited, not queued) — this script exits and
      // disconnects Prisma right after, so a fire-and-forget queueIndexing()
      // call would get killed mid-write before it ever reaches COMPLETED.
      console.log(`   🧠 Embedding...`);
      const outcome = await indexDocument(created.id);
      console.log(
        `   → ${outcome.status}: ${outcome.message || `${outcome.chunkCount} chunks`}\n`,
      );

      successCount++;
    } catch (error) {
      console.error(`✗ Failed: ${doc.filename}`);
      console.error(`  Error: ${error.message}\n`);
    }
  }

  console.log("\n📊 Knowledge Base Seeding Summary:");
  console.log(`   ✓ Uploaded & embedded: ${successCount}`);
  console.log(`   ⊘ Skipped: ${skipCount}\n`);

  await prisma.$disconnect();
}

seedKnowledgeBase().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
