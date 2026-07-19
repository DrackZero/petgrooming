import { query } from '../config/db.js';

// Verifica si el usuario puede ver una mascota:
// el veterinario puede ver todas (historial portable entre clínicas);
// el cliente, solo las suyas.
const canAccessPet = async (user, petId) => {
  const { rows } = await query('SELECT owner_id FROM pets WHERE id = $1', [petId]);
  if (!rows.length) return false;
  if (user.role === 'veterinario') return true;
  return rows[0].owner_id === user.id;
};

// Auditoría "break-glass": todo acceso de un veterinario a un historial
// queda registrado (no se bloquea, se audita). Best-effort: no rompe la
// consulta si el registro falla.
const logVetAccess = (user, petId) => {
  if (user.role !== 'veterinario') return;
  query(
    'INSERT INTO emergency_access_log (vet_id, pet_id) VALUES ($1, $2)',
    [user.id, petId]
  ).catch(() => {});
};

// ─── CLIENTE (solo lectura) ─────────────────────────────────

// GET /api/pets  → mascotas del cliente autenticado
export const listMyPets = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM pets WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/pets/:id  → detalle (cliente dueño o veterinario)
export const getPet = async (req, res, next) => {
  try {
    if (!(await canAccessPet(req.user, req.params.id))) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    const { rows } = await query('SELECT * FROM pets WHERE id = $1', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/pets/:id/history  → vacunas + citas (solo lectura)
export const getPetHistory = async (req, res, next) => {
  try {
    if (!(await canAccessPet(req.user, req.params.id))) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    logVetAccess(req.user, req.params.id);
    const vaccines = await query(
      `SELECT v.*, u.name AS vet_name, c.name AS clinic_name
       FROM vaccines v
       LEFT JOIN users u ON u.id = v.vet_id
       LEFT JOIN clinics c ON c.id = u.clinic_id
       WHERE v.pet_id = $1 ORDER BY v.applied_date DESC`,
      [req.params.id]
    );
    const appointments = await query(
      `SELECT a.id, a.status, a.notes, sl.starts_at
       FROM appointments a
       JOIN availability_slots sl ON sl.id = a.slot_id
       WHERE a.pet_id = $1
       ORDER BY sl.starts_at DESC`,
      [req.params.id]
    );
    res.json({ vaccines: vaccines.rows, appointments: appointments.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/pets/:id/vaccines  → vacunas de una mascota
export const listVaccines = async (req, res, next) => {
  try {
    if (!(await canAccessPet(req.user, req.params.id))) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    logVetAccess(req.user, req.params.id);
    const { rows } = await query(
      `SELECT v.*, u.name AS vet_name, c.name AS clinic_name
       FROM vaccines v
       LEFT JOIN users u ON u.id = v.vet_id
       LEFT JOIN clinics c ON c.id = u.clinic_id
       WHERE v.pet_id = $1 ORDER BY v.applied_date DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// ─── VETERINARIO (gestión) ──────────────────────────────────

// GET /api/pets/clients  → clientes activos (para asociar dueño)
export const listClientsForVet = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, email FROM users
       WHERE role = 'cliente' AND is_active = true
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/pets/all  → todas las mascotas con su dueño
export const listAllPets = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, u.name AS owner_name, u.email AS owner_email
       FROM pets p JOIN users u ON u.id = p.owner_id
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/pets  → registrar mascota para un cliente
export const createPet = async (req, res, next) => {
  try {
    const { owner_id, name, species, breed, age, notes } = req.body;
    if (!owner_id || !name) {
      return res.status(400).json({ message: 'owner_id y nombre son obligatorios' });
    }
    // Verifica que el dueño exista y sea cliente.
    const owner = await query("SELECT id FROM users WHERE id = $1 AND role = 'cliente'", [owner_id]);
    if (!owner.rows.length) {
      return res.status(404).json({ message: 'El cliente dueño no existe' });
    }
    const { rows } = await query(
      `INSERT INTO pets (owner_id, name, species, breed, age, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [owner_id, name, species || null, breed || null, age || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/pets/:id  → editar mascota
export const updatePet = async (req, res, next) => {
  try {
    const { name, species, breed, age, notes } = req.body;
    const { rows } = await query(
      `UPDATE pets SET name=$1, species=$2, breed=$3, age=$4, notes=$5
       WHERE id=$6 RETURNING *`,
      [name, species, breed, age, notes, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Mascota no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/pets/:id/vaccines  → registrar vacuna
export const addVaccine = async (req, res, next) => {
  try {
    const { name, applied_date, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'El nombre de la vacuna es obligatorio' });

    const pet = await query('SELECT id FROM pets WHERE id = $1', [req.params.id]);
    if (!pet.rows.length) return res.status(404).json({ message: 'Mascota no encontrada' });

    const { rows } = await query(
      `INSERT INTO vaccines (pet_id, vet_id, name, applied_date, notes)
       VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5) RETURNING *`,
      [req.params.id, req.user.id, name, applied_date || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/pets/:id/vaccines/:vid  → eliminar vacuna
export const deleteVaccine = async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM vaccines WHERE id = $1 AND pet_id = $2',
      [req.params.vid, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Vacuna no encontrada' });
    res.json({ message: 'Vacuna eliminada' });
  } catch (err) {
    next(err);
  }
};
