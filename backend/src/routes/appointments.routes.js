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
  getCalendarSummary,
  getAgenda,
  vetCreateAppointment,
  updateAppointmentStatus,
} from '../controllers/appointments.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { vetOnly, requireActiveClinic } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authRequired);

// ─── Veterinario (rutas específicas primero) ───
router.get('/all', vetOnly, listAllAppointments);
router.get('/calendar', vetOnly, getCalendarSummary);
router.get('/agenda', vetOnly, getAgenda);
router.post('/slots', vetOnly, requireActiveClinic, createSlot);
router.post('/slots/bulk', vetOnly, requireActiveClinic, createSlotsBulk);
router.delete('/slots/:id', vetOnly, requireActiveClinic, deleteSlot);
router.post('/vet', vetOnly, requireActiveClinic, vetCreateAppointment);
router.patch('/:id/status', vetOnly, requireActiveClinic, updateAppointmentStatus);

// ─── Cliente ───
router.get('/', listMyAppointments);
router.get('/slots', listAvailableSlots);
router.post('/', createAppointment);
router.patch('/:id/reschedule', rescheduleAppointment);
router.patch('/:id/cancel', cancelAppointment);

export default router;
