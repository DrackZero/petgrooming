import api from './client.js';

// Mi clínica
export const getMyClinic = () => api.get('/gerente/clinic').then((r) => r.data);
export const updateMyClinic = (data) => api.put('/gerente/clinic', data).then((r) => r.data);

// Mis veterinarios
export const getVetRequests = () => api.get('/gerente/vet-requests').then((r) => r.data);
export const approveVet = (id) =>
  api.patch(`/gerente/vet-requests/${id}/approve`).then((r) => r.data);
export const rejectVet = (id) =>
  api.patch(`/gerente/vet-requests/${id}/reject`).then((r) => r.data);
export const getMyVets = () => api.get('/gerente/vets').then((r) => r.data);
export const setMyVetActive = (id, is_active) =>
  api.patch(`/gerente/vets/${id}/active`, { is_active }).then((r) => r.data);

// Mis reportes
export const getMyReports = () => api.get('/gerente/reports').then((r) => r.data);
