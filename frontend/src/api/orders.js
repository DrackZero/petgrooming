import api from './client.js';

export const getProducts = () => api.get('/orders/products').then((r) => r.data);
export const getOrders = () => api.get('/orders').then((r) => r.data);
export const createOrder = (items) => api.post('/orders', { items }).then((r) => r.data);
