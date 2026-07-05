import axios from 'axios';

// Cliente axios central. withCredentials envía las cookies httpOnly (access + refresh).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

// Renovación automática del access token.
// Si una petición responde 401, intenta /auth/refresh UNA vez y reintenta.
let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const url = original?.url || '';

    const isAuthCall = url.includes('/auth/refresh') || url.includes('/auth/login');

    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        // Deduplica refrescos concurrentes en una sola llamada.
        refreshing = refreshing || api.post('/auth/refresh');
        await refreshing;
        refreshing = null;
        return api(original); // reintenta la petición original
      } catch (refreshErr) {
        refreshing = null;
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
