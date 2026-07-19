import { query } from '../config/db.js';
import { pushToUser } from '../ws.js';

// Devuelve la conversación solo si el usuario autenticado participa en ella.
const getOwnConversation = async (user, conversationId) => {
  const { rows } = await query(
    `SELECT c.*, u.name AS client_name, v.name AS vet_name
     FROM conversations c
     JOIN users u ON u.id = c.client_id
     JOIN users v ON v.id = c.vet_id
     WHERE c.id = $1 AND (c.client_id = $2 OR c.vet_id = $2)`,
    [conversationId, user.id]
  );
  return rows[0] || null;
};

// GET /api/chat/vets  → veterinarios activos para iniciar una urgencia
export const listVetsForChat = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name FROM users
       WHERE role = 'veterinario' AND is_active = true
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/chat/conversations  → conversaciones del usuario (cliente o vet)
export const listConversations = async (req, res, next) => {
  try {
    const col = req.user.role === 'veterinario' ? 'vet_id' : 'client_id';
    const { rows } = await query(
      `SELECT c.*, u.name AS client_name, v.name AS vet_name,
              lm.body AS last_message, lm.created_at AS last_at
       FROM conversations c
       JOIN users u ON u.id = c.client_id
       JOIN users v ON v.id = c.vet_id
       LEFT JOIN LATERAL (
         SELECT body, created_at FROM messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.id DESC LIMIT 1
       ) lm ON true
       WHERE c.${col} = $1
       ORDER BY (c.status = 'abierta') DESC, COALESCE(lm.created_at, c.created_at) DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/chat/conversations {vet_id}  → el cliente abre una urgencia
export const createConversation = async (req, res, next) => {
  try {
    const { vet_id } = req.body;
    if (!vet_id) return res.status(400).json({ message: 'vet_id es obligatorio' });

    const vet = await query(
      `SELECT id, name FROM users WHERE id = $1 AND role = 'veterinario' AND is_active = true`,
      [vet_id]
    );
    if (!vet.rows.length) return res.status(404).json({ message: 'Veterinario no disponible' });

    // Si ya hay una conversación abierta con ese vet, se reutiliza.
    const open = await query(
      `SELECT id FROM conversations
       WHERE client_id = $1 AND vet_id = $2 AND status = 'abierta'`,
      [req.user.id, vet_id]
    );
    const id = open.rows.length
      ? open.rows[0].id
      : (await query(
          `INSERT INTO conversations (client_id, vet_id) VALUES ($1, $2) RETURNING id`,
          [req.user.id, vet_id]
        )).rows[0].id;

    const conversation = await getOwnConversation(req.user, id);

    // Aviso en vivo al veterinario: nueva urgencia entrante.
    if (!open.rows.length) {
      pushToUser(vet_id, { type: 'conversation', conversation });
    }
    res.status(open.rows.length ? 200 : 201).json(conversation);
  } catch (err) {
    next(err);
  }
};

// GET /api/chat/conversations/:id/messages  → historial (solo participantes)
export const listMessages = async (req, res, next) => {
  try {
    const conv = await getOwnConversation(req.user, req.params.id);
    if (!conv) return res.status(404).json({ message: 'Conversación no encontrada' });
    const { rows } = await query(
      `SELECT m.*, s.name AS sender_name
       FROM messages m JOIN users s ON s.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.id ASC`,
      [req.params.id]
    );
    res.json({ conversation: conv, messages: rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/chat/conversations/:id/messages {body}  → enviar mensaje
// El guardado va por REST (fiable); la entrega en vivo, por WebSocket.
export const sendMessage = async (req, res, next) => {
  try {
    const body = (req.body.body || '').trim();
    if (!body) return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
    if (body.length > 2000) return res.status(400).json({ message: 'Mensaje demasiado largo (máx. 2000)' });

    const conv = await getOwnConversation(req.user, req.params.id);
    if (!conv) return res.status(404).json({ message: 'Conversación no encontrada' });
    if (conv.status !== 'abierta') {
      return res.status(409).json({ message: 'La conversación está cerrada' });
    }

    const { rows } = await query(
      `INSERT INTO messages (conversation_id, sender_id, body)
       VALUES ($1, $2, $3) RETURNING *`,
      [conv.id, req.user.id, body]
    );
    const message = { ...rows[0], sender_name: req.user.role === 'veterinario' ? conv.vet_name : conv.client_name };

    // Empuje en vivo a AMBOS participantes (incluye otras pestañas del emisor).
    const event = { type: 'message', conversationId: conv.id, message };
    pushToUser(conv.client_id, event);
    pushToUser(conv.vet_id, event);

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/chat/conversations/:id/close  → cerrar la urgencia
export const closeConversation = async (req, res, next) => {
  try {
    const conv = await getOwnConversation(req.user, req.params.id);
    if (!conv) return res.status(404).json({ message: 'Conversación no encontrada' });

    await query(`UPDATE conversations SET status = 'cerrada' WHERE id = $1`, [conv.id]);

    const event = { type: 'conversation_closed', conversationId: conv.id };
    pushToUser(conv.client_id, event);
    pushToUser(conv.vet_id, event);

    res.json({ ...conv, status: 'cerrada' });
  } catch (err) {
    next(err);
  }
};
