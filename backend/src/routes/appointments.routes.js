import { Router } from 'express';
import {
  listMyAppointments,
  listAvailableSlots,
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  createSlot,
  createSlotsBulk,
  deleteSlot,
  listAllAppointments,
  getAgenda,
  vetCreateAppointment,
  updateAppointmentStatus,
} from '../controllers/appointments.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { vetOnly } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authRequired);

// ─── Veterinario (rutas específicas primero) ───
router.get('/all', vetOnly, listAllAppointments);
router.get('/agenda', vetOnly, getAgenda);
router.post('/slots', vetOnly, createSlot);
router.post('/slots/bulk', vetOnly, createSlotsBulk);
router.delete('/slots/:id', vetOnly, deleteSlot);
router.post('/vet', vetOnly, vetCreateAppointment);
router.patch('/:id/status', vetOnly, updateAppointmentStatus);

// ─── Cliente ───
router.get('/', listMyAppointments);
router.get('/slots', listAvailableSlots);
router.post('/', createAppointment);
router.patch('/:id/reschedule', rescheduleAppointment);
router.patch('/:id/cancel', cancelAppointment);

export default router;
