-- Medication ordering upgrade: structured frequency/route, prescriber lineage,
-- discontinuation trail, and allergy-override flag.

-- CreateEnum
CREATE TYPE "MedicationFrequency" AS ENUM ('OD', 'BD', 'TDS', 'QDS', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'PRN', 'STAT', 'CONTINUOUS', 'OTHER');

-- CreateEnum
CREATE TYPE "MedicationRoute" AS ENUM ('IV', 'PO', 'IM', 'SC', 'INH', 'TOPICAL', 'PR', 'NG');

-- Preserve every existing free-text frequency verbatim before structuring it.
ALTER TABLE "medications" RENAME COLUMN "frequency" TO "frequency_text";
ALTER TABLE "medications" ALTER COLUMN "frequency_text" DROP NOT NULL;

-- AlterTable
ALTER TABLE "medications"
  ADD COLUMN "frequency" "MedicationFrequency" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "route" "MedicationRoute",
  ADD COLUMN "instructions" TEXT,
  ADD COLUMN "original_prescriber_id" TEXT,
  ADD COLUMN "allergy_acknowledged" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "discontinued_by" TEXT,
  ADD COLUMN "discontinued_at" TIMESTAMP(3),
  ADD COLUMN "discontinue_reason" TEXT;

-- Backfill: map legacy free text onto the enum where it is unambiguous.
-- Anything unmatched stays OTHER and keeps its wording in frequency_text.
UPDATE "medications" SET "frequency" = CASE
  WHEN upper(trim("frequency_text")) IN ('OD', 'QD', 'DAILY', 'ONCE', 'ONCE DAILY', 'ONCE A DAY') THEN 'OD'
  WHEN upper(trim("frequency_text")) IN ('BD', 'BID', 'TWICE DAILY', 'TWICE A DAY') THEN 'BD'
  WHEN upper(trim("frequency_text")) IN ('TDS', 'TID', 'THREE TIMES DAILY', 'THRICE DAILY') THEN 'TDS'
  WHEN upper(trim("frequency_text")) IN ('QDS', 'QID', 'FOUR TIMES DAILY') THEN 'QDS'
  WHEN upper(trim("frequency_text")) IN ('Q4H', 'Q4', 'EVERY 4 HOURS') THEN 'Q4H'
  WHEN upper(trim("frequency_text")) IN ('Q6H', 'Q6', 'EVERY 6 HOURS') THEN 'Q6H'
  WHEN upper(trim("frequency_text")) IN ('Q8H', 'Q8', 'EVERY 8 HOURS') THEN 'Q8H'
  WHEN upper(trim("frequency_text")) IN ('Q12H', 'Q12', 'EVERY 12 HOURS') THEN 'Q12H'
  WHEN upper(trim("frequency_text")) IN ('PRN', 'AS NEEDED', 'AS REQUIRED') THEN 'PRN'
  WHEN upper(trim("frequency_text")) IN ('STAT', 'IMMEDIATELY', 'ONE OFF') THEN 'STAT'
  WHEN upper(trim("frequency_text")) IN ('CONTINUOUS', 'INFUSION', 'CONTINUOUS INFUSION') THEN 'CONTINUOUS'
  ELSE 'OTHER'
END::"MedicationFrequency";

-- Rows that mapped cleanly no longer need the free-text copy.
UPDATE "medications" SET "frequency_text" = NULL WHERE "frequency" <> 'OTHER';

-- Existing orders were all written by their current prescriber.
UPDATE "medications" SET "original_prescriber_id" = "prescribed_by";

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_original_prescriber_id_fkey" FOREIGN KEY ("original_prescriber_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_discontinued_by_fkey" FOREIGN KEY ("discontinued_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "medication_administrations_scheduled_time_idx" ON "medication_administrations"("scheduled_time");
