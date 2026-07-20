import { query } from '../config/db.js';

// Restringe el acceso según el rol del usuario autenticado.
// Debe usarse SIEMPRE después de authRequired.

// Fábrica genérica: requireRole('veterinario', 'admin')
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'No tienes permiso para esta acción' });
  }
  next();
};

export const adminOnly = requireRole('admin');           // administrador de plataforma
export const vetOnly = requireRole('veterinario');       // personal que atiende
export const managerOnly = requireRole('gerente');       // gerente de una clínica
export const clientOnly = requireRole('cliente');        // dueño de mascota
export const staffOnly = requireRole('veterinario', 'admin');

// Candado de suscripción: un veterinario solo puede operar si su clínica
// está 'activa'. Si no tiene clínica asignada aún, se deja pasar (los vets
// heredados o recién aprobados se atan a una clínica más adelante).
export const requireActiveClinic = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT clinic_id FROM users WHERE id = $1', [req.user.id]);
    const clinicId = rows[0]?.clinic_id;
    if (!clinicId) return next();

    const c = await query('SELECT status FROM clinics WHERE id = $1', [clinicId]);
    if (c.rows[0]?.status !== 'activa') {
      return res.status(403).json({
        message: 'Tu veterinaria está pendiente de activación o suspendida. Contacta al administrador.',
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
