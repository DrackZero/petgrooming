import api from './client.js';

export const getChatVets = () => api.get('/chat/vets').then((r) => r.data);
export const getConversations = () => api.get('/chat/conversations').then((r) => r.data);
export const createConversation = (vet_id) =>
  api.post('/chat/conversations', { vet_id }).then((r) => r.data);
export const getMessages = (id) =>
  api.get(`/chat/conversations/${id}/messages`).then((r) => r.data);
export const sendChatMessage = (id, body) =>
  api.post(`/chat/conversations/${id}/messages`, { body }).then((r) => r.data);
export const closeConversation = (id) =>
  api.patch(`/chat/conversations/${id}/close`).then((r) => r.data);
