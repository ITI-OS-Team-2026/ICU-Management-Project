-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('P0', 'P1');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED');

-- DropIndex
DROP INDEX "document_embeddings_embedding_hnsw_idx";

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "triggering_metrics" JSONB NOT NULL,
    "clinical_reasoning" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_reviews" (
    "id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "review_notes" TEXT,
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerts_admission_id_idx" ON "alerts"("admission_id");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alert_reviews_alert_id_idx" ON "alert_reviews"("alert_id");

-- CreateIndex
CREATE INDEX "alert_reviews_reviewer_id_idx" ON "alert_reviews"("reviewer_id");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_reviews" ADD CONSTRAINT "alert_reviews_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_reviews" ADD CONSTRAINT "alert_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
