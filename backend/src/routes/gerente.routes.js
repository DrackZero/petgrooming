import { Router } from 'express';
import {
  getMyClinic,
  updateMyClinic,
  listVetRequests,
  approveVet,
  rejectVet,
  listMyVets,
  setMyVetActive,
  getMyReports,
} from '../controllers/gerente.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { managerOnly } from '../middlewares/role.middleware.js';

const router = Router();

// Todo el módulo del gerente requiere sesión + rol gerente.
router.use(authRequired, managerOnly);

// Su clínica
router.get('/clinic', getMyClinic);
router.put('/clinic', updateMyClinic);

// Sus veterinarios
router.get('/vet-requests', listVetRequests);
router.patch('/vet-requests/:id/approve', approveVet);
router.patch('/vet-requests/:id/reject', rejectVet);
router.get('/vets', listMyVets);
router.patch('/vets/:id/active', setMyVetActive);

// Sus reportes
router.get('/reports', getMyReports);

export default router;
