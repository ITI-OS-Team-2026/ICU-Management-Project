-- Diagnosis workflow: differential statuses, classification, outcome trail,
-- nurse acknowledgement and nursing concerns.

-- CreateEnum
CREATE TYPE "DiagnosisType" AS ENUM ('PRIMARY', 'SECONDARY', 'COMORBIDITY', 'COMPLICATION');

-- CreateEnum
CREATE TYPE "ConcernStatus" AS ENUM ('OPEN', 'ADDRESSED', 'DISMISSED');

-- Replace the status enum. ACTIVE carried no information about whether the
-- condition was proven, and every existing row was entered by a doctor as a
-- working diagnosis, so it becomes CONFIRMED rather than SUSPECTED.
CREATE TYPE "DiagnosisStatus_new" AS ENUM ('SUSPECTED', 'CONFIRMED', 'RULED_OUT', 'RESOLVED');

ALTER TABLE "diagnoses" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "diagnoses"
  ALTER COLUMN "status" TYPE "DiagnosisStatus_new"
  USING (CASE WHEN "status"::text = 'ACTIVE' THEN 'CONFIRMED' ELSE "status"::text END)::"DiagnosisStatus_new";

DROP TYPE "DiagnosisStatus";
ALTER TYPE "DiagnosisStatus_new" RENAME TO "DiagnosisStatus";

ALTER TABLE "diagnoses" ALTER COLUMN "status" SET DEFAULT 'SUSPECTED';

-- AlterTable
ALTER TABLE "diagnoses"
  ADD COLUMN "icd_code" VARCHAR(20),
  ADD COLUMN "type" "DiagnosisType" NOT NULL DEFAULT 'SECONDARY',
  ADD COLUMN "clinical_notes" TEXT,
  ADD COLUMN "onset_date" TIMESTAMP(3),
  ADD COLUMN "original_diagnosed_by" TEXT,
  ADD COLUMN "ruled_out_reason" TEXT,
  ADD COLUMN "resolved_at" TIMESTAMP(3),
  ADD COLUMN "resolution_reason" TEXT,
  ADD COLUMN "status_changed_by" TEXT;

-- Existing diagnoses were authored by their current diagnostician.
UPDATE "diagnoses" SET "original_diagnosed_by" = "diagnosed_by";

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_original_diagnosed_by_fkey" FOREIGN KEY ("original_diagnosed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_status_changed_by_fkey" FOREIGN KEY ("status_changed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "diagnosis_acknowledgements" (
    "id" TEXT NOT NULL,
    "diagnosis_id" TEXT NOT NULL,
    "nurse_id" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnosis_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diagnosis_acknowledgements_diagnosis_id_idx" ON "diagnosis_acknowledgements"("diagnosis_id");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_acknowledgements_diagnosis_id_nurse_id_key" ON "diagnosis_acknowledgements"("diagnosis_id", "nurse_id");

-- AddForeignKey
ALTER TABLE "diagnosis_acknowledgements" ADD CONSTRAINT "diagnosis_acknowledgements_diagnosis_id_fkey" FOREIGN KEY ("diagnosis_id") REFERENCES "diagnoses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_acknowledgements" ADD CONSTRAINT "diagnosis_acknowledgements_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "diagnosis_concerns" (
    "id" TEXT NOT NULL,
    "diagnosis_id" TEXT NOT NULL,
    "raised_by" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "status" "ConcernStatus" NOT NULL DEFAULT 'OPEN',
    "response_note" TEXT,
    "responded_by" TEXT,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnosis_concerns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diagnosis_concerns_diagnosis_id_idx" ON "diagnosis_concerns"("diagnosis_id");

-- CreateIndex
CREATE INDEX "diagnosis_concerns_status_idx" ON "diagnosis_concerns"("status");

-- AddForeignKey
ALTER TABLE "diagnosis_concerns" ADD CONSTRAINT "diagnosis_concerns_diagnosis_id_fkey" FOREIGN KEY ("diagnosis_id") REFERENCES "diagnoses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_concerns" ADD CONSTRAINT "diagnosis_concerns_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_concerns" ADD CONSTRAINT "diagnosis_concerns_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
