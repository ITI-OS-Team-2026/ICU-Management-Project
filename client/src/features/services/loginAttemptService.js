import api from '@/lib/api';

export const loginAttemptService = {
  async getLoginAttempts(query = {}) {
    const { data } = await api.get('/admin/login-attempts', { params: query });
    return data;
  },

  // Takes the same `range` as the list above — the cards summarise exactly the
  // window the rows are drawn from, so the two can never disagree.
  async getLoginAttemptStats({ range } = {}) {
    const { data } = await api.get('/admin/login-attempts/stats', {
      params: range ? { range } : {},
    });
    return data;
  }
};
