// Maps legacy / free-text dosing frequencies onto the MedicationFrequency enum.
//
// This mirrors the backfill in migration 20260804090000 and is what the seed
// scripts use, so seeded data and migrated data end up in the same shape.
// Anything unrecognised becomes OTHER and keeps its original wording, which is
// always safer than guessing a schedule the prescriber did not write.

const EXACT = {
  OD: 'OD',
  QD: 'OD',
  DAILY: 'OD',
  ONCE: 'OD',
  'ONCE DAILY': 'OD',
  'ONCE A DAY': 'OD',
  Q24H: 'OD',
  QHS: 'OD', // nightly — one dose a day
  BD: 'BD',
  BID: 'BD',
  'TWICE DAILY': 'BD',
  'TWICE A DAY': 'BD',
  TDS: 'TDS',
  TID: 'TDS',
  'THREE TIMES DAILY': 'TDS',
  QDS: 'QDS',
  QID: 'QDS',
  'FOUR TIMES DAILY': 'QDS',
  Q4H: 'Q4H',
  Q6H: 'Q6H',
  Q8H: 'Q8H',
  Q12H: 'Q12H',
  PRN: 'PRN',
  'AS NEEDED': 'PRN',
  'AS REQUIRED': 'PRN',
  STAT: 'STAT',
  IMMEDIATELY: 'STAT',
  CONTINUOUS: 'CONTINUOUS',
  INFUSION: 'CONTINUOUS',
  'CONTINUOUS INFUSION': 'CONTINUOUS',
};

/**
 * @param {string} raw - free-text frequency, e.g. "BID" or "PRN for ICP >20"
 * @returns {{ frequency: string, frequencyText: string|null }}
 */
function normalizeFrequency(raw) {
  const text = (raw || '').trim();
  if (!text) return { frequency: 'OTHER', frequencyText: null };

  const key = text.toUpperCase();
  if (EXACT[key]) return { frequency: EXACT[key], frequencyText: null };

  // Conditional orders ("PRN for K <4.5", "Q8H PRN") are as-needed by nature;
  // the condition itself is preserved as the free text.
  if (/\bPRN\b/.test(key)) return { frequency: 'PRN', frequencyText: text };
  if (/CONTINUOUS|INFUSION|DRIP/.test(key)) return { frequency: 'CONTINUOUS', frequencyText: text };

  return { frequency: 'OTHER', frequencyText: text };
}

// Seed data records the route inside the dose string ("2g IV", "90mg PO").
const ROUTE_PATTERNS = [
  [/\bIV\b|mL\/hr|mcg\/kg\/min|units\/hr/i, 'IV'],
  [/\bPO\b|\borally\b/i, 'PO'],
  [/\bIM\b/i, 'IM'],
  [/\bSC\b|subcut/i, 'SC'],
  [/\bINH\b|nebul|inhal/i, 'INH'],
  [/\bNG\b/i, 'NG'],
  [/\bPR\b|rectal/i, 'PR'],
  [/topical/i, 'TOPICAL'],
];

/** Best-effort route from a dose string; null when nothing is stated. */
function inferRoute(dosage) {
  const text = dosage || '';
  const match = ROUTE_PATTERNS.find(([pattern]) => pattern.test(text));
  return match ? match[1] : null;
}

module.exports = { normalizeFrequency, inferRoute };
