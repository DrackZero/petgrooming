import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/hash.js';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
};

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y password son obligatorios' });
    }

    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    const password_hash = await hashPassword(password);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, role`,
      [name, email, password_hash, phone || null]
    );

    const user = rows[0];
    res.cookie('token', signToken(user), cookieOptions);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    if (!user || !(await comparePassword(password, user.password_hash))) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    res.cookie('token', signToken(user), cookieOptions);
    res.json({
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
export const logout = (req, res) => {
  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Sesión cerrada' });
};

// GET /api/auth/me
export const me = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, email, phone, role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
};
