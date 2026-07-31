-- AlterEnum
-- Adds the two lifecycle states used by the RAG indexing pipeline.
-- Postgres 12+ allows ADD VALUE inside a transaction as long as the new value is
-- not referenced by the same transaction — nothing below references them.
ALTER TYPE "EmbeddingStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "EmbeddingStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';

-- AlterTable
ALTER TABLE "medical_documents" ADD COLUMN     "chunk_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "embedded_at" TIMESTAMP(3),
ADD COLUMN     "embedding_error" TEXT,
ADD COLUMN     "embedding_model" VARCHAR(150),
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "mime_type" VARCHAR(150);

-- AlterTable
ALTER TABLE "document_embeddings" ADD COLUMN     "char_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "chunk_index" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "embedding_model" VARCHAR(150);

-- AlterColumn (pgvector)
-- Widen the embedding vector from 768 to 1024 dimensions. 1024 is the native output
-- width of the embedding models reachable through the Bedrock proxy (Titan Text
-- Embeddings V2, Cohere Embed v4) and of the built-in local fallback provider.
-- Safe as-is: any previously stored vector would be dimension-incompatible anyway,
-- so stale rows are dropped and the affected documents are queued for re-indexing.
DELETE FROM "document_embeddings";
UPDATE "medical_documents" SET "embedding_status" = 'PENDING', "chunk_count" = 0, "embedded_at" = NULL
WHERE "embedding_status" = 'COMPLETED';
ALTER TABLE "document_embeddings" ALTER COLUMN "embedding" TYPE vector(1024);

-- CreateIndex
CREATE INDEX "medical_documents_embedding_status_idx" ON "medical_documents"("embedding_status");

-- CreateIndex
CREATE UNIQUE INDEX "document_embeddings_document_id_chunk_index_key" ON "document_embeddings"("document_id", "chunk_index");

-- CreateIndex (pgvector HNSW, cosine distance — matches the `<=>` operator used by retrieval)
CREATE INDEX "document_embeddings_embedding_hnsw_idx"
  ON "document_embeddings" USING hnsw ("embedding" vector_cosine_ops);
