import axios from 'axios';

// Cliente axios central. withCredentials envía la cookie httpOnly del JWT.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

export default api;
