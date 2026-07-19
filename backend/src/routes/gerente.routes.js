import { Router } from 'express';
import { getMyClinic } from '../controllers/gerente.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { managerOnly } from '../middlewares/role.middleware.js';

const router = Router();

// Todo el módulo del gerente requiere sesión + rol gerente.
router.use(authRequired, managerOnly);

router.get('/clinic', getMyClinic);

export default router;
