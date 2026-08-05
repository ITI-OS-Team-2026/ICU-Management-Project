-- AlterTable: make file_path nullable (Cloudinary uploads have no local path)
ALTER TABLE "medical_documents" ALTER COLUMN "file_path" DROP NOT NULL;

-- AlterTable: add cloud storage columns (already declared in medicalDocument.prisma)
ALTER TABLE "medical_documents"
  ADD COLUMN IF NOT EXISTS "is_knowledge_base"    BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "storage_type"         VARCHAR(50)  NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS "cloudinary_url"        TEXT,
  ADD COLUMN IF NOT EXISTS "cloudinary_public_id"  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "file_content"          BYTEA;
