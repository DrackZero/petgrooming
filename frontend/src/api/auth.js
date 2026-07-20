import api from './client.js';

export const registerReq = (data) => api.post('/auth/register', data).then((r) => r.data);
export const loginReq = (data) => api.post('/auth/login', data).then((r) => r.data);
export const logoutReq = () => api.post('/auth/logout').then((r) => r.data);
export const meReq = () => api.get('/auth/me').then((r) => r.data);
export const forgotPasswordReq = (email) =>
  api.post('/auth/forgot', { email }).then((r) => r.data);
export const resetPasswordReq = (token, password) =>
  api.post('/auth/reset', { token, password }).then((r) => r.data);
