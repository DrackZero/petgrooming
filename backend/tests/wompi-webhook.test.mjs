// Pruebas del webhook de Wompi (UC-32): checksum, aprobación y rechazo.
// Requiere WOMPI_EVENTS_SECRET en el .env del backend (valor local de pruebas).
// Uso:  node tests/wompi-webhook.test.mjs

import crypto from 'crypto';

const BASE = process.env.API_URL || 'http://localhost:4000/api';
const EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET || 'secreto_local_pruebas_webhook';
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

// Construye un evento de Wompi con checksum válido (mismo algoritmo del servicio).
const buildEvent = (tx, { badChecksum = false } = {}) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
  const values = `${tx.id}${tx.status}${tx.amount_in_cents}`;
  const checksum = badChecksum
    ? 'deadbeef'.repeat(8)
    : crypto.createHash('sha256').update(`${values}${timestamp}${EVENTS_SECRET}`).digest('hex');
  return {
    event: 'transaction.updated',
    data: { transaction: tx },
    timestamp,
    signature: { properties, checksum },
  };
};

const main = async () => {
  const admin = session(), cli = session(), anon = session();
  const stamp = Date.now();

  // ══ SETUP: producto y pedido pendiente ══
  await admin('POST', '/auth/login', { email: 'admin@petgrooming.com', password: 'admin123' });
  await cli('POST', '/auth/register', { name: 'Comprador Wompi', email: `wompi${stamp}@test.com`, password: 'w123456' });
  const prod = (await admin('POST', '/admin/products', { name: 'Collar premium', description: 'Test', price: 50000, stock: 5, category: 'accesorios' })).data;
  const orderRes = (await cli('POST', '/orders', {
    items: [{ product_id: prod.id, quantity: 1 }],
    payment_method: 'tarjeta',
    shipping_address: 'Calle 1 # 2-3',
  })).data;
  const order = orderRes.order;
  console.log(`Setup: pedido #${order.id} total=${order.total} (${orderRes.payment.provider})\n`);

  console.log('══ 1. SEGURIDAD DEL WEBHOOK ══');
  const evBad = buildEvent({ id: `tx-${stamp}-a`, status: 'APPROVED', amount_in_cents: 5000000, reference: `PG-${order.id}` }, { badChecksum: true });
  check('Checksum inválido -> 403', (await anon('POST', '/orders/webhook', evBad)).status === 403);

  console.log('\n══ 2. PAGO APROBADO ══');
  const evOk = buildEvent({ id: `tx-${stamp}-b`, status: 'APPROVED', amount_in_cents: 5000000, reference: `PG-${order.id}` });
  const r1 = await anon('POST', '/orders/webhook', evOk);
  check('Webhook responde 200', r1.status === 200);
  const orders1 = (await cli('GET', '/orders')).data;
  const o1 = orders1.find((o) => o.id === order.id);
  check("Pedido pasa a 'pagada'", o1?.status === 'pagada');

  console.log('\n══ 3. IDEMPOTENCIA / REENVÍO ══');
  const r2 = await anon('POST', '/orders/webhook', evOk);
  check('Reenvío del evento no falla (200)', r2.status === 200);
  const o2 = (await cli('GET', '/orders')).data.find((o) => o.id === order.id);
  check("Pedido sigue 'pagada'", o2?.status === 'pagada');

  console.log('\n══ 4. PAGO RECHAZADO (otro pedido) ══');
  const orderRes2 = (await cli('POST', '/orders', {
    items: [{ product_id: prod.id, quantity: 1 }],
    payment_method: 'nequi',
    shipping_address: 'Calle 1 # 2-3',
  })).data;
  const order2 = orderRes2.order;
  const evDecl = buildEvent({ id: `tx-${stamp}-c`, status: 'DECLINED', amount_in_cents: 5000000, reference: `PG-${order2.id}` });
  await anon('POST', '/orders/webhook', evDecl);
  const o3 = (await cli('GET', '/orders')).data.find((o) => o.id === order2.id);
  check("Pedido rechazado permanece 'pendiente' (segun doc)", o3?.status === 'pendiente');

  console.log('\n══ 5. EVENTO AJENO ══');
  const evOther = buildEvent({ id: `tx-${stamp}-d`, status: 'APPROVED', amount_in_cents: 100, reference: 'OTRA-REF-123' });
  check('Referencia ajena se ignora (200)', (await anon('POST', '/orders/webhook', evOther)).status === 200);

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
