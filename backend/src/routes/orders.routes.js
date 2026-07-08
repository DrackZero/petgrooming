import { Router } from 'express';
import {
  listProducts,
  listOrders,
  createOrder,
  payOrder,
  wompiWebhook,
} from '../controllers/orders.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/products', listProducts); // catálogo público
router.post('/webhook', wompiWebhook); // eventos de Wompi (público, checksum)

router.get('/', authRequired, listOrders);
router.post('/', authRequired, createOrder);
router.get('/:id/pay', authRequired, payOrder); // reintentar pago pendiente

export default router;
