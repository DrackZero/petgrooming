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

// Mi suscripción (pago por Wompi de la plataforma)
export const paySubscription = (plan) =>
  api.post('/gerente/subscription/pay', { plan }).then((r) => r.data);
export const downgradePlan = () =>
  api.post('/gerente/subscription/downgrade').then((r) => r.data);

// Mi tienda (solo plan Pro)
export const toggleStore = (enabled) => api.patch('/gerente/store', { enabled }).then((r) => r.data);
export const getMyProducts = () => api.get('/gerente/products').then((r) => r.data);
export const createMyProduct = (data) => api.post('/gerente/products', data).then((r) => r.data);
export const updateMyProduct = (id, data) => api.put(`/gerente/products/${id}`, data).then((r) => r.data);
export const deleteMyProduct = (id) => api.delete(`/gerente/products/${id}`).then((r) => r.data);
export const getMyCourses = () => api.get('/gerente/courses').then((r) => r.data);
export const createMyCourse = (data) => api.post('/gerente/courses', data).then((r) => r.data);
export const updateMyCourse = (id, data) => api.put(`/gerente/courses/${id}`, data).then((r) => r.data);
