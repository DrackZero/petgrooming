import { Router } from 'express';
import { register, login, logout, me } from '../controllers/auth.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authRequired, me);

export default router;
