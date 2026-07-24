-- =====================================================================
-- Migration: fix_admission_flow
-- Description:
--   1. Rename admissions.admission_reason → transfer_reason
--   2. Add admissions.complaint_analysis (TEXT)
--   3. Convert admissions.previous_investigations TEXT → JSONB
--   4. Add medical_histories.free_text (TEXT)
--   5. Add medical_histories.custom_fields (JSONB)
-- =====================================================================

-- 1. Rename admission_reason to transfer_reason
ALTER TABLE "admissions" RENAME COLUMN "admission_reason" TO "transfer_reason";

-- 2. Add complaint_analysis column
ALTER TABLE "admissions" ADD COLUMN "complaint_analysis" TEXT;

-- 3. Convert previous_investigations from TEXT to JSONB
--    Existing text data is preserved in the "labs" key.
ALTER TABLE "admissions"
  ALTER COLUMN "previous_investigations" TYPE JSONB
  USING CASE
    WHEN "previous_investigations" IS NULL THEN NULL
    ELSE jsonb_build_object('labs', "previous_investigations", 'radiology', NULL)
  END;

-- 4. Add free_text column to medical_histories
ALTER TABLE "medical_histories" ADD COLUMN "free_text" TEXT;

-- 5. Add custom_fields column to medical_histories
ALTER TABLE "medical_histories" ADD COLUMN "custom_fields" JSONB;
