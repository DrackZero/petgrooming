// Restringe el acceso a usuarios con rol 'admin'.
// Debe usarse SIEMPRE después de authRequired.
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso solo para administradores' });
  }
  next();
};
