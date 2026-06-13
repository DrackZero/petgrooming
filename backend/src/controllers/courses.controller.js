import { query } from '../config/db.js';

// GET /api/courses  → cursos activos
export const listCourses = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM courses WHERE active = true ORDER BY starts_at ASC NULLS LAST'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/courses/mine  → inscripciones del usuario
export const myEnrollments = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT e.*, c.title, c.starts_at, c.image_url
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = $1
       ORDER BY e.enrolled_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/courses/:id/enroll
export const enroll = async (req, res, next) => {
  try {
    const courseId = req.params.id;

    const course = await query('SELECT * FROM courses WHERE id = $1 AND active = true', [courseId]);
    if (!course.rows.length) {
      return res.status(404).json({ message: 'Curso no disponible' });
    }

    // Comprueba cupo.
    const count = await query(
      `SELECT COUNT(*)::int AS total FROM enrollments
       WHERE course_id = $1 AND status = 'active'`,
      [courseId]
    );
    if (count.rows[0].total >= course.rows[0].capacity) {
      return res.status(409).json({ message: 'El curso está completo' });
    }

    const { rows } = await query(
      `INSERT INTO enrollments (user_id, course_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, course_id) DO UPDATE SET status = 'active'
       RETURNING *`,
      [req.user.id, courseId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/courses/:id/cancel
export const cancelEnrollment = async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE enrollments SET status = 'cancelled'
       WHERE course_id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Inscripción no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};
