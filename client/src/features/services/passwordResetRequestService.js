import api from '@/lib/api';

export const passwordResetRequestService = {
  // User: submit a new request
  async createRequest(message) {
    const { data } = await api.post('/password-reset-requests', { message });
    return data;
  },

  // Guest: submit a request from the login page — no session required.
  async createPublicRequest(email, message) {
    const { data } = await api.post('/password-reset-requests/public', { email, message });
    return data;
  },

  // User: get own requests (with admin replies)
  async getMyRequests() {
    const { data } = await api.get('/password-reset-requests/my');
    return data;
  },

  // User: mark all resolved replies as seen
  async markSeen() {
    await api.post('/password-reset-requests/mark-seen');
  },

  // User: get unseen reply count for sidebar badge
  async getUnseenCount() {
    const { data } = await api.get('/password-reset-requests/unseen-count');
    return data.count;
  },

  // Admin: get all requests with pagination, status filter, and search
  async getAllRequests(params = {}) {
    const queryParams = typeof params === 'string' ? { status: params } : params;
    const { data } = await api.get('/admin/password-reset-requests', { params: queryParams });
    return data;
  },

  // Admin: get pending count for badge
  async getPendingCount() {
    const { data } = await api.get('/admin/password-reset-requests/pending-count');
    return data.count;
  },

  // Admin: resolve a request
  async resolveRequest(id, adminReply) {
    const { data } = await api.post(`/admin/password-reset-requests/${id}/resolve`, { adminReply });
    return data;
  },
};
