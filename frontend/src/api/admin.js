import api from './client.js';

// Estadísticas
export const getStats = () => api.get('/admin/stats').then((r) => r.data);

// Productos
export const createProduct = (data) => api.post('/admin/products', data).then((r) => r.data);
export const updateProduct = (id, data) => api.put(`/admin/products/${id}`, data).then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/admin/products/${id}`).then((r) => r.data);

// Cursos
export const createCourse = (data) => api.post('/admin/courses', data).then((r) => r.data);
export const updateCourse = (id, data) => api.put(`/admin/courses/${id}`, data).then((r) => r.data);

// Slots
export const createSlot = (data) => api.post('/admin/slots', data).then((r) => r.data);
export const deleteSlot = (id) => api.delete(`/admin/slots/${id}`).then((r) => r.data);

// Citas
export const getAllAppointments = () => api.get('/admin/appointments').then((r) => r.data);
export const updateAppointmentStatus = (id, status) =>
  api.patch(`/admin/appointments/${id}`, { status }).then((r) => r.data);

// Pedidos
export const getAllOrders = () => api.get('/admin/orders').then((r) => r.data);
export const updateOrderStatus = (id, status) =>
  api.patch(`/admin/orders/${id}`, { status }).then((r) => r.data);

// Clientes
export const getClients = () => api.get('/admin/clients').then((r) => r.data);
