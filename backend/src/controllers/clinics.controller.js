import { query } from '../config/db.js';

// GET /api/clinics/active  → clínicas activas (público, para el registro de vet)
export const listActiveClinics = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name FROM clinics WHERE status = 'activa' ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};
