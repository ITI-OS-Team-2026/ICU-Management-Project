import api from '@/lib/api';

export const dashboardService = {
  async getActiveAdmissions(params = {}) {
    const { data } = await api.get('/admissions', {
      params: { status: 'ACTIVE', limit: 100, ...params },
    });
    return data.data || [];
  },

  async getPendingInvestigations(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/investigation-orders`);
    return data.filter(order => order.status === 'Pending') || [];
  },

  async askAiAssistant(admissionId, question) {
    const { data } = await api.post('/ai/query', {
      admission_id: admissionId,
      question: question,
      include_history: true
    });
    return data;
  }
};
