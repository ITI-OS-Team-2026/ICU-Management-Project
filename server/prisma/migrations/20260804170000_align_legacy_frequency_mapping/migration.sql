-- Aligns the legacy frequency backfill with the shared normaliser in
-- src/modules/medications/medication.frequency.js. The first migration only
-- matched exact tokens, so ward shorthand like "Q24H", "QHS" and conditional
-- PRN orders ("PRN for ICP >20") were parked in OTHER. Those have a
-- well-defined meaning and should drive the dose schedule.

-- Nightly and 24-hourly are once-daily orders.
UPDATE "medications"
SET "frequency" = 'OD', "frequency_text" = NULL
WHERE "frequency" = 'OTHER'
  AND upper(trim("frequency_text")) IN ('Q24H', 'QHS');

-- Conditional orders are as-needed by nature. The condition itself is the part
-- the nurse must read, so the original wording is kept.
UPDATE "medications"
SET "frequency" = 'PRN'
WHERE "frequency" = 'OTHER'
  AND upper("frequency_text") ~ '(^|[^A-Z])PRN([^A-Z]|$)';

-- Drips and infusions run continuously.
UPDATE "medications"
SET "frequency" = 'CONTINUOUS'
WHERE "frequency" = 'OTHER'
  AND upper("frequency_text") ~ 'CONTINUOUS|INFUSION|DRIP';
