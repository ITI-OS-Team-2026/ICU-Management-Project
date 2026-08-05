import axios from 'axios';
import { useAuthStore } from '../features/store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // Crucial for sending/receiving HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Routes that probe auth state on purpose and handle a 401 themselves — the
// public landing page calls GET /auth/me to decide whether to redirect a
// signed-in visitor to /dashboard, and an unauthenticated 401 there is the
// expected, silent case, not a session failure to bounce the user out of.
const PUBLIC_PATHS = ['/login', '/'];

// Response interceptor to handle global errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If the error is a 401 and we're not on a route that expects one, redirect.
    if (error.response && error.response.status === 401) {
      if (!PUBLIC_PATHS.includes(window.location.pathname)) {
        console.warn("Unauthorized access detected (401). Redirecting to login.");
        // Clear zustand session so route loaders don't think we are still logged in
        useAuthStore.getState().clearUser();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
