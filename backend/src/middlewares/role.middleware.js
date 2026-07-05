// Restringe el acceso según el rol del usuario autenticado.
// Debe usarse SIEMPRE después de authRequired.

// Fábrica genérica: requireRole('veterinario', 'admin')
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'No tienes permiso para esta acción' });
  }
  next();
};

export const adminOnly = requireRole('admin');
export const vetOnly = requireRole('veterinario');
export const staffOnly = requireRole('veterinario', 'admin'); // personal interno
