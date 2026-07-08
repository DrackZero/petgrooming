// Pruebas del sistema antiabandono de pedidos:
// pendiente > TTL -> se cancela solo y devuelve el stock; boton "Pagar ahora".
// Uso:  node tests/order-expiry.test.mjs   (API en localhost:4000 y BD local)

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.API_URL || 'http://localhost:4000/api';
let pass = 0, fail = 0;

const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  [OK] ${name}`); }
  else { fail++; console.log(`  [FALLO] ${name} ${extra}`); }
};

const session = () => {
  const jar = {};
  return async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const [k, v] = pair.split('=');
      jar[k] = v;
    }
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data };
  };
};

// Conexión directa a la BD solo para "envejecer" pedidos en la prueba.
const db = new pg.Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST, port: process.env.PGPORT,
        user: process.env.PGUSER, password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
      }
);

const main = async () => {
  const admin = session(), cli = session();
  const stamp = Date.now();

  await admin('POST', '/auth/login', { email: 'admin@petgrooming.com', password: 'admin123' });
  await cli('POST', '/auth/register', { name: 'Abandonador', email: `aband${stamp}@test.com`, password: 'ab1234' });
  const prod = (await admin('POST', '/admin/products', { name: `Juguete kong ${stamp}`, description: 't', price: 50000, stock: 5, category: 'juguetes' })).data;

  console.log('══ 1. EL PEDIDO DESCUENTA STOCK ══');
  const o1 = (await cli('POST', '/orders', { items: [{ product_id: prod.id, quantity: 2 }], payment_method: 'tarjeta', shipping_address: 'X' })).data.order;
  const stock1 = (await cli('GET', '/orders/products')).data.find((p) => p.id === prod.id).stock;
  check('Stock 5 -> 3 al crear pedido', stock1 === 3, `-> ${stock1}`);

  console.log('\n══ 2. EXPIRACION AUTOMATICA (40 min despues) ══');
  await db.query("UPDATE orders SET created_at = created_at - interval '40 minutes' WHERE id = $1", [o1.id]);
  const orders = (await cli('GET', '/orders')).data; // listar dispara la limpieza
  const expired = orders.find((o) => o.id === o1.id);
  check("Pedido pasa a 'cancelada' solo", expired?.status === 'cancelada', `-> ${expired?.status}`);
  const stock2 = (await cli('GET', '/orders/products')).data.find((p) => p.id === prod.id).stock;
  check('Stock devuelto al inventario (5)', stock2 === 5, `-> ${stock2}`);

  console.log('\n══ 3. BOTON "PAGAR AHORA" ══');
  const o2 = (await cli('POST', '/orders', { items: [{ product_id: prod.id, quantity: 1 }], payment_method: 'nequi', shipping_address: 'X' })).data.order;
  const pay = await cli('GET', `/orders/${o2.id}/pay`);
  check('Pedido pendiente devuelve datos de pago', pay.status === 200 && pay.data.payment?.reference === `PG-${o2.id}`);
  const payCancelled = await cli('GET', `/orders/${o1.id}/pay`);
  check('Pedido cancelado no se puede pagar (409)', payCancelled.status === 409);
  const other = session();
  await other('POST', '/auth/register', { name: 'Otro', email: `otro${stamp}@test.com`, password: 'ot1234' });
  check('Pedido ajeno no se puede pagar (404)', (await other('GET', `/orders/${o2.id}/pay`)).status === 404);

  console.log('\n══ 4. REACTIVACION: pago llega tras expirar ══');
  await db.query("UPDATE orders SET created_at = created_at - interval '40 minutes' WHERE id = $1", [o2.id]);
  await cli('GET', '/orders'); // fuerza expiración de o2 (stock vuelve a 5)
  // Simula el webhook APPROVED sin firma estricta usando el secreto local.
  const crypto = await import('crypto');
  const timestamp = Math.floor(Date.now() / 1000);
  const tx = { id: `tx-exp-${stamp}`, status: 'APPROVED', amount_in_cents: 5000000, reference: `PG-${o2.id}` };
  const values = `${tx.id}${tx.status}${tx.amount_in_cents}`;
  const checksum = crypto.createHash('sha256')
    .update(`${values}${timestamp}${process.env.WOMPI_EVENTS_SECRET || 'secreto_local_pruebas_webhook'}`)
    .digest('hex');
  const event = {
    event: 'transaction.updated',
    data: { transaction: tx },
    timestamp,
    signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum },
  };
  await cli('POST', '/orders/webhook', event);
  const reactivated = (await cli('GET', '/orders')).data.find((o) => o.id === o2.id);
  check("Pedido expirado se reactiva a 'pagada'", reactivated?.status === 'pagada', `-> ${reactivated?.status}`);
  const stock3 = (await cli('GET', '/orders/products')).data.find((p) => p.id === prod.id).stock;
  check('Stock re-descontado tras reactivar (4)', stock3 === 4, `-> ${stock3}`);

  // Limpieza
  await db.query('DELETE FROM users WHERE email LIKE $1', [`%${stamp}@test.com`]);
  await db.query('DELETE FROM products WHERE id = $1', [prod.id]).catch(() => {});
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
