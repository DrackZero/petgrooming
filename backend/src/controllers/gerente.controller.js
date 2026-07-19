import { query } from '../config/db.js';

// GET /api/gerente/clinic  → la clínica del gerente autenticado
export const getMyClinic = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM users u
               WHERE u.clinic_id = c.id AND u.role = 'veterinario') AS vet_count
       FROM clinics c WHERE c.manager_id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'No tienes una veterinaria asignada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};
