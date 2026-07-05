import { query } from '../config/db.js';
import { sendAppointmentConfirmation } from '../services/email.service.js';

// Envía email de confirmación de una cita (best-effort, no bloquea).
const notifyAppointment = async (appointmentId) => {
  const info = await query(
    `SELECT u.email, p.name AS pet_name, sl.starts_at
     FROM appointments a
     JOIN users u  ON u.id  = a.user_id
     JOIN pets p   ON p.id  = a.pet_id
     JOIN availability_slots sl ON sl.id = a.slot_id
     WHERE a.id = $1`,
    [appointmentId]
  );
  if (info.rows.length) {
    const { email, pet_name, starts_at } = info.rows[0];
    sendAppointmentConfirmation(email, {
      petName: pet_name,
      date: new Date(starts_at).toLocaleString('es-ES'),
    }).catch(() => {});
  }
};

// ─── CLIENTE ────────────────────────────────────────────────

// GET /api/appointments  → citas del cliente
export const listMyAppointments = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.*, p.name AS pet_name, sl.starts_at, sl.ends_at
       FROM appointments a
       JOIN pets p ON p.id = a.pet_id
       JOIN availability_slots sl ON sl.id = a.slot_id
       WHERE a.user_id = $1
       ORDER BY sl.starts_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/appointments/slots  → horarios disponibles
export const listAvailableSlots = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM availability_slots
       WHERE is_booked = false AND starts_at > now()
       ORDER BY starts_at ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/appointments  → el cliente reserva una cita
export const createAppointment = async (req, res, next) => {
  try {
    const { pet_id, slot_id } = req.body;
    if (!pet_id || !slot_id) {
      return res.status(400).json({ message: 'pet_id y slot_id son obligatorios' });
    }

    // La mascota debe pertenecer al cliente.
    const pet = await query('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [pet_id, req.user.id]);
    if (!pet.rows.length) {
      return res.status(403).json({ message: 'La mascota no te pertenece' });
    }

    // El horario debe seguir libre.
    const slot = await query('SELECT id FROM availability_slots WHERE id = $1 AND is_booked = false', [slot_id]);
    if (!slot.rows.length) {
      return res.status(409).json({ message: 'El horario ya no está disponible' });
    }

    const { rows } = await query(
      `INSERT INTO appointments (user_id, pet_id, slot_id, status)
       VALUES ($1, $2, $3, 'pendiente') RETURNING *`,
      [req.user.id, pet_id, slot_id]
    );
    await query('UPDATE availability_slots SET is_booked = true WHERE id = $1', [slot_id]);

    notifyAppointment(rows[0].id);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/appointments/:id/reschedule  → cliente cambia de horario
export const rescheduleAppointment = async (req, res, next) => {
  try {
    const { slot_id } = req.body;
    const appt = await query(
      "SELECT * FROM appointments WHERE id = $1 AND user_id = $2 AND status IN ('pendiente','confirmada')",
      [req.params.id, req.user.id]
    );
    if (!appt.rows.length) return res.status(404).json({ message: 'Cita no encontrada' });

    const newSlot = await query('SELECT id FROM availability_slots WHERE id = $1 AND is_booked = false', [slot_id]);
    if (!newSlot.rows.length) return res.status(409).json({ message: 'El nuevo horario no está disponible' });

    const oldSlot = appt.rows[0].slot_id;
    await query('UPDATE availability_slots SET is_booked = false WHERE id = $1', [oldSlot]);
    await query('UPDATE availability_slots SET is_booked = true WHERE id = $1', [slot_id]);
    const { rows } = await query(
      "UPDATE appointments SET slot_id = $1, status = 'pendiente' WHERE id = $2 RETURNING *",
      [slot_id, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/appointments/:id/cancel  → cliente cancela
export const cancelAppointment = async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE appointments SET status = 'cancelada'
       WHERE id = $1 AND user_id = $2 AND status NOT IN ('completada','cancelada')
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Cita no encontrada' });
    await query('UPDATE availability_slots SET is_booked = false WHERE id = $1', [rows[0].slot_id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── VETERINARIO ────────────────────────────────────────────

// POST /api/appointments/slots  → crear horario disponible
export const createSlot = async (req, res, next) => {
  try {
    const { starts_at, ends_at } = req.body;
    if (!starts_at || !ends_at) {
      return res.status(400).json({ message: 'starts_at y ends_at son obligatorios' });
    }
    const { rows } = await query(
      'INSERT INTO availability_slots (starts_at, ends_at) VALUES ($1, $2) RETURNING *',
      [starts_at, ends_at]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/appointments/slots/:id  → eliminar horario libre
export const deleteSlot = async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM availability_slots WHERE id = $1 AND is_booked = false',
      [req.params.id]
    );
    if (!rowCount) return res.status(409).json({ message: 'No existe o ya está reservado' });
    res.json({ message: 'Horario eliminado' });
  } catch (err) {
    next(err);
  }
};

// GET /api/appointments/all  → todas las citas
export const listAllAppointments = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.*, u.name AS client_name, p.name AS pet_name, sl.starts_at
       FROM appointments a
       JOIN users u ON u.id = a.user_id
       JOIN pets p  ON p.id = a.pet_id
       JOIN availability_slots sl ON sl.id = a.slot_id
       ORDER BY sl.starts_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/appointments/agenda?date=YYYY-MM-DD  → agenda del día
export const getAgenda = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { rows } = await query(
      `SELECT a.*, u.name AS client_name, p.name AS pet_name, sl.starts_at, sl.ends_at
       FROM appointments a
       JOIN users u ON u.id = a.user_id
       JOIN pets p  ON p.id = a.pet_id
       JOIN availability_slots sl ON sl.id = a.slot_id
       WHERE sl.starts_at::date = $1
       ORDER BY sl.starts_at ASC`,
      [date]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/appointments/vet  → el veterinario agenda a un cliente (confirmada)
export const vetCreateAppointment = async (req, res, next) => {
  try {
    const { user_id, pet_id, slot_id } = req.body;
    if (!user_id || !pet_id || !slot_id) {
      return res.status(400).json({ message: 'user_id, pet_id y slot_id son obligatorios' });
    }
    const slot = await query('SELECT id FROM availability_slots WHERE id = $1 AND is_booked = false', [slot_id]);
    if (!slot.rows.length) return res.status(409).json({ message: 'El horario no está disponible' });

    const { rows } = await query(
      `INSERT INTO appointments (user_id, pet_id, slot_id, status)
       VALUES ($1, $2, $3, 'confirmada') RETURNING *`,
      [user_id, pet_id, slot_id]
    );
    await query('UPDATE availability_slots SET is_booked = true WHERE id = $1', [slot_id]);
    notifyAppointment(rows[0].id);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/appointments/:id/status  → confirmar / rechazar / completar
// body: { status: 'confirmada'|'cancelada'|'completada', notes? }
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const valid = ['confirmada', 'cancelada', 'completada'];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }
    const { rows } = await query(
      'UPDATE appointments SET status = $1, notes = COALESCE($2, notes) WHERE id = $3 RETURNING *',
      [status, notes || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Cita no encontrada' });

    // Si se cancela, libera el horario.
    if (status === 'cancelada') {
      await query('UPDATE availability_slots SET is_booked = false WHERE id = $1', [rows[0].slot_id]);
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};
