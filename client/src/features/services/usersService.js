import api from '@/lib/api';

export const usersService = {
  async getUsers(params = {}) {
    const { data } = await api.get('/admin/users', { params });
    return data.data;
  },

  async getUserStats() {
    const { data } = await api.get('/admin/users/stats');
    return data;
  },

  async createUser(userData) {
    const { data } = await api.post('/admin/users', userData);
    return data;
  },

  async updateUser(id, userData) {
    const { data } = await api.patch(`/admin/users/${id}`, userData);
    return data;
  },

  async deleteUser(id) {
    const { data } = await api.delete(`/admin/users/${id}`);
    return data;
  },

  async resetPassword(id, newPassword) {
    const { data } = await api.post(`/admin/users/${id}/reset-password`, { newPassword });
    return data;
  }
};
