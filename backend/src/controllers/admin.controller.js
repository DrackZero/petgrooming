import { query } from '../config/db.js';

// ─── Dashboard / Reportes ───────────────────────────────────
// GET /api/admin/stats
export const getStats = async (req, res, next) => {
  try {
    const [users, appts, orders, revenue] = await Promise.all([
      query("SELECT COUNT(*)::int AS total FROM users WHERE role = 'client'"),
      query('SELECT COUNT(*)::int AS total FROM appointments'),
      query('SELECT COUNT(*)::int AS total FROM orders'),
      query("SELECT COALESCE(SUM(total),0)::numeric AS total FROM orders WHERE status = 'paid'"),
    ]);
    res.json({
      clients: users.rows[0].total,
      appointments: appts.rows[0].total,
      orders: orders.rows[0].total,
      revenue: revenue.rows[0].total,
    });
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
    const { title, description, price, capacity, starts_at, image_url } = req.body;
    const { rows } = await query(
      `INSERT INTO courses (title, description, price, capacity, starts_at, image_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title, description, price, capacity, starts_at, image_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateCourse = async (req, res, next) => {
  try {
    const { title, description, price, capacity, starts_at, image_url, active } = req.body;
    const { rows } = await query(
      `UPDATE courses SET title=$1, description=$2, price=$3, capacity=$4,
              starts_at=$5, image_url=$6, active=$7 WHERE id=$8 RETURNING *`,
      [title, description, price, capacity, starts_at, image_url, active, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Curso no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Slots (franjas horarias) ───────────────────────────────
export const createSlot = async (req, res, next) => {
  try {
    const { starts_at, ends_at, capacity } = req.body;
    const { rows } = await query(
      `INSERT INTO slots (starts_at, ends_at, capacity)
       VALUES ($1,$2,$3) RETURNING *`,
      [starts_at, ends_at, capacity || 1]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteSlot = async (req, res, next) => {
  try {
    await query('DELETE FROM slots WHERE id = $1', [req.params.id]);
    res.json({ message: 'Franja eliminada' });
  } catch (err) {
    next(err);
  }
};

// ─── Gestión de citas (todas) ───────────────────────────────
export const listAllAppointments = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.*, u.name AS client_name, p.name AS pet_name,
              s.name AS service_name, sl.starts_at
       FROM appointments a
       JOIN users u    ON u.id  = a.user_id
       JOIN pets p     ON p.id  = a.pet_id
       JOIN services s ON s.id  = a.service_id
       JOIN slots sl   ON sl.id = a.slot_id
       ORDER BY sl.starts_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { rows } = await query(
      'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Cita no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Pedidos ────────────────────────────────────────────────
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

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { rows } = await query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Pedido no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Clientes ───────────────────────────────────────────────
export const listClients = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, email, phone, created_at
       FROM users WHERE role = 'client' ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};
