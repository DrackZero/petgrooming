import pool, { query } from '../config/db.js';
import {
  wompiEnabled,
  buildCheckout,
  verifyEventChecksum,
  mockPayment,
} from '../services/payment.service.js';
import { sendEmail } from '../services/email.service.js';

// Sistema antiabandono: un pedido 'pendiente' que no se paga en N minutos
// se cancela automáticamente y su stock vuelve al inventario.
const pendingTTL = () => Number(process.env.ORDER_PENDING_TTL_MIN || 30);

export const expireStaleOrders = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE orders SET status = 'cancelada'
       WHERE status = 'pendiente'
         AND created_at < now() - ($1 || ' minutes')::interval
       RETURNING id`,
      [pendingTTL()]
    );
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      await client.query(
        `UPDATE products p SET stock = p.stock + oi.qty
         FROM (SELECT product_id, SUM(quantity) AS qty
               FROM order_items WHERE order_id = ANY($1::int[])
               GROUP BY product_id) oi
         WHERE p.id = oi.product_id`,
        [ids]
      );
    }
    await client.query('COMMIT');
    return rows.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// GET /api/orders/products  → catálogo público: solo de clínicas Pro
// con la tienda activada. Cada producto lleva el nombre de su clínica.
export const listProducts = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, c.name AS clinic_name
       FROM products p
       JOIN clinics c ON c.id = p.clinic_id
       WHERE p.active = true
         AND c.status = 'activa' AND c.plan = 'pro' AND c.store_enabled = true
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders  → historial de pedidos del usuario
export const listOrders = async (req, res, next) => {
  try {
    await expireStaleOrders(); // limpia pendientes vencidos antes de listar
    const { rows } = await query(
      `SELECT o.*,
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'name', p.name
              )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p     ON p.id = oi.product_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/orders  → crea un pedido a partir del carrito
// body: { items: [{ product_id, quantity }] }
export const createOrder = async (req, res, next) => {
  await expireStaleOrders().catch(() => {}); // libera stock retenido por abandonos
  const client = await pool.connect();
  try {
    const { items, payment_method, shipping_address } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'El carrito está vacío' });
    }

    await client.query('BEGIN');

    // Trae los productos implicados y valida stock.
    const ids = items.map((i) => i.product_id);
    const prodRes = await client.query(
      'SELECT id, price, stock, name FROM products WHERE id = ANY($1::int[])',
      [ids]
    );
    const products = Object.fromEntries(prodRes.rows.map((p) => [p.id, p]));

    let total = 0;
    for (const item of items) {
      const p = products[item.product_id];
      if (!p) throw Object.assign(new Error('Producto inexistente'), { status: 400 });
      if (p.stock < item.quantity) {
        throw Object.assign(new Error(`Sin stock suficiente de ${p.name}`), { status: 409 });
      }
      total += Number(p.price) * item.quantity;
    }

    const orderRes = await client.query(
      `INSERT INTO orders (user_id, total, payment_method, shipping_address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, total, payment_method || null, shipping_address || null]
    );
    const order = orderRes.rows[0];

    for (const item of items) {
      const p = products[item.product_id];
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, p.price]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [
        item.quantity,
        item.product_id,
      ]);
    }

    await client.query('COMMIT');

    // Datos de pago: Wompi Web Checkout si hay llaves; simulado si no.
    const payment = wompiEnabled()
      ? buildCheckout(order.id, total)
      : mockPayment(order.id, total);

    res.status(201).json({ order, payment });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/orders/:id/pay  → reintentar el pago de un pedido pendiente
export const payOrder = async (req, res, next) => {
  try {
    await expireStaleOrders().catch(() => {});
    const { rows } = await query(
      'SELECT id, total, status FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Pedido no encontrado' });
    if (rows[0].status !== 'pendiente') {
      return res.status(409).json({ message: `El pedido ya no está pendiente (${rows[0].status})` });
    }
    const payment = wompiEnabled()
      ? buildCheckout(rows[0].id, rows[0].total)
      : mockPayment(rows[0].id, rows[0].total);
    res.json({ payment });
  } catch (err) {
    next(err);
  }
};

// POST /api/orders/webhook  → eventos de Wompi (público, validado por checksum)
// Wompi llama aquí cuando una transacción cambia de estado (UC-32).
export const wompiWebhook = async (req, res, next) => {
  try {
    const event = req.body || {};

    if (!verifyEventChecksum(event)) {
      return res.status(403).json({ message: 'Firma de evento inválida' });
    }

    const tx = event.data?.transaction;
    if (event.event === 'transaction.updated' && tx?.reference?.startsWith('PG-')) {
      const orderId = Number(tx.reference.split('-')[1]);
      const statusMap = { APPROVED: 'aprobado', DECLINED: 'rechazado', VOIDED: 'fallido', ERROR: 'fallido' };
      const payStatus = statusMap[tx.status] || 'pendiente';

      // Registra (o actualiza) el resultado de la transacción para auditoría.
      await query(
        `INSERT INTO payments (order_id, transaction_id, amount, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (order_id) DO UPDATE
           SET transaction_id = EXCLUDED.transaction_id, status = EXCLUDED.status`,
        [orderId, tx.id, (tx.amount_in_cents || 0) / 100, payStatus]
      );

      // Pago aprobado → la orden pasa a 'pagada' y se notifica al cliente.
      if (tx.status === 'APPROVED') {
        const cur = await query('SELECT status, user_id, total FROM orders WHERE id = $1', [orderId]);
        const prev = cur.rows[0];
        if (prev && ['pendiente', 'cancelada'].includes(prev.status)) {
          await query(`UPDATE orders SET status = 'pagada' WHERE id = $1`, [orderId]);

          // Caso límite: expiró por abandono pero el pago sí llegó →
          // se reactiva y se vuelve a descontar el stock que se había devuelto.
          if (prev.status === 'cancelada') {
            await query(
              `UPDATE products p SET stock = GREATEST(p.stock - oi.qty, 0)
               FROM (SELECT product_id, SUM(quantity) AS qty
                     FROM order_items WHERE order_id = $1
                     GROUP BY product_id) oi
               WHERE p.id = oi.product_id`,
              [orderId]
            );
          }

          const { user_id, total } = prev;
          await query(
            `INSERT INTO notifications (user_id, type, status) VALUES ($1, 'pedido', 'enviada')`,
            [user_id]
          );
          const u = await query('SELECT email, name FROM users WHERE id = $1', [user_id]);
          if (u.rows.length) {
            sendEmail({
              to: u.rows[0].email,
              subject: `Pago confirmado — pedido #${orderId} 🐾`,
              html: `<h2>¡Gracias por tu compra, ${u.rows[0].name}!</h2>
                     <p>Tu pago del pedido <strong>#${orderId}</strong> por <strong>$ ${Number(total).toLocaleString('es-CO')} COP</strong> fue aprobado.</p>
                     <p>Pronto prepararemos tu envío. — PetGrooming</p>`,
            }).catch(() => {});
          }
        }
      }
    }

    // Siempre 200 rápido: Wompi reintenta si no recibe respuesta.
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};
