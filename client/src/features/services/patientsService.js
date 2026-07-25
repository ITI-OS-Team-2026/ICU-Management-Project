import api from '@/lib/api';

export const patientsService = {
  async getActiveAdmissions() {
    const { data } = await api.get('/admissions?status=ACTIVE');
    return data.data || [];
  },

  async getLatestVitals(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/vitals?limit=1`);
    return data?.[0] || null;
  },

  async getDiagnoses(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/diagnoses`);
    return data || [];
  },

  async getAdmissionNurses(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/nurses`);
    return data || [];
  }
};
