import api from './client.js';

export const getProducts = () => api.get('/orders/products').then((r) => r.data);
export const getOrders = () => api.get('/orders').then((r) => r.data);
// payload: { items: [{product_id, quantity}], payment_method, shipping_address }
export const createOrder = (payload) => api.post('/orders', payload).then((r) => r.data);
// Reintentar el pago de un pedido pendiente.
export const payOrder = (id) => api.get(`/orders/${id}/pay`).then((r) => r.data);
