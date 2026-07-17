import api from './client.js';

// ─── Cliente ───
export const getAppointments = () => api.get('/appointments').then((r) => r.data);
export const getAvailableSlots = (params) =>
  api.get('/appointments/slots', { params }).then((r) => r.data);
export const createAppointment = (data) => api.post('/appointments', data).then((r) => r.data);
export const rescheduleAppointment = (id, slot_id) =>
  api.patch(`/appointments/${id}/reschedule`, { slot_id }).then((r) => r.data);
export const cancelAppointment = (id) =>
  api.patch(`/appointments/${id}/cancel`).then((r) => r.data);

// ─── Veterinario ───
export const createSlot = (data) => api.post('/appointments/slots', data).then((r) => r.data);
export const createSlotsBulk = (data) => api.post('/appointments/slots/bulk', data).then((r) => r.data);
export const deleteSlot = (id) => api.delete(`/appointments/slots/${id}`).then((r) => r.data);
export const getAllAppointments = () => api.get('/appointments/all').then((r) => r.data);
export const getAgenda = (date) =>
  api.get('/appointments/agenda', { params: { date } }).then((r) => r.data);
export const vetCreateAppointment = (data) =>
  api.post('/appointments/vet', data).then((r) => r.data);
export const updateAppointmentStatus = (id, status, notes) =>
  api.patch(`/appointments/${id}/status`, { status, notes }).then((r) => r.data);
