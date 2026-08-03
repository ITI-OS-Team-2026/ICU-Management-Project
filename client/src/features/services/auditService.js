import api from '@/lib/api';

export const auditService = {
  async getAuditLogs(query = {}) {
    const { data } = await api.get('/admin/audit-logs', { params: query });
    return data;
  },

  // Takes the same `range` as the list above — the cards summarise exactly the
  // window the rows are drawn from, so the two can never disagree.
  async getAuditLogStats({ range } = {}) {
    const { data } = await api.get('/admin/audit-logs/stats', {
      params: range ? { range } : {},
    });
    return data;
  }
};
