import { Router } from 'express';
import {
  listPets,
  getPet,
  createPet,
  updatePet,
  deletePet,
} from '../controllers/pets.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authRequired); // todas las rutas de mascotas requieren sesión

router.get('/', listPets);
router.get('/:id', getPet);
router.post('/', createPet);
router.put('/:id', updatePet);
router.delete('/:id', deletePet);

export default router;
