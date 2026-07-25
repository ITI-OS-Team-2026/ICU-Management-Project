import api from '@/lib/api';

export const dashboardService = {
  async getActiveAdmissions() {
    const { data } = await api.get('/admissions?status=ACTIVE');
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
