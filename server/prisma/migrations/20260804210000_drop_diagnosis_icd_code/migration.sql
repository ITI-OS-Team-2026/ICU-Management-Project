-- ICD-10 coding was dropped from the diagnosis workflow: clinicians enter the
-- condition in words, and a code the ward never reads is one more field to get
-- wrong. Removing the column rather than leaving it orphaned.
ALTER TABLE "diagnoses" DROP COLUMN "icd_code";
