import { Router } from 'express';
import {
  register, login, refresh, logout, me, forgotPassword, resetPassword,
} from '../controllers/auth.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot', forgotPassword);
router.post('/reset', resetPassword);
router.get('/me', authRequired, me);

export default router;
