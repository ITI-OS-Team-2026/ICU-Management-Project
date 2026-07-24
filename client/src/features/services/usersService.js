import api from '@/lib/api';

export const usersService = {
  async getUsers() {
    const { data } = await api.get('/admin/users');
    return data.data;
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
  }
};
