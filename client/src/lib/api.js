import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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
    // If the error is a 401 and we're not already on the login page, we might want to redirect.
    // The actual redirection is typically handled in the AuthStore or a top-level component, 
    // but returning a rejected promise allows the caller to handle it.
    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized access detected (401). Please log in again.");
      // Optional: trigger a custom event that authStore can listen to, or just let components handle it
    }
    
    return Promise.reject(error);
  }
);

export default api;
