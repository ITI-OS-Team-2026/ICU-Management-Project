-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('ACTIVE', 'RESOLVED');

-- CreateTable
CREATE TABLE "diagnoses" (
    "id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "condition_name" VARCHAR(255) NOT NULL,
    "status" "DiagnosisStatus" NOT NULL DEFAULT 'ACTIVE',
    "diagnosed_by" TEXT NOT NULL,
    "diagnosed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diagnoses_admission_id_idx" ON "diagnoses"("admission_id");

-- CreateIndex
CREATE INDEX "diagnoses_diagnosed_by_idx" ON "diagnoses"("diagnosed_by");

-- CreateIndex
CREATE INDEX "diagnoses_status_idx" ON "diagnoses"("status");

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_diagnosed_by_fkey" FOREIGN KEY ("diagnosed_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
