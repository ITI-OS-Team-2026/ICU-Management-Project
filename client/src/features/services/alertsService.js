import api from '../../lib/api';

export const alertsService = {
  async getAdmissionAlerts(admissionId, status) {
    const params = status ? { status } : {};
    const response = await api.get(`/admissions/${admissionId}/alerts`, { params });
    return response.data;
  },

  async getAllAlerts(status, severity) {
    const params = {};
    if (status) params.status = status;
    if (severity) params.severity = severity;
    const response = await api.get(`/alerts`, { params });
    return response.data;
  },

  async submitReview(alertId, data) {
    const response = await api.post(`/alerts/${alertId}/reviews`, data);
    return response.data;
  }
};
