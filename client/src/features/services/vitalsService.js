import api from '@/lib/api';

export const vitalsService = {
  async getVitalsHistory(admissionId, limit = 50) {
    const { data } = await api.get(`/admissions/${admissionId}/vitals?limit=${limit}`);
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
