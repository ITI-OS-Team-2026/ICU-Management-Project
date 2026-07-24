import api from '@/lib/api';

export const bedsService = {
  async getBeds(status) {
    const params = status ? { status } : {};
    const { data } = await api.get('/admin/beds', { params });
    return data;
  },

  async updateBedStatus(id, status) {
    const { data } = await api.patch(`/admin/beds/${id}`, { status });
    return data;
  }
};
