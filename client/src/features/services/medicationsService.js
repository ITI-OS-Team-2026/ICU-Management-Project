import api from '@/lib/api';

// Shared vocabulary for every medication form in the app — the prescribe dialog
// and admission Step 8 must offer exactly what the API accepts.
export const FREQUENCY_OPTIONS = [
  { value: 'OD', label: 'OD — once daily', doses: '08:00' },
  { value: 'BD', label: 'BD — twice daily', doses: '08:00, 20:00' },
  { value: 'TDS', label: 'TDS — three times daily', doses: '08:00, 14:00, 20:00' },
  { value: 'QDS', label: 'QDS — four times daily', doses: '08:00, 12:00, 16:00, 20:00' },
  { value: 'Q4H', label: 'Q4H — every 4 hours', doses: 'every 4h from start' },
  { value: 'Q6H', label: 'Q6H — every 6 hours', doses: 'every 6h from start' },
  { value: 'Q8H', label: 'Q8H — every 8 hours', doses: 'every 8h from start' },
  { value: 'Q12H', label: 'Q12H — every 12 hours', doses: 'every 12h from start' },
  { value: 'PRN', label: 'PRN — as needed', doses: 'no fixed schedule' },
  { value: 'STAT', label: 'STAT — immediately, once', doses: 'single dose' },
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
