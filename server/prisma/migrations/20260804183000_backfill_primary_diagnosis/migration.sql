-- Every pre-existing diagnosis defaulted to SECONDARY, leaving admissions with
-- no reason-for-admission marked. The seeder's convention — and the order the
-- ward records them in — is that the first condition entered is the primary, so
-- promote the earliest diagnosis on each admission.
--
-- Only touches admissions that have no PRIMARY at all, so any clinician's
-- explicit choice is left alone.
UPDATE "diagnoses" d
SET "type" = 'PRIMARY'
FROM (
  SELECT DISTINCT ON ("admission_id") "id"
  FROM "diagnoses"
  WHERE "is_archived" = false
    AND "status" IN ('SUSPECTED', 'CONFIRMED', 'RESOLVED')
    AND "admission_id" NOT IN (
      SELECT "admission_id" FROM "diagnoses"
      WHERE "type" = 'PRIMARY' AND "is_archived" = false
    )
  ORDER BY "admission_id", "diagnosed_at" ASC, "created_at" ASC
) AS earliest
WHERE d."id" = earliest."id";
