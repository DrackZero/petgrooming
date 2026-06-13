import api from './client.js';

export const getAppointments = () => api.get('/appointments').then((r) => r.data);
export const getAvailableSlots = () => api.get('/appointments/slots').then((r) => r.data);
export const createAppointment = (data) => api.post('/appointments', data).then((r) => r.data);
export const cancelAppointment = (id) =>
  api.patch(`/appointments/${id}/cancel`).then((r) => r.data);
