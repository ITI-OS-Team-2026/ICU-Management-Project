import api from '@/lib/api';

export const patientsService = {
  async getActiveAdmissions(params = {}) {
    const { data } = await api.get('/admissions', {
      params: { status: 'ACTIVE', limit: 100, ...params },
    });
    return data.data || [];
  },

  async getAdmissionById(id) {
    const { data } = await api.get(`/admissions/${id}`);
    return data;
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
  },

  async getMedications(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/medications`);
    return data || [];
  },

  async getLabs(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/labs`);
    return data || [];
  },

  async getAllergies(patientId) {
    const { data } = await api.get(`/patients/${patientId}/allergies`);
    return data || [];
  },

  async getMedicalHistory(patientId) {
    const { data } = await api.get(`/patients/${patientId}/medical-history`);
    return data;
  }
};
