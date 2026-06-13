import jwt from 'jsonwebtoken';

// Valida el JWT que viaja en la cookie httpOnly "token".
// Si es válido, adjunta { id, role } a req.user.
export const authRequired = (req, res, next) => {
  const token = req.cookies?.token;

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
