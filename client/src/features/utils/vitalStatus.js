/**
 * Clinical display thresholds and derived vital helpers.
 *
 * Fully synchronized with certified clinical ICU standards and NEWS2 guidelines:
 * - Blood Pressure: Normal (90-120 / 60-80), Warning (121-139 or 80-89 / 81-89 or 50-59), Critical (>=180 or <80 / >=110 or <50)
 * - Pulse: Normal (60-100), Warning (50-59 or 101-140), Critical (<40 or >140)
 * - Temperature: Normal (36.5-37.4), Warning (37.5-38.5 or 35.0-36.4), Critical (>=40.6 or <35.0)
 * - Respiratory Rate: Normal (12-20), Warning (9-11 or 21-24), Critical (<8 or >=25)
 * - SpO2: Normal (95-100), Warning (91-94), Critical (<=90)
 */

export const VITAL_NORMAL_RANGES = Object.freeze({
  temperature: { min: 35.0, max: 40.5 },
  pulse: { min: 40, max: 140 },
  systolic_bp: { min: 80, max: 179 },
  diastolic_bp: { min: 50, max: 109 },
  respiratory_rate: { min: 8, max: 24 },
  spo2: { min: 91, max: 100 },
});

export const CLINICAL_STATUS = Object.freeze({
  unknown: {
    label: 'No data',
    colorClass: 'text-foreground',
    stroke: 'var(--foreground)',
    badgeVariant: 'outline',
  },
  critical: {
    label: 'Critical',
    colorClass: 'text-destructive',
    stroke: 'var(--destructive)',
    badgeVariant: 'destructive',
  },
  high: {
    label: 'High risk',
    colorClass: 'text-status-maintenance',
    stroke: 'var(--status-maintenance)',
    badgeVariant: 'outline',
  },
  low: {
    label: 'Low',
    colorClass: 'text-primary',
    stroke: 'var(--primary)',
    badgeVariant: 'outline',
  },
  normal: {
    label: 'Normal',
    colorClass: 'text-status-available',
    stroke: 'var(--status-available)',
    badgeVariant: 'secondary',
  },
});

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/**
 * Standardize measured temperature to core/oral reference temperature:
 * - Oral: Reference baseline (+0.0°C)
 * - Axillary (underarm): Add +0.5°C
 * - Rectal (core): Subtract -0.5°C
 */
export function calibrateTemperature(rawTemp, site = 'oral') {
  const temp = toFiniteNumber(rawTemp);
  if (temp === null) return null;
  if (site === 'axillary') return parseFloat((temp + 0.5).toFixed(1));
  if (site === 'rectal') return parseFloat((temp - 0.5).toFixed(1));
  return parseFloat(temp.toFixed(1));
}

export function getMeanArterialPressure(record) {
  const systolic = toFiniteNumber(record?.systolicBp ?? record?.systolic_bp);
  const diastolic = toFiniteNumber(record?.diastolicBp ?? record?.diastolic_bp);

  if (systolic === null || diastolic === null) return null;
  return Math.round(diastolic + (systolic - diastolic) / 3);
}

export function getVitalValue(record, key) {
  if (key === 'map') return getMeanArterialPressure(record);
  return toFiniteNumber(record?.[key]);
}

function getSingleValueStatus(value, { criticalLow, criticalHigh, high, low }) {
  if (value === null) return CLINICAL_STATUS.unknown;
  if (value < criticalLow || value > criticalHigh) return CLINICAL_STATUS.critical;
  if (high !== undefined && value > high) return CLINICAL_STATUS.high;
  if (low !== undefined && value < low) return CLINICAL_STATUS.low;
  return CLINICAL_STATUS.normal;
}

export function getVitalStatus(key, value, record) {
  switch (key) {
    case 'temperature':
      return getSingleValueStatus(toFiniteNumber(value), {
        criticalLow: 35.0,
        criticalHigh: 40.5,
        high: 37.4,
        low: 36.5,
      });
    case 'pulse':
      return getSingleValueStatus(toFiniteNumber(value), {
        criticalLow: 40,
        criticalHigh: 140,
        high: 100,
        low: 60,
      });
    case 'spo2':
      return getSingleValueStatus(toFiniteNumber(value), {
        criticalLow: 91,
        criticalHigh: 100,
        low: 95,
      });
    case 'respiratoryRate':
    case 'respiratory_rate':
      return getSingleValueStatus(toFiniteNumber(value), {
        criticalLow: 8,
        criticalHigh: 24,
        high: 20,
        low: 12,
      });
    case 'map':
      return getSingleValueStatus(toFiniteNumber(value), {
        criticalLow: 65,
        criticalHigh: 110,
        high: 100,
        low: 70,
      });
    case 'bloodPressure': {
      const systolic = toFiniteNumber(record?.systolicBp ?? record?.systolic_bp);
      const diastolic = toFiniteNumber(record?.diastolicBp ?? record?.diastolic_bp);
      if (systolic === null || diastolic === null) return CLINICAL_STATUS.unknown;
      
      // Critical / STAT Emergency
      if (systolic < 80 || systolic >= 180 || diastolic < 50 || diastolic >= 110) {
        return CLINICAL_STATUS.critical;
      }
      // Warning / Abnormal High
      if (systolic > 120 || diastolic > 80) return CLINICAL_STATUS.high;
      // Warning / Abnormal Low
      if (systolic < 90 || diastolic < 60) return CLINICAL_STATUS.low;
      // Stable / Normal
      return CLINICAL_STATUS.normal;
    }
    default:
      return CLINICAL_STATUS.unknown;
  }
}

export function getOverallVitalStatus(record) {
  const statuses = [
    getVitalStatus('temperature', record?.temperature, record),
    getVitalStatus('pulse', record?.pulse, record),
    getVitalStatus('bloodPressure', null, record),
    getVitalStatus('spo2', record?.spo2, record),
    getVitalStatus('respiratoryRate', record?.respiratoryRate ?? record?.respiratory_rate, record),
  ];

  return (
    statuses.find((status) => status === CLINICAL_STATUS.critical) ||
    statuses.find((status) => status === CLINICAL_STATUS.high) ||
    statuses.find((status) => status === CLINICAL_STATUS.low) ||
    statuses.find((status) => status === CLINICAL_STATUS.normal) ||
    CLINICAL_STATUS.unknown
  );
}

export function getChronologicalVitals(vitals) {
  return [...(vitals || [])]
    .filter((record) => Number.isFinite(new Date(record?.recordedAt || record?.recorded_at).getTime()))
    .sort((first, second) => {
    const firstTime = new Date(first?.recordedAt || first?.recorded_at).getTime();
    const secondTime = new Date(second?.recordedAt || second?.recorded_at).getTime();
    return firstTime - secondTime;
  });
}
