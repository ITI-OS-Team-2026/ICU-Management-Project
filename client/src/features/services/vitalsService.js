import api from '@/lib/api';

export const vitalsService = {
  /**
   * Fetch vitals history for an admission.
   * @param {string} admissionId
   * @param {{ limit?: number, from?: string, to?: string }} options
   */
  async getVitalsHistory(admissionId, options = {}) {
    const { limit, from, to } = options;
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const qs = params.toString();
    const { data } = await api.get(`/admissions/${admissionId}/vitals${qs ? `?${qs}` : ''}`);
    return Array.isArray(data) ? data : [];
  },

  async getLatestVitals(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/vitals?limit=1`);
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  },

  async updateVitalSign(vitalId, payload) {
    const { data } = await api.patch(`/vitals/${vitalId}`, payload);
    return data;
  },

  async deleteVitalSign(vitalId) {
    await api.delete(`/vitals/${vitalId}`);
  },
};
