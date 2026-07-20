-- CreateExtension (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "EmbeddingStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "medical_documents" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "file_path" TEXT NOT NULL,
    "embedding_status" "EmbeddingStatus" NOT NULL DEFAULT 'PENDING',
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_embeddings" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "chunk_text" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,

    CONSTRAINT "document_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medical_documents_admission_id_idx" ON "medical_documents"("admission_id");

-- CreateIndex
CREATE INDEX "medical_documents_uploaded_by_idx" ON "medical_documents"("uploaded_by");

-- CreateIndex
CREATE INDEX "document_embeddings_document_id_idx" ON "document_embeddings"("document_id");

-- CreateIndex
CREATE INDEX "document_embeddings_admission_id_idx" ON "document_embeddings"("admission_id");

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "medical_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
