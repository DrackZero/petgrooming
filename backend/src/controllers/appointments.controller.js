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
      `SELECT a.*, p.name AS pet_name, sl.starts_at, sl.ends_at,
              v.name AS vet_name
       FROM appointments a
       JOIN pets p ON p.id = a.pet_id
       JOIN availability_slots sl ON sl.id = a.slot_id
       LEFT JOIN users v ON v.id = sl.vet_id
       WHERE a.user_id = $1
       ORDER BY sl.starts_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/appointments/slots  → horarios disponibles (con su veterinario)
// ?vet_id=N filtra por veterinario · ?mine=1 (solo vet) muestra los propios
export const listAvailableSlots = async (req, res, next) => {
  try {
    const params = [];
    let where = 'sl.is_booked = false AND sl.starts_at > now()';

    if (req.query.mine === '1' && req.user.role === 'veterinario') {
      params.push(req.user.id);
      where += ` AND sl.vet_id = $${params.length}`;
    } else if (req.query.vet_id) {
      params.push(req.query.vet_id);
      where += ` AND sl.vet_id = $${params.length}`;
    }

    const { rows } = await query(
      `SELECT sl.*, v.name AS vet_name, c.name AS clinic_name
       FROM availability_slots sl
       LEFT JOIN users v ON v.id = sl.vet_id
       LEFT JOIN clinics c ON c.id = v.clinic_id
       WHERE ${where} AND (c.status IS NULL OR c.status = 'activa')
       ORDER BY sl.starts_at ASC`,
      params
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
      'INSERT INTO availability_slots (vet_id, starts_at, ends_at) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, starts_at, ends_at]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/appointments/slots/bulk  → genera la jornada laboral en bloque
// body: { start_date:'2026-07-07', end_date:'2026-07-18', weekdays:[1,2,3,4,5],
//         day_start:'08:00', day_end:'17:00', duration_min:60 }
// weekdays usa getDay() de JS: 0=domingo … 6=sábado.
export const createSlotsBulk = async (req, res, next) => {
  try {
    const { start_date, end_date, weekdays, day_start, day_end, duration_min } = req.body;

    if (!start_date || !end_date || !Array.isArray(weekdays) || !weekdays.length || !day_start || !day_end) {
      return res.status(400).json({ message: 'Faltan datos: fechas, días de la semana y horario de jornada' });
    }

    const dur = Number(duration_min) || 60;
    if (dur < 15 || dur > 240) {
      return res.status(400).json({ message: 'La duración de cada cita debe estar entre 15 y 240 minutos' });
    }

    const start = new Date(`${start_date}T00:00:00`);
    const end = new Date(`${end_date}T00:00:00`);
    if (isNaN(start) || isNaN(end) || end < start) {
      return res.status(400).json({ message: 'Rango de fechas inválido' });
    }
    if ((end - start) / 86400000 > 60) {
      return res.status(400).json({ message: 'El rango máximo es de 60 días' });
    }

    const toMin = (hhmm) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };
    const startMin = toMin(day_start);
    const endMin = toMin(day_end);
    if (!(startMin < endMin)) {
      return res.status(400).json({ message: 'La hora de inicio debe ser anterior a la de fin' });
    }

    // Horarios ya existentes DEL MISMO VETERINARIO en el rango (UC-19):
    // dos veterinarios sí pueden atender a la misma hora.
    const endPlus = new Date(end.getTime() + 86400000);
    const existing = await query(
      `SELECT starts_at, ends_at FROM availability_slots
       WHERE vet_id = $3 AND starts_at >= $1 AND starts_at < $2`,
      [start, endPlus, req.user.id]
    );
    const busy = existing.rows.map((r) => [new Date(r.starts_at), new Date(r.ends_at)]);

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const candidates = [];
    let skipped = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (!weekdays.includes(d.getDay())) continue;
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      for (let t = startMin; t + dur <= endMin; t += dur) {
        const cs = new Date(`${dateStr}T${pad(Math.floor(t / 60))}:${pad(t % 60)}:00`);
        const ce = new Date(cs.getTime() + dur * 60000);
        const clash = cs <= now || busy.some(([bs, be]) => bs < ce && be > cs);
        if (clash) { skipped++; continue; }
        candidates.push([cs, ce]);
      }
    }

    if (candidates.length > 500) {
      return res.status(400).json({ message: `Se generarían ${candidates.length} horarios (máx. 500). Reduce el rango o aumenta la duración.` });
    }

    for (const [cs, ce] of candidates) {
      await query(
        'INSERT INTO availability_slots (vet_id, starts_at, ends_at) VALUES ($1, $2, $3)',
        [req.user.id, cs, ce]
      );
    }

    res.status(201).json({ created: candidates.length, skipped });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/appointments/slots/:id  → eliminar horario libre
export const deleteSlot = async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM availability_slots WHERE id = $1 AND is_booked = false AND vet_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(409).json({ message: 'No existe, ya está reservado o no es tuyo' });
    res.json({ message: 'Horario eliminado' });
  } catch (err) {
    next(err);
  }
};

// GET /api/appointments/all  → las citas del veterinario autenticado
export const listAllAppointments = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.*, u.name AS client_name, p.name AS pet_name, sl.starts_at
       FROM appointments a
       JOIN users u ON u.id = a.user_id
       JOIN pets p  ON p.id = a.pet_id
       JOIN availability_slots sl ON sl.id = a.slot_id
       WHERE sl.vet_id = $1
       ORDER BY sl.starts_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/appointments/calendar?month=YYYY-MM  → resumen por día del mes
// (para pintar el calendario mensual del veterinario). Incluye tanto las
// citas (agrupadas por estado) como las franjas libres ('disponible') de
// los días donde ya definió horario pero nadie ha agendado todavía.
export const getCalendarSummary = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Formato de mes inválido (YYYY-MM)' });
    }
    const { rows } = await query(
      `SELECT sl.starts_at::date AS day, a.status, COUNT(*)::int AS count
       FROM appointments a
       JOIN availability_slots sl ON sl.id = a.slot_id
       WHERE sl.vet_id = $1 AND to_char(sl.starts_at, 'YYYY-MM') = $2
       GROUP BY day, a.status
       UNION ALL
       SELECT sl.starts_at::date AS day, 'disponible' AS status, COUNT(*)::int AS count
       FROM availability_slots sl
       WHERE sl.vet_id = $1 AND sl.is_booked = false AND to_char(sl.starts_at, 'YYYY-MM') = $2
       GROUP BY day
       ORDER BY day ASC`,
      [req.user.id, month]
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
       WHERE sl.starts_at::date = $1 AND sl.vet_id = $2
       ORDER BY sl.starts_at ASC`,
      [date, req.user.id]
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
    const slot = await query(
      'SELECT id FROM availability_slots WHERE id = $1 AND is_booked = false AND vet_id = $2',
      [slot_id, req.user.id]
    );
    if (!slot.rows.length) return res.status(409).json({ message: 'El horario no está disponible o no es tuyo' });

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
    // Solo el veterinario dueño del horario puede gestionar la cita.
    const { rows } = await query(
      `UPDATE appointments a SET status = $1, notes = COALESCE($2, a.notes)
       FROM availability_slots sl
       WHERE a.id = $3 AND sl.id = a.slot_id AND sl.vet_id = $4
       RETURNING a.*`,
      [status, notes || null, req.params.id, req.user.id]
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
