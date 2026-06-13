import { Router } from 'express';
import {
  listAppointments,
  listAvailableSlots,
  createAppointment,
  cancelAppointment,
} from '../controllers/appointments.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authRequired);

router.get('/', listAppointments);
router.get('/slots', listAvailableSlots);
router.post('/', createAppointment);
router.patch('/:id/cancel', cancelAppointment);

export default router;
