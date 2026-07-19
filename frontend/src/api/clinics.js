import api from './client.js';

// Clínicas activas (público) para elegir al registrarse como veterinario.
export const getActiveClinics = () => api.get('/clinics/active').then((r) => r.data);
