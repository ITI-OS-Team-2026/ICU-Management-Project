/**
 * Clinical display thresholds and derived vital helpers.
 *
 * These preserve the thresholds that were already used by the admission and
 * patient-vitals screens, while keeping their display semantics in one place.
 * API readings use camelCase; admission-form values use the snake_case keys
 * exported in VITAL_NORMAL_RANGES.
 */

export const VITAL_NORMAL_RANGES = Object.freeze({
  temperature: { min: 36, max: 38.5 },
  pulse: { min: 40, max: 140 },
  systolic_bp: { min: 80, max: 180 },
  diastolic_bp: { min: 50, max: 110 },
  respiratory_rate: { min: 8, max: 30 },
  spo2: { min: 85, max: 100 },
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

export function getMeanArterialPressure(record) {
  const systolic = toFiniteNumber(record?.systolicBp);
  const diastolic = toFiniteNumber(record?.diastolicBp);

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
        criticalLow: 35.5,
        criticalHigh: 39,
        high: 38,
        low: 36,
      });
    case 'pulse':
      return getSingleValueStatus(toFiniteNumber(value), {
        criticalLow: 45,
        criticalHigh: 130,
        high: 100,
        low: 55,
      });
    case 'spo2':
      return getSingleValueStatus(toFiniteNumber(value), {
        criticalLow: 90,
        criticalHigh: 100,
        low: 95,
      });
    case 'respiratoryRate':
      return getSingleValueStatus(toFiniteNumber(value), {
        criticalLow: 8,
        criticalHigh: 30,
        high: 24,
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
      const systolic = toFiniteNumber(record?.systolicBp);
      const diastolic = toFiniteNumber(record?.diastolicBp);
      if (systolic === null || diastolic === null) return CLINICAL_STATUS.unknown;
      if (systolic < 85 || systolic > 180 || diastolic < 50 || diastolic > 110) {
        return CLINICAL_STATUS.critical;
      }
      if (systolic > 140 || diastolic > 90) return CLINICAL_STATUS.high;
      if (systolic < 95 || diastolic < 60) return CLINICAL_STATUS.low;
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
    getVitalStatus('respiratoryRate', record?.respiratoryRate, record),
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
    .filter((record) => Number.isFinite(new Date(record?.recordedAt).getTime()))
    .sort((first, second) => {
    const firstTime = new Date(first?.recordedAt).getTime();
    const secondTime = new Date(second?.recordedAt).getTime();
    return firstTime - secondTime;
  });
}
