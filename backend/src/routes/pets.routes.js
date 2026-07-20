import { Router } from 'express';
import {
  listMyPets,
  getPet,
  getPetHistory,
  listVaccines,
  listClientsForVet,
  listAllPets,
  createPet,
  updatePet,
  addVaccine,
  deleteVaccine,
  createMyPet,
  createPetRequest,
  listMyPetRequests,
  listPetRequests,
  approvePetRequest,
  rejectPetRequest,
} from '../controllers/pets.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { vetOnly, clientOnly, requireActiveClinic } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authRequired); // todas requieren sesión

// Solicitudes de mascota adicional (antes de '/:id')
router.post('/requests', clientOnly, createPetRequest);
router.get('/requests/mine', clientOnly, listMyPetRequests);
router.get('/requests', vetOnly, listPetRequests);
router.patch('/requests/:id/approve', vetOnly, requireActiveClinic, approvePetRequest);
router.patch('/requests/:id/reject', vetOnly, rejectPetRequest);

// Registro de la primera mascota por el propio cliente (antes de '/:id')
router.post('/mine', clientOnly, createMyPet);

// Lectura (cliente dueño o veterinario)
router.get('/', listMyPets);
router.get('/clients', vetOnly, listClientsForVet); // antes de '/:id'
router.get('/all', vetOnly, listAllPets); // antes de '/:id'
router.get('/:id', getPet);
router.get('/:id/history', getPetHistory);
router.get('/:id/vaccines', listVaccines);

// Escritura — solo veterinario con clínica activa
router.post('/', vetOnly, requireActiveClinic, createPet);
router.put('/:id', vetOnly, requireActiveClinic, updatePet);
router.post('/:id/vaccines', vetOnly, requireActiveClinic, addVaccine);
router.delete('/:id/vaccines/:vid', vetOnly, requireActiveClinic, deleteVaccine);

export default router;
