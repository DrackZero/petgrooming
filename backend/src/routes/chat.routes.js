import { Router } from 'express';
import {
  listVetsForChat,
  listConversations,
  createConversation,
  listMessages,
  sendMessage,
  closeConversation,
} from '../controllers/chat.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authRequired);

router.get('/vets', listVetsForChat);
router.get('/conversations', listConversations);
router.post('/conversations', requireRole('cliente'), createConversation);
router.get('/conversations/:id/messages', listMessages);
router.post('/conversations/:id/messages', sendMessage);
router.patch('/conversations/:id/close', closeConversation);

export default router;
