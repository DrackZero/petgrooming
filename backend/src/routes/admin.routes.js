import { Router } from 'express';
import {
  getStats,
  getReports,
  listUsers, assignVetRole,
  listVetRequests, rejectVetRequest,
  listClients, setClientActive,
  listVets, setVetActive, setVetClinic,
  listClinics, createClinic, getAccessLog,
  createProduct, updateProduct, deleteProduct,
  createCourse, updateCourse,
  listAllOrders,
} from '../controllers/admin.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/role.middleware.js';

const router = Router();

// Todo el módulo admin requiere sesión + rol admin.
router.use(authRequired, adminOnly);

router.get('/stats', getStats);
router.get('/reports', getReports);

// Usuarios y roles
router.get('/users', listUsers);
router.patch('/users/:id/vet', assignVetRole);
router.get('/vet-requests', listVetRequests);
router.patch('/vet-requests/:id/reject', rejectVetRequest);

// Clientes
router.get('/clients', listClients);
router.patch('/clients/:id/active', setClientActive);

// Veterinarios
router.get('/vets', listVets);
router.patch('/vets/:id/active', setVetActive);
router.patch('/vets/:id/clinic', setVetClinic);

// Clínicas y auditoría
router.get('/clinics', listClinics);
router.post('/clinics', createClinic);
router.get('/access-log', getAccessLog);

// Productos
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Cursos
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);

// Pedidos (alertas)
router.get('/orders', listAllOrders);

export default router;
