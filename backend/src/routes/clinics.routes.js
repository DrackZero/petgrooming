import { Router } from 'express';
import { listActiveClinics } from '../controllers/clinics.controller.js';

const router = Router();

// Público: usado por el registro de veterinario para elegir clínica.
router.get('/active', listActiveClinics);

export default router;
