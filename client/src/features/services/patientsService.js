import api from "@/lib/api";

export const patientsService = {
  async getActiveAdmissions(params = {}) {
    const { data } = await api.get("/admissions", {
      params: { status: "ACTIVE", limit: 100, ...params },
    });
    return data.data || [];
  },

  async getAdmissionsPaginated(params = {}) {
    const { data } = await api.get("/admissions", {
      params,
    });
    return data;
  },

  async getActiveAdmissionsPaginated(params = {}) {
    return this.getAdmissionsPaginated({ status: "ACTIVE", ...params });
  },

  async getDischargedAdmissionsPaginated(params = {}) {
    return this.getAdmissionsPaginated({
      status: "DISCHARGED",
      readmitEligible: true,
      ...params,
    });
  },

  /** Ward-wide acuity counts and the list of bed units currently in use. */
  async getAdmissionCensus(status = "ACTIVE") {
    const { data } = await api.get("/admissions/census", {
      params: { status },
    });
    return (
      data?.data || {
        stats: { total: 0, critical: 0, watchful: 0, stable: 0 },
        units: [],
      }
    );
  },

  async getAdmissionById(id) {
    const { data } = await api.get(`/admissions/${id}`);
    return data;
  },

  async getPatientAdmissions(patientId) {
    const { data } = await api.get(`/patients/${patientId}/admissions`);
    return data || [];
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
  },

  async getClinicalNotes(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/notes/clinical`);
    return data?.data || [];
  },

  async getNursingNotes(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/notes/nursing`);
    return data?.data || [];
  },

  async createClinicalNote(admissionId, content) {
    const { data } = await api.post(
      `/admissions/${admissionId}/notes/clinical`,
      { content },
    );
    return data?.data;
  },

  async deleteClinicalNote(noteId) {
    await api.delete(`/notes/clinical/${noteId}`);
  },

  async deleteNursingNote(noteId) {
    await api.delete(`/notes/nursing/${noteId}`);
  },

  async updatePatient(patientId, payload) {
    const { data } = await api.patch(`/patients/${patientId}`, payload);
    return data;
  },
};
