import { Router } from 'express';
import {
  listCourses,
  myEnrollments,
  enroll,
  cancelEnrollment,
} from '../controllers/courses.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', listCourses); // catálogo público
router.get('/mine', authRequired, myEnrollments);
router.post('/:id/enroll', authRequired, enroll);
router.patch('/:id/cancel', authRequired, cancelEnrollment);

export default router;
