import api from './client.js';

export const getPets = () => api.get('/pets').then((r) => r.data);
export const getPet = (id) => api.get(`/pets/${id}`).then((r) => r.data);
export const createPet = (data) => api.post('/pets', data).then((r) => r.data);
export const updatePet = (id, data) => api.put(`/pets/${id}`, data).then((r) => r.data);
export const deletePet = (id) => api.delete(`/pets/${id}`).then((r) => r.data);
