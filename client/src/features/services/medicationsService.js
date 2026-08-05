import api from '@/lib/api';

// Shared vocabulary for every medication form in the app — the prescribe dialog
// and admission Step 8 must offer exactly what the API accepts.
export const FREQUENCY_OPTIONS = [
  { value: 'OD', label: 'OD — once daily', doses: '08:00' },
  { value: 'BD', label: 'BD — twice daily', doses: '08:00, 20:00' },
  { value: 'TDS', label: 'TDS — three times daily', doses: '08:00, 14:00, 20:00' },
  { value: 'QDS', label: 'QDS — four times daily', doses: '08:00, 12:00, 16:00, 20:00' },
  { value: 'Q4H', label: 'Q4H — every 4 hours', doses: '00:00, 04:00, 08:00, 12:00, 16:00, 20:00' },
  { value: 'Q6H', label: 'Q6H — every 6 hours', doses: '00:00, 06:00, 12:00, 18:00' },
  { value: 'Q8H', label: 'Q8H — every 8 hours', doses: '00:00, 08:00, 16:00' },
  { value: 'Q12H', label: 'Q12H — every 12 hours', doses: '00:00, 12:00' },
  { value: 'PRN', label: 'PRN — as needed', doses: 'no fixed schedule' },
  { value: 'STAT', label: 'STAT — immediately, once', doses: 'a single dose' },
  { value: 'CONTINUOUS', label: 'Continuous infusion', doses: 'no fixed schedule' },
  { value: 'OTHER', label: 'Other (describe)', doses: 'no fixed schedule' },
];

export const ROUTE_OPTIONS = [
  { value: 'IV', label: 'IV — intravenous' },
  { value: 'PO', label: 'PO — oral' },
  { value: 'IM', label: 'IM — intramuscular' },
  { value: 'SC', label: 'SC — subcutaneous' },
  { value: 'INH', label: 'INH — inhaled' },
  { value: 'TOPICAL', label: 'Topical' },
  { value: 'PR', label: 'PR — rectal' },
  { value: 'NG', label: 'NG — nasogastric' },
];

// Frequencies that generate no due slots, so the UI can say so up front.
export const UNSCHEDULED_FREQUENCIES = ['PRN', 'CONTINUOUS', 'OTHER'];

/** Human label for an order's frequency, falling back to its free text. */
export function formatFrequency(medication) {
  if (medication?.frequency === 'OTHER') return medication.frequencyText || 'Other';
  return medication?.frequency || '—';
}

/** "2026-08-04" for a <input type="date">; empty when there is no date. */
export function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * A "YYYY-MM-DD" input value as an ISO instant at local midnight.
 *
 * `new Date("2026-08-04")` parses as UTC midnight, which lands on the previous
 * day for anyone west of Greenwich — the order would start a day early.
 */
export function dateInputToIso(value) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day).toISOString();
}

export const medicationsService = {
  async list(admissionId, params = {}) {
    const { data } = await api.get(`/admissions/${admissionId}/medications`, { params });
    return data || [];
  },

  /** The day's dose slots for every active order on this admission. */
  async getMar(admissionId, date) {
    const { data } = await api.get(`/admissions/${admissionId}/mar`, {
      params: date ? { date } : {},
    });
    return data;
  },

  async prescribe(admissionId, payload) {
    const { data } = await api.post(`/admissions/${admissionId}/medications`, payload);
    return data;
  },

  /** Amending archives the old order and returns a new one with a new id. */
  async update(medicationId, payload) {
    const { data } = await api.patch(`/medications/${medicationId}`, payload);
    return data;
  },

  async discontinue(medicationId, reason) {
    await api.delete(`/medications/${medicationId}`, {
      data: { discontinue_reason: reason },
    });
  },

  async getAdministrations(medicationId) {
    const { data } = await api.get(`/medications/${medicationId}/administrations`);
    return data || [];
  },

  async logAdministration(medicationId, payload) {
    const { data } = await api.post(`/medications/${medicationId}/administrations`, payload);
    return data;
  },

  async correctAdministration(administrationId, payload) {
    const { data } = await api.patch(`/medication-administrations/${administrationId}`, payload);
    return data;
  },
};
