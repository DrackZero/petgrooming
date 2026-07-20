import { query } from '../config/db.js';
import { expireStaleOrders } from './orders.controller.js';

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

// GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
// Reporte del negocio en un rango de fechas (por defecto, últimos 30 días).
export const getReports = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const from = req.query.from || monthAgo;
    const to = req.query.to || today;

    if (isNaN(new Date(from)) || isNaN(new Date(to)) || from > to) {
      return res.status(400).json({ message: 'Rango de fechas inválido' });
    }
    if ((new Date(to) - new Date(from)) / 86400000 > 366) {
      return res.status(400).json({ message: 'El rango máximo es de un año' });
    }

    const PAID = ['pagada', 'enviada', 'entregada'];
    const p = [from, to];

    const [revenue, orders, paidOrders, apptByStatus, enrollments, newClients, salesByDay, topProducts] =
      await Promise.all([
        query(
          `SELECT COALESCE(SUM(total),0)::numeric AS v FROM orders
           WHERE status = ANY($3) AND created_at::date BETWEEN $1 AND $2`,
          [...p, PAID]
        ),
        query(
          `SELECT COUNT(*)::int AS v FROM orders WHERE created_at::date BETWEEN $1 AND $2`, p
        ),
        query(
          `SELECT COUNT(*)::int AS v FROM orders
           WHERE status = ANY($3) AND created_at::date BETWEEN $1 AND $2`,
          [...p, PAID]
        ),
        query(
          `SELECT a.status, COUNT(*)::int AS count
           FROM appointments a
           JOIN availability_slots sl ON sl.id = a.slot_id
           WHERE sl.starts_at::date BETWEEN $1 AND $2
           GROUP BY a.status ORDER BY count DESC`, p
        ),
        query(
          `SELECT COUNT(*)::int AS v FROM enrollments WHERE enrolled_at::date BETWEEN $1 AND $2`, p
        ),
        query(
          `SELECT COUNT(*)::int AS v FROM users
           WHERE role = 'cliente' AND created_at::date BETWEEN $1 AND $2`, p
        ),
        query(
          `SELECT created_at::date AS day, SUM(total)::numeric AS total
           FROM orders
           WHERE status = ANY($3) AND created_at::date BETWEEN $1 AND $2
           GROUP BY day ORDER BY day ASC`,
          [...p, PAID]
        ),
        query(
          `SELECT pr.name, SUM(oi.quantity)::int AS units
           FROM order_items oi
           JOIN orders o   ON o.id = oi.order_id
           JOIN products pr ON pr.id = oi.product_id
           WHERE o.status = ANY($3) AND o.created_at::date BETWEEN $1 AND $2
           GROUP BY pr.name ORDER BY units DESC LIMIT 5`,
          [...p, PAID]
        ),
      ]);

    res.json({
      range: { from, to },
      totals: {
        revenue: revenue.rows[0].v,
        orders: orders.rows[0].v,
        paidOrders: paidOrders.rows[0].v,
        appointments: apptByStatus.rows.reduce((s, r) => s + r.count, 0),
        enrollments: enrollments.rows[0].v,
        newClients: newClients.rows[0].v,
      },
      apptByStatus: apptByStatus.rows,
      salesByDay: salesByDay.rows,
      topProducts: topProducts.rows,
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
      `UPDATE users SET role = 'veterinario', vet_requested = false
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

// GET /api/admin/vet-requests  → solicitudes de vet SIN clínica (las demás
// las gestiona el gerente de la clínica elegida por el veterinario).
export const listVetRequests = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, email, created_at FROM users
       WHERE vet_requested = true AND role = 'cliente' AND clinic_id IS NULL
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/vet-requests/:id/reject  → rechazar la solicitud
export const rejectVetRequest = async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE users SET vet_requested = false
       WHERE id = $1 AND vet_requested = true
       RETURNING id, name`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Solicitud no encontrada' });
    res.json({ ...rows[0], message: 'Solicitud rechazada' });
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

// GET /api/admin/vets  → veterinarios con su clínica
export const listVets = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
              u.clinic_id, c.name AS clinic_name
       FROM users u
       LEFT JOIN clinics c ON c.id = u.clinic_id
       WHERE u.role = 'veterinario' ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// ─── Clínicas (modelo multi-clínica) ────────────────────────

// Precio mensual de cada plan de suscripción (COP).
export const PLAN_PRICES = { basico: 60000, pro: 150000 };
const VALID_PLANS = Object.keys(PLAN_PRICES);
const VALID_STATUS = ['pendiente', 'activa', 'suspendida'];

// GET /api/admin/clinics  → clínicas con estado, plan, gerente y conteo de vets
export const listClinics = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*, m.name AS manager_name, m.email AS manager_email,
              (SELECT COUNT(*)::int FROM users u
               WHERE u.clinic_id = c.id AND u.role = 'veterinario') AS vet_count
       FROM clinics c
       LEFT JOIN users m ON m.id = c.manager_id
       ORDER BY c.created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/clinics {name, address, phone}  → alta manual (queda activa)
export const createClinic = async (req, res, next) => {
  try {
    const { name, address, phone } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
    const { rows } = await query(
      `INSERT INTO clinics (name, address, phone, status) VALUES ($1, $2, $3, 'activa') RETURNING *`,
      [name.trim(), address || null, phone || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/clinics/:id/status {status}  → activar/suspender suscripción
export const setClinicStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }
    const { rows } = await query(
      'UPDATE clinics SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Clínica no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/clinics/:id/plan {plan}  → cambiar plan de suscripción
export const setClinicPlan = async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!VALID_PLANS.includes(plan)) {
      return res.status(400).json({ message: 'Plan inválido' });
    }
    const { rows } = await query(
      'UPDATE clinics SET plan = $1 WHERE id = $2 RETURNING *',
      [plan, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Clínica no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/subscription  → ingresos por suscripción (lo único que ve la plataforma)
export const getSubscription = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT plan, COUNT(*)::int AS count
       FROM clinics WHERE status = 'activa'
       GROUP BY plan`
    );
    let monthlyRevenue = 0;
    const byPlan = {};
    for (const r of rows) {
      byPlan[r.plan] = r.count;
      monthlyRevenue += (PLAN_PRICES[r.plan] || 0) * r.count;
    }
    const totals = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'activa')::int      AS activas,
         COUNT(*) FILTER (WHERE status = 'pendiente')::int   AS pendientes,
         COUNT(*) FILTER (WHERE status = 'suspendida')::int  AS suspendidas
       FROM clinics`
    );
    res.json({ monthlyRevenue, byPlan, planPrices: PLAN_PRICES, ...totals.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/vets/:id/clinic {clinic_id}  → asignar clínica a un vet
export const setVetClinic = async (req, res, next) => {
  try {
    const { clinic_id } = req.body;
    if (clinic_id) {
      const clinic = await query('SELECT id FROM clinics WHERE id = $1 AND is_active = true', [clinic_id]);
      if (!clinic.rows.length) return res.status(404).json({ message: 'Clínica no encontrada' });
    }
    const { rows } = await query(
      `UPDATE users SET clinic_id = $1
       WHERE id = $2 AND role = 'veterinario'
       RETURNING id, name, clinic_id`,
      [clinic_id || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Veterinario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/access-log  → auditoría de accesos a historiales
export const getAccessLog = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT l.id, l.accessed_at,
              v.name AS vet_name, c.name AS clinic_name,
              p.name AS pet_name, o.name AS owner_name
       FROM emergency_access_log l
       JOIN users v ON v.id = l.vet_id
       LEFT JOIN clinics c ON c.id = v.clinic_id
       JOIN pets p ON p.id = l.pet_id
       JOIN users o ON o.id = p.owner_id
       ORDER BY l.accessed_at DESC
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/vets/:id/active  → activar/desactivar cuenta de veterinario
export const setVetActive = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const { rows } = await query(
      `UPDATE users SET is_active = $1 WHERE id = $2 AND role = 'veterinario'
       RETURNING id, name, email, is_active`,
      [is_active !== false, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Veterinario no encontrado' });
    res.json(rows[0]);
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
    // Los productos del admin de plataforma van a la clínica semilla (tienda de la plataforma).
    const { rows } = await query(
      `INSERT INTO products (clinic_id, name, description, price, stock, image_url, category)
       VALUES ((SELECT id FROM clinics ORDER BY id LIMIT 1),$1,$2,$3,$4,$5,$6) RETURNING *`,
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
      `INSERT INTO courses (clinic_id, title, description, price, duration, capacity, starts_at, image_url)
       VALUES ((SELECT id FROM clinics ORDER BY id LIMIT 1),$1,$2,$3,$4,$5,$6,$7) RETURNING *`,
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
    await expireStaleOrders().catch(() => {}); // limpia pendientes vencidos
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
