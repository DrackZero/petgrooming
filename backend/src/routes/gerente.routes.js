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
  paySubscription,
  downgradeToBasico,
  toggleStore,
  listMyProducts, createMyProduct, updateMyProduct, deleteMyProduct,
  listMyCourses, createMyCourse, updateMyCourse,
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

// Su suscripción (pago por Wompi de la plataforma)
router.post('/subscription/pay', paySubscription);
router.post('/subscription/downgrade', downgradeToBasico);

// Su tienda (solo plan Pro)
router.patch('/store', toggleStore);
router.get('/products', listMyProducts);
router.post('/products', createMyProduct);
router.put('/products/:id', updateMyProduct);
router.delete('/products/:id', deleteMyProduct);
router.get('/courses', listMyCourses);
router.post('/courses', createMyCourse);
router.put('/courses/:id', updateMyCourse);

export default router;
