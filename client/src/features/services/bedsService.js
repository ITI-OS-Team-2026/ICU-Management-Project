import api from '@/lib/api';

export const bedsService = {
  /**
   * Omit `pagination` to get every bed as a plain array; pass { page, limit }
   * to get a paginated { data, meta } payload from the server.
   */
  async getBeds(status, pagination, search) {
    const params = {
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
      ...(pagination || {}),
    };
    const { data } = await api.get('/admin/beds', { params });
    return data;
  },

  /** Ward-wide bed counts by status, independent of the current page. */
  async getBedStats() {
    const { data } = await api.get('/admin/beds/stats');
    return data;
  },

  async createBed(data) {
    const response = await api.post('/admin/beds', data);
    return response.data;
  },

  async updateBedStatus(id, status) {
    const { data } = await api.patch(`/admin/beds/${id}`, { status });
    return data;
  }
};
