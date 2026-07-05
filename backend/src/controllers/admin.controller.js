import { query } from '../config/db.js';

// ─── Reportes / Dashboard ───────────────────────────────────
// GET /api/admin/stats
export const getStats = async (req, res, next) => {
  try {
    const [clients, appts, orders, revenue] = await Promise.all([
      query("SELECT COUNT(*)::int AS total FROM users WHERE role = 'cliente'"),
      query('SELECT COUNT(*)::int AS total FROM appointments'),
      query('SELECT COUNT(*)::int AS total FROM orders'),
      query("SELECT COALESCE(SUM(total),0)::numeric AS total FROM orders WHERE status = 'pagada'"),
    ]);
    res.json({
      clients: clients.rows[0].total,
      appointments: appts.rows[0].total,
      orders: orders.rows[0].total,
      revenue: revenue.rows[0].total,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Gestión de usuarios / roles ────────────────────────────
// GET /api/admin/users  → todos los usuarios
export const listUsers = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, email, phone, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/vet  → asignar rol de veterinario
export const assignVetRole = async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE users SET role = 'veterinario'
       WHERE id = $1 AND role = 'cliente'
       RETURNING id, name, email, role`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado o no es cliente' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Clientes ───────────────────────────────────────────────
// GET /api/admin/clients
export const listClients = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, email, phone, is_active, created_at
       FROM users WHERE role = 'cliente' ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/clients/:id/active  → activar/desactivar cuenta
export const setClientActive = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const { rows } = await query(
      `UPDATE users SET is_active = $1 WHERE id = $2 AND role = 'cliente'
       RETURNING id, name, email, is_active`,
      [is_active !== false, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Productos ──────────────────────────────────────────────
export const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock, image_url, category } = req.body;
    const { rows } = await query(
      `INSERT INTO products (name, description, price, stock, image_url, category)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, description, price, stock, image_url, category]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock, image_url, category, active } = req.body;
    const { rows } = await query(
      `UPDATE products SET name=$1, description=$2, price=$3, stock=$4,
              image_url=$5, category=$6, active=$7 WHERE id=$8 RETURNING *`,
      [name, description, price, stock, image_url, category, active, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    await query('UPDATE products SET active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Producto desactivado' });
  } catch (err) {
    next(err);
  }
};

// ─── Cursos ─────────────────────────────────────────────────
export const createCourse = async (req, res, next) => {
  try {
    const { title, description, price, duration, capacity, starts_at, image_url } = req.body;
    const { rows } = await query(
      `INSERT INTO courses (title, description, price, duration, capacity, starts_at, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, price, duration, capacity, starts_at, image_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateCourse = async (req, res, next) => {
  try {
    const { title, description, price, duration, capacity, starts_at, image_url, active } = req.body;
    const { rows } = await query(
      `UPDATE courses SET title=$1, description=$2, price=$3, duration=$4,
              capacity=$5, starts_at=$6, image_url=$7, active=$8 WHERE id=$9 RETURNING *`,
      [title, description, price, duration, capacity, starts_at, image_url, active, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Curso no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Pedidos (alertas, solo lectura) ────────────────────────
export const listAllOrders = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT o.*, u.name AS client_name, u.email
       FROM orders o JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};
