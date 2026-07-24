import api from '@/lib/api';

export const patientsService = {
  // fetch all active admissions in the ICU. 
  async getActiveAdmissions() {
    const { data } = await api.get('/admissions?status=ACTIVE');
    return data.data || [];
  },

  // fetch latest vital signs for a specific admission. 
  async getLatestVitals(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/vitals?limit=1`);
    return data?.[0] || null;
  },

  // fetch all active diagnoses for a specific admission. 
  async getDiagnoses(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/diagnoses`);
    return data || [];
  },

  // fetch all nurse assignments for a specific admission.
  async getAdmissionNurses(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/nurses`);
    return data || [];
  }
};
