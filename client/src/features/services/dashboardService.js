import api from '@/lib/api';

export const dashboardService = {
  async getActiveAdmissions(params = {}) {
    const { data } = await api.get('/admissions', {
      params: { status: 'ACTIVE', limit: 100, ...params },
    });
    return data.data || [];
  },

  async getClinicalLogs(admissionId = null) {
    const { data } = await api.get('/admissions/clinical-logs', {
      params: admissionId ? { admissionId } : {}
    });
    return data || [];
  },

  // Pending investigation orders used to be fetched here, one request per
  // admission, then filtered client-side. They now arrive on each admission in
  // the list above as `pendingInvestigations`, already filtered by the query.

  // The AI assistant lives in `ragService` — see features/services/ragService.js.
};
