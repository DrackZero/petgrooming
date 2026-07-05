import jwt from 'jsonwebtoken';

// Valida el access token JWT que viaja en la cookie httpOnly "accessToken".
// Si es válido, adjunta { id, role } a req.user.
// Cuando expira (15 min), responde 401 y el frontend pide /auth/refresh.
export const authRequired = (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};
