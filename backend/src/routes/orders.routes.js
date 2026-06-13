import { Router } from 'express';
import {
  listProducts,
  listOrders,
  createOrder,
} from '../controllers/orders.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/products', listProducts); // catálogo público
router.get('/', authRequired, listOrders);
router.post('/', authRequired, createOrder);

export default router;
