-- CreateEnum
CREATE TYPE "AiSummaryType" AS ENUM ('24_HOUR', 'ON_DEMAND');

-- CreateTable
CREATE TABLE "ai_summaries" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "summary_type" "AiSummaryType" NOT NULL,
    "overall_summary" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "ai_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_query_logs" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "asked_by" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "ai_response" TEXT NOT NULL,
    "cited_sources" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_summaries_admission_id_idx" ON "ai_summaries"("admission_id");

-- CreateIndex
CREATE INDEX "ai_summaries_requested_by_idx" ON "ai_summaries"("requested_by");

-- CreateIndex
CREATE INDEX "ai_summaries_generated_at_idx" ON "ai_summaries"("generated_at");

-- CreateIndex
CREATE INDEX "ai_query_logs_admission_id_idx" ON "ai_query_logs"("admission_id");

-- CreateIndex
CREATE INDEX "ai_query_logs_asked_by_idx" ON "ai_query_logs"("asked_by");

-- CreateIndex
CREATE INDEX "ai_query_logs_created_at_idx" ON "ai_query_logs"("created_at");

-- AddForeignKey
ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_query_logs" ADD CONSTRAINT "ai_query_logs_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_query_logs" ADD CONSTRAINT "ai_query_logs_asked_by_fkey" FOREIGN KEY ("asked_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
