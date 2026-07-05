import api from './client.js';

// ─── Cliente (solo lectura) ───
export const getPets = () => api.get('/pets').then((r) => r.data);
export const getPet = (id) => api.get(`/pets/${id}`).then((r) => r.data);
export const getPetHistory = (id) => api.get(`/pets/${id}/history`).then((r) => r.data);
export const getVaccines = (id) => api.get(`/pets/${id}/vaccines`).then((r) => r.data);

// ─── Veterinario (gestión) ───
export const getClientsForVet = () => api.get('/pets/clients').then((r) => r.data);
export const getAllPets = () => api.get('/pets/all').then((r) => r.data);
export const createPet = (data) => api.post('/pets', data).then((r) => r.data);
export const updatePet = (id, data) => api.put(`/pets/${id}`, data).then((r) => r.data);
export const addVaccine = (petId, data) =>
  api.post(`/pets/${petId}/vaccines`, data).then((r) => r.data);
export const deleteVaccine = (petId, vaccineId) =>
  api.delete(`/pets/${petId}/vaccines/${vaccineId}`).then((r) => r.data);
