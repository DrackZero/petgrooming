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
} from '../controllers/pets.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { vetOnly } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authRequired); // todas requieren sesión

// Lectura (cliente dueño o veterinario)
router.get('/', listMyPets);
router.get('/clients', vetOnly, listClientsForVet); // antes de '/:id'
router.get('/all', vetOnly, listAllPets); // antes de '/:id'
router.get('/:id', getPet);
router.get('/:id/history', getPetHistory);
router.get('/:id/vaccines', listVaccines);

// Escritura — solo veterinario
router.post('/', vetOnly, createPet);
router.put('/:id', vetOnly, updatePet);
router.post('/:id/vaccines', vetOnly, addVaccine);
router.delete('/:id/vaccines/:vid', vetOnly, deleteVaccine);

export default router;
