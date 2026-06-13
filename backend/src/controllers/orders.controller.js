import pool, { query } from '../config/db.js';
import { createPaymentIntent } from '../services/payment.service.js';

// GET /api/orders/products  → catálogo de la tienda
export const listProducts = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM products WHERE active = true ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders  → historial de pedidos del usuario
export const listOrders = async (req, res, next) => {
  try {
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
  const client = await pool.connect();
  try {
    const { items } = req.body;
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
      'INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *',
      [req.user.id, total]
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

    // Intención de pago (simulada por defecto).
    const payment = await createPaymentIntent({
      amount: Math.round(total * 100),
      metadata: { orderId: order.id, userId: req.user.id },
    });

    res.status(201).json({ order, payment });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
