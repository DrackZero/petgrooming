import { query } from '../config/db.js';

// Devuelve el id de la clínica que dirige el gerente autenticado.
const myClinicId = async (userId) => {
  const { rows } = await query('SELECT id FROM clinics WHERE manager_id = $1', [userId]);
  return rows[0]?.id || null;
};

// GET /api/gerente/clinic  → la clínica del gerente autenticado
export const getMyClinic = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM users u
               WHERE u.clinic_id = c.id AND u.role = 'veterinario') AS vet_count,
              (SELECT COUNT(*)::int FROM users u
               WHERE u.clinic_id = c.id AND u.vet_requested = true AND u.role = 'cliente') AS pending_count
       FROM clinics c WHERE c.manager_id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'No tienes una veterinaria asignada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/gerente/clinic  → editar datos de la clínica
export const updateMyClinic = async (req, res, next) => {
  try {
    const { name, address, phone } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
    const { rows } = await query(
      `UPDATE clinics SET name = $1, address = $2, phone = $3
       WHERE manager_id = $4 RETURNING *`,
      [name.trim(), address || null, phone || null, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'No tienes una veterinaria asignada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Veterinarios de la clínica ─────────────────────────────

// GET /api/gerente/vet-requests  → solicitudes de vet para MI clínica
export const listVetRequests = async (req, res, next) => {
  try {
    const clinicId = await myClinicId(req.user.id);
    if (!clinicId) return res.status(404).json({ message: 'No tienes una veterinaria asignada' });
    const { rows } = await query(
      `SELECT id, name, email, created_at FROM users
       WHERE role = 'cliente' AND vet_requested = true AND clinic_id = $1
       ORDER BY created_at ASC`,
      [clinicId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/gerente/vet-requests/:id/approve  → aprobar a un vet de MI clínica
export const approveVet = async (req, res, next) => {
  try {
    const clinicId = await myClinicId(req.user.id);
    const { rows } = await query(
      `UPDATE users SET role = 'veterinario', vet_requested = false
       WHERE id = $1 AND vet_requested = true AND clinic_id = $2
       RETURNING id, name, email, role`,
      [req.params.id, clinicId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Solicitud no encontrada en tu clínica' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/gerente/vet-requests/:id/reject  → rechazar la solicitud
export const rejectVet = async (req, res, next) => {
  try {
    const clinicId = await myClinicId(req.user.id);
    const { rows } = await query(
      `UPDATE users SET vet_requested = false, clinic_id = NULL
       WHERE id = $1 AND vet_requested = true AND clinic_id = $2
       RETURNING id, name`,
      [req.params.id, clinicId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Solicitud no encontrada en tu clínica' });
    res.json({ ...rows[0], message: 'Solicitud rechazada' });
  } catch (err) {
    next(err);
  }
};

// GET /api/gerente/vets  → veterinarios de MI clínica
export const listMyVets = async (req, res, next) => {
  try {
    const clinicId = await myClinicId(req.user.id);
    if (!clinicId) return res.status(404).json({ message: 'No tienes una veterinaria asignada' });
    const { rows } = await query(
      `SELECT id, name, email, phone, is_active, created_at
       FROM users WHERE role = 'veterinario' AND clinic_id = $1
       ORDER BY created_at DESC`,
      [clinicId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/gerente/vets/:id/active  → activar/desactivar un vet de MI clínica
export const setMyVetActive = async (req, res, next) => {
  try {
    const clinicId = await myClinicId(req.user.id);
    const { is_active } = req.body;
    const { rows } = await query(
      `UPDATE users SET is_active = $1
       WHERE id = $2 AND role = 'veterinario' AND clinic_id = $3
       RETURNING id, name, is_active`,
      [is_active !== false, req.params.id, clinicId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Veterinario no encontrado en tu clínica' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Reportes de la clínica ─────────────────────────────────

// ─── Tienda de la clínica (solo plan Pro) ───────────────────

// Devuelve la clínica del gerente y valida que tenga plan Pro.
const myProClinic = async (userId) => {
  const { rows } = await query('SELECT id, plan, store_enabled FROM clinics WHERE manager_id = $1', [userId]);
  return rows[0] || null;
};

// PATCH /api/gerente/store {enabled}  → encender/apagar la tienda (Pro)
export const toggleStore = async (req, res, next) => {
  try {
    const clinic = await myProClinic(req.user.id);
    if (!clinic) return res.status(404).json({ message: 'No tienes una veterinaria asignada' });
    if (clinic.plan !== 'pro') {
      return res.status(403).json({ message: 'La tienda solo está disponible en el plan Pro' });
    }
    const { rows } = await query(
      'UPDATE clinics SET store_enabled = $1 WHERE id = $2 RETURNING id, store_enabled',
      [req.body.enabled !== false, clinic.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/gerente/products  → catálogo de MI clínica
export const listMyProducts = async (req, res, next) => {
  try {
    const clinicId = await myClinicId(req.user.id);
    const { rows } = await query(
      'SELECT * FROM products WHERE clinic_id = $1 ORDER BY created_at DESC',
      [clinicId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/gerente/products  → crear producto en MI clínica (Pro)
export const createMyProduct = async (req, res, next) => {
  try {
    const clinic = await myProClinic(req.user.id);
    if (!clinic) return res.status(404).json({ message: 'No tienes una veterinaria asignada' });
    if (clinic.plan !== 'pro') return res.status(403).json({ message: 'La tienda solo está disponible en el plan Pro' });

    const { name, description, price, stock, image_url, category } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
    const { rows } = await query(
      `INSERT INTO products (clinic_id, name, description, price, stock, image_url, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [clinic.id, name.trim(), description, price || 0, stock || 0, image_url, category]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/gerente/products/:id  → editar producto de MI clínica
export const updateMyProduct = async (req, res, next) => {
  try {
    const clinicId = await myClinicId(req.user.id);
    const { name, description, price, stock, image_url, category, active } = req.body;
    const { rows } = await query(
      `UPDATE products SET name=$1, description=$2, price=$3, stock=$4,
              image_url=$5, category=$6, active=$7
       WHERE id=$8 AND clinic_id=$9 RETURNING *`,
      [name, description, price, stock, image_url, category, active, req.params.id, clinicId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Producto no encontrado en tu clínica' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/gerente/products/:id  → desactivar producto de MI clínica
export const deleteMyProduct = async (req, res, next) => {
  try {
    const clinicId = await myClinicId(req.user.id);
    const { rowCount } = await query(
      'UPDATE products SET active = false WHERE id = $1 AND clinic_id = $2',
      [req.params.id, clinicId]
    );
    if (!rowCount) return res.status(404).json({ message: 'Producto no encontrado en tu clínica' });
    res.json({ message: 'Producto desactivado' });
  } catch (err) {
    next(err);
  }
};

// GET /api/gerente/courses  → cursos de MI clínica
export const listMyCourses = async (req, res, next) => {
  try {
    const clinicId = await myClinicId(req.user.id);
    const { rows } = await query(
      'SELECT * FROM courses WHERE clinic_id = $1 ORDER BY created_at DESC',
      [clinicId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/gerente/courses  → crear curso en MI clínica (Pro)
export const createMyCourse = async (req, res, next) => {
  try {
    const clinic = await myProClinic(req.user.id);
    if (!clinic) return res.status(404).json({ message: 'No tienes una veterinaria asignada' });
    if (clinic.plan !== 'pro') return res.status(403).json({ message: 'Los cursos solo están disponibles en el plan Pro' });

    const { title, description, price, duration, capacity, starts_at, image_url } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'El título es obligatorio' });
    const { rows } = await query(
      `INSERT INTO courses (clinic_id, title, description, price, duration, capacity, starts_at, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [clinic.id, title.trim(), description, price || 0, duration, capacity || 20, starts_at || null, image_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/gerente/courses/:id  → editar curso de MI clínica
export const updateMyCourse = async (req, res, next) => {
  try {
    const clinicId = await myClinicId(req.user.id);
    const { title, description, price, duration, capacity, starts_at, image_url, active } = req.body;
    const { rows } = await query(
      `UPDATE courses SET title=$1, description=$2, price=$3, duration=$4,
              capacity=$5, starts_at=$6, image_url=$7, active=$8
       WHERE id=$9 AND clinic_id=$10 RETURNING *`,
      [title, description, price, duration, capacity, starts_at, image_url, active, req.params.id, clinicId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Curso no encontrado en tu clínica' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/gerente/reports  → métricas de MI clínica
export const getMyReports = async (req, res, next) => {
  try {
    const clinicId = await myClinicId(req.user.id);
    if (!clinicId) return res.status(404).json({ message: 'No tienes una veterinaria asignada' });

    const [vets, apptByStatus, upcoming] = await Promise.all([
      query(
        `SELECT COUNT(*) FILTER (WHERE is_active)::int AS activos,
                COUNT(*)::int AS total
         FROM users WHERE role = 'veterinario' AND clinic_id = $1`,
        [clinicId]
      ),
      query(
        `SELECT a.status, COUNT(*)::int AS count
         FROM appointments a
         JOIN availability_slots sl ON sl.id = a.slot_id
         JOIN users v ON v.id = sl.vet_id
         WHERE v.clinic_id = $1
         GROUP BY a.status ORDER BY count DESC`,
        [clinicId]
      ),
      query(
        `SELECT COUNT(*)::int AS count
         FROM appointments a
         JOIN availability_slots sl ON sl.id = a.slot_id
         JOIN users v ON v.id = sl.vet_id
         WHERE v.clinic_id = $1 AND sl.starts_at > now()
           AND a.status IN ('pendiente','confirmada')`,
        [clinicId]
      ),
    ]);

    res.json({
      vets: vets.rows[0],
      apptByStatus: apptByStatus.rows,
      totalAppointments: apptByStatus.rows.reduce((s, r) => s + r.count, 0),
      upcoming: upcoming.rows[0].count,
    });
  } catch (err) {
    next(err);
  }
};
