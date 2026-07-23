import api from '@/lib/api';

/**
 * Auth API — cookie-based JWT (HttpOnly `smartcare_token`).
 * Endpoints: POST /auth/login · POST /auth/logout · GET /auth/me
 */
export const authService = {
  async login({ email, password }) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  async logout() {
    await api.post('/auth/logout');
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

/** Map axios errors from auth endpoints to a user-facing message. */
export function getAuthErrorMessage(error) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message;

  if (status === 423) {
    return message || 'Account is locked. Please try again later.';
  }
  if (status === 429) {
    return message || 'Too many login attempts, please try again later.';
  }
  if (status === 401) {
    return message || 'Invalid credentials';
  }
  if (status === 400 && message) {
    return message;
  }
  if (!error?.response) {
    return 'Unable to reach the server. Check your connection and try again.';
  }
  return message || 'Something went wrong. Please try again.';
}
