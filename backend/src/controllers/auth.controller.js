import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool, { query } from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/hash.js';

const ACCESS_TTL = '15m';
const REFRESH_DAYS = 7;
const isProd = process.env.NODE_ENV === 'production';

// Cookies httpOnly. El access dura 15 min; el refresh, 7 días.
const accessCookie = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 15 * 60 * 1000,
};
const refreshCookie = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000,
};

// Firma un access token JWT de corta duración.
const signAccess = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });

// Crea y persiste un refresh token opaco en la base de datos.
const issueRefresh = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
  return token;
};

// Emite ambos tokens en cookies y responde con los datos del usuario.
const sendSession = async (res, user, status = 200) => {
  const access = signAccess(user);
  const refresh = await issueRefresh(user.id);
  res.cookie('accessToken', access, accessCookie);
  res.cookie('refreshToken', refresh, refreshCookie);
  res.status(status).json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
  });
};

// POST /api/auth/register  → crea cuenta con rol 'cliente'
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, wants_vet, clinic_id, manage_clinic, clinic } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y password son obligatorios' });
    }

    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    const password_hash = await hashPassword(password);

    // Alta de GERENTE: crea su cuenta y su clínica (queda 'pendiente'
    // hasta que la plataforma la active = confirmación de la suscripción).
    if (manage_clinic) {
      if (!clinic?.name?.trim()) {
        return res.status(400).json({ message: 'El nombre de la veterinaria es obligatorio' });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const u = await client.query(
          `INSERT INTO users (name, email, password_hash, phone, role)
           VALUES ($1, $2, $3, $4, 'gerente')
           RETURNING id, name, email, phone, role`,
          [name, email, password_hash, phone || null]
        );
        const user = u.rows[0];
        const c = await client.query(
          `INSERT INTO clinics (name, address, phone, status, plan, manager_id)
           VALUES ($1, $2, $3, 'pendiente', 'basico', $4) RETURNING id`,
          [clinic.name.trim(), clinic.address || null, clinic.phone || null, user.id]
        );
        await client.query('UPDATE users SET clinic_id = $1 WHERE id = $2', [c.rows[0].id, user.id]);
        await client.query('COMMIT');
        await sendSession(res, user, 201);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      return;
    }

    // wants_vet: el usuario solicita el rol de veterinario para una clínica
    // concreta (clinic_id). Entra como cliente y el GERENTE de esa clínica
    // aprueba la solicitud. Solo se guarda la clínica si está activa.
    let vetClinicId = null;
    if (wants_vet && clinic_id) {
      const c = await query("SELECT id FROM clinics WHERE id = $1 AND status = 'activa'", [clinic_id]);
      if (c.rows.length) vetClinicId = clinic_id;
    }
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, phone, vet_requested, clinic_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, role`,
      [name, email, password_hash, phone || null, Boolean(wants_vet), vetClinicId]
    );

    await sendSession(res, rows[0], 201);
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
    if (!user.is_active) {
      return res.status(403).json({ message: 'La cuenta está desactivada' });
    }

    await sendSession(res, user);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh  → rota el refresh token y emite uno nuevo
export const refresh = async (req, res, next) => {
  try {
    const rt = req.cookies?.refreshToken;
    if (!rt) return res.status(401).json({ message: 'Sin refresh token' });

    const { rows } = await query(
      `SELECT rt.id AS token_id, rt.revoked, rt.expires_at,
              u.id, u.name, u.email, u.phone, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1`,
      [rt]
    );
    const record = rows[0];

    if (!record || record.revoked || new Date(record.expires_at) < new Date() || !record.is_active) {
      return res.status(401).json({ message: 'Refresh token inválido o expirado' });
    }

    // Rotación: invalida el token usado y emite uno nuevo.
    await query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [record.token_id]);
    await sendSession(res, record);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout  → revoca el refresh token y limpia cookies
export const logout = async (req, res, next) => {
  try {
    const rt = req.cookies?.refreshToken;
    if (rt) {
      await query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [rt]);
    }
    res.clearCookie('accessToken', accessCookie);
    res.clearCookie('refreshToken', refreshCookie);
    res.json({ message: 'Sesión cerrada' });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
export const me = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, email, phone, role FROM users WHERE id = $1 AND is_active = true',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
};
