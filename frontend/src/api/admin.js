import api from './client.js';

// Estadísticas / reportes
export const getStats = () => api.get('/admin/stats').then((r) => r.data);
export const getReports = (params) =>
  api.get('/admin/reports', { params }).then((r) => r.data);

// Usuarios y roles
export const getUsers = () => api.get('/admin/users').then((r) => r.data);
export const assignVetRole = (id) => api.patch(`/admin/users/${id}/vet`).then((r) => r.data);
export const getVetRequests = () => api.get('/admin/vet-requests').then((r) => r.data);
export const rejectVetRequest = (id) =>
  api.patch(`/admin/vet-requests/${id}/reject`).then((r) => r.data);

// Clientes
export const getClients = () => api.get('/admin/clients').then((r) => r.data);
export const setClientActive = (id, is_active) =>
  api.patch(`/admin/clients/${id}/active`, { is_active }).then((r) => r.data);

// Productos
export const createProduct = (data) => api.post('/admin/products', data).then((r) => r.data);
export const updateProduct = (id, data) => api.put(`/admin/products/${id}`, data).then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/admin/products/${id}`).then((r) => r.data);

// Cursos
export const createCourse = (data) => api.post('/admin/courses', data).then((r) => r.data);
export const updateCourse = (id, data) => api.put(`/admin/courses/${id}`, data).then((r) => r.data);

// Pedidos (alertas, solo lectura)
export const getAllOrders = () => api.get('/admin/orders').then((r) => r.data);
