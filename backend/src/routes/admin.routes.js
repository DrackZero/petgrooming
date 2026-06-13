import { Router } from 'express';
import {
  getStats,
  createProduct, updateProduct, deleteProduct,
  createCourse, updateCourse,
  createSlot, deleteSlot,
  listAllAppointments, updateAppointmentStatus,
  listAllOrders, updateOrderStatus,
  listClients,
} from '../controllers/admin.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/role.middleware.js';

const router = Router();

// Todo el módulo admin requiere sesión + rol admin.
router.use(authRequired, adminOnly);

router.get('/stats', getStats);

// Productos
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Cursos
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);

// Slots
router.post('/slots', createSlot);
router.delete('/slots/:id', deleteSlot);

// Citas
router.get('/appointments', listAllAppointments);
router.patch('/appointments/:id', updateAppointmentStatus);

// Pedidos
router.get('/orders', listAllOrders);
router.patch('/orders/:id', updateOrderStatus);

// Clientes
router.get('/clients', listClients);

export default router;
