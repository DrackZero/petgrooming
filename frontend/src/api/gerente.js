import api from './client.js';

export const getMyClinic = () => api.get('/gerente/clinic').then((r) => r.data);
