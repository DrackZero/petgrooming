import api from './client.js';

// ─── Cliente ───
export const getPets = () => api.get('/pets').then((r) => r.data);
export const getPet = (id) => api.get(`/pets/${id}`).then((r) => r.data);
export const getPetHistory = (id) => api.get(`/pets/${id}/history`).then((r) => r.data);
export const getVaccines = (id) => api.get(`/pets/${id}/vaccines`).then((r) => r.data);
export const createMyPet = (data) => api.post('/pets/mine', data).then((r) => r.data);
export const requestPet = (data) => api.post('/pets/requests', data).then((r) => r.data);
export const getMyPetRequests = () => api.get('/pets/requests/mine').then((r) => r.data);

// ─── Historia clínica ───
export const getConsultations = (petId) =>
  api.get(`/pets/${petId}/consultations`).then((r) => r.data);
export const addConsultation = (petId, data) =>
  api.post(`/pets/${petId}/consultations`, data).then((r) => r.data);
export const deleteConsultation = (petId, id) =>
  api.delete(`/pets/${petId}/consultations/${id}`).then((r) => r.data);

// Descarga el PDF de la historia clínica y dispara el "Guardar como" del navegador.
export const downloadHistoryPdf = async (petId, petName = 'mascota') => {
  const res = await api.get(`/pets/${petId}/history.pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `historia-clinica-${petName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ─── Veterinario (solicitudes de mascota adicional) ───
export const getPetRequests = () => api.get('/pets/requests').then((r) => r.data);
export const approvePetRequest = (id) => api.patch(`/pets/requests/${id}/approve`).then((r) => r.data);
export const rejectPetRequest = (id) => api.patch(`/pets/requests/${id}/reject`).then((r) => r.data);

// ─── Veterinario (gestión) ───
export const getClientsForVet = () => api.get('/pets/clients').then((r) => r.data);
export const getAllPets = () => api.get('/pets/all').then((r) => r.data);
export const createPet = (data) => api.post('/pets', data).then((r) => r.data);
export const updatePet = (id, data) => api.put(`/pets/${id}`, data).then((r) => r.data);
export const addVaccine = (petId, data) =>
  api.post(`/pets/${petId}/vaccines`, data).then((r) => r.data);
export const deleteVaccine = (petId, vaccineId) =>
  api.delete(`/pets/${petId}/vaccines/${vaccineId}`).then((r) => r.data);
