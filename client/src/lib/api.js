import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // Crucial for sending/receiving HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle global errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If the error is a 401 and we're not already on the login page, redirect.
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        console.warn("Unauthorized access detected (401). Redirecting to login.");
        // Clear zustand session by triggering a custom event or modifying localStorage directly if persisted.
        // Easiest is just redirecting, the route loader will try to fetch /auth/me, fail, and clear state.
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
