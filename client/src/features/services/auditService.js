import api from '@/lib/api';

export const auditService = {
  async getAuditLogs(query = {}) {
    const { data } = await api.get('/admin/audit-logs', { params: query });
    return data;
  },

  async getAuditLogStats() {
    const { data } = await api.get('/admin/audit-logs/stats');
    return data;
  }
};
