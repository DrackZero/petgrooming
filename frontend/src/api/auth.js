import api from './client.js';

export const registerReq = (data) => api.post('/auth/register', data).then((r) => r.data);
export const loginReq = (data) => api.post('/auth/login', data).then((r) => r.data);
export const logoutReq = () => api.post('/auth/logout').then((r) => r.data);
export const meReq = () => api.get('/auth/me').then((r) => r.data);
