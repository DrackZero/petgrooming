import { query } from '../config/db.js';
import { sendAppointmentConfirmation } from '../services/email.service.js';

// GET /api/appointments  → citas del usuario (con datos de mascota, servicio y slot)
export const listAppointments = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.*, p.name AS pet_name, s.name AS service_name,
              sl.starts_at, sl.ends_at
       FROM appointments a
       JOIN pets p     ON p.id  = a.pet_id
       JOIN services s ON s.id  = a.service_id
       JOIN slots sl   ON sl.id = a.slot_id
       WHERE a.user_id = $1
       ORDER BY sl.starts_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/appointments/slots  → franjas disponibles
export const listAvailableSlots = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM slots
       WHERE is_available = true AND starts_at > now()
       ORDER BY starts_at ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/appointments
export const createAppointment = async (req, res, next) => {
  try {
    const { pet_id, service_id, slot_id, notes } = req.body;
    if (!pet_id || !service_id || !slot_id) {
      return res.status(400).json({ message: 'pet_id, service_id y slot_id son obligatorios' });
    }

    // Verifica que el slot siga disponible.
    const slot = await query('SELECT * FROM slots WHERE id = $1 AND is_available = true', [slot_id]);
    if (!slot.rows.length) {
      return res.status(409).json({ message: 'La franja horaria ya no está disponible' });
    }

    const { rows } = await query(
      `INSERT INTO appointments (user_id, pet_id, service_id, slot_id, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, pet_id, service_id, slot_id, notes || null]
    );

    // Marca el slot como ocupado.
    await query('UPDATE slots SET is_available = false WHERE id = $1', [slot_id]);

    // Email de confirmación (no bloquea la respuesta si falla).
    const info = await query(
      `SELECT u.email, p.name AS pet_name, sl.starts_at
       FROM appointments a
       JOIN users u  ON u.id  = a.user_id
       JOIN pets p   ON p.id  = a.pet_id
       JOIN slots sl ON sl.id = a.slot_id
       WHERE a.id = $1`,
      [rows[0].id]
    );
    if (info.rows.length) {
      const { email, pet_name, starts_at } = info.rows[0];
      sendAppointmentConfirmation(email, {
        petName: pet_name,
        date: new Date(starts_at).toLocaleString('es-ES'),
      }).catch(() => {});
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/appointments/:id/cancel
export const cancelAppointment = async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE appointments SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Cita no encontrada' });

    // Libera el slot.
    await query('UPDATE slots SET is_available = true WHERE id = $1', [rows[0].slot_id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};
