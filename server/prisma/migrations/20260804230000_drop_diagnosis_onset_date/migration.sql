-- Onset was a second date competing with `diagnosed_at` for the same question,
-- and the ward answered it inconsistently. The diagnosis workflow now records
-- only when the condition was entered and, if it resolves, when that happened.
ALTER TABLE "diagnoses" DROP COLUMN "onset_date";
