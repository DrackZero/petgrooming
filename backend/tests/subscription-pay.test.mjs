// Pruebas: pago de SUSCRIPCIÓN por Wompi de la plataforma. El webhook con
// referencia SUB-<clinicId>-<plan> activa la clínica con ese plan.
// Uso:  node tests/subscription-pay.test.mjs   (WOMPI_EVENTS_SECRET en .env)

import crypto from 'crypto';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

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
      headers: { 'Content-Type': 'application/json', Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie?.() || []) { const [p] = c.split(';'); const [k, v] = p.split('='); jar[k] = v; }
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data };
  };
};

// Evento de Wompi con checksum válido para una referencia y monto.
const buildEvent = (reference, amountCents, status = 'APPROVED') => {
  const timestamp = Math.floor(Date.now() / 1000);
  const tx = { id: `sub-${Date.now()}`, status, amount_in_cents: amountCents, reference };
  const values = `${tx.id}${tx.status}${tx.amount_in_cents}`;
  const checksum = crypto.createHash('sha256').update(`${values}${timestamp}${EVENTS_SECRET}`).digest('hex');
  return { event: 'transaction.updated', data: { transaction: tx }, timestamp, signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum } };
};

const db = new pg.Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : { host: process.env.PGHOST, port: process.env.PGPORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE }
);

const main = async () => {
  const gerente = session(), anon = session();
  const stamp = Date.now();

  // Gerente con clínica pendiente (sin activar).
  await gerente('POST', '/auth/register', { name: 'Gte Sub', email: `gsub${stamp}@test.com`, password: 'g123456', manage_clinic: true, clinic: { name: `Clinica Sub ${stamp}` } });
  const clinic = (await gerente('GET', '/gerente/clinic')).data;
  const clinicId = clinic.id;

  console.log('══ 1. ESTADO INICIAL ══');
  check('La clínica nace pendiente en plan básico', clinic.status === 'pendiente' && clinic.plan === 'basico');

  console.log('\n══ 2. INICIAR PAGO DE SUSCRIPCION ══');
  const pay = await gerente('POST', '/gerente/subscription/pay', { plan: 'pro' });
  check('Genera datos de pago (referencia SUB-<clinic>-pro)',
    pay.status === 200 && (pay.data.payment?.reference === `SUB-${clinicId}-pro` || pay.data.payment?.provider === 'mock'));
  check('Plan inválido rechazado (400)', (await gerente('POST', '/gerente/subscription/pay', { plan: 'gratis' })).status === 400);

  console.log('\n══ 3. WEBHOOK APROBADO ACTIVA LA CLINICA ══');
  const ev = buildEvent(`SUB-${clinicId}-pro`, 15000000);
  check('Webhook responde 200', (await anon('POST', '/orders/webhook', ev)).status === 200);
  const after = (await gerente('GET', '/gerente/clinic')).data;
  check('La clínica queda ACTIVA', after.status === 'activa');
  check('Y con el plan pagado (pro)', after.plan === 'pro');

  console.log('\n══ 4. SEGURIDAD DEL WEBHOOK ══');
  const bad = buildEvent(`SUB-${clinicId}-basico`, 6000000);
  bad.signature.checksum = 'deadbeef'.repeat(8);
  check('Checksum inválido → 403', (await anon('POST', '/orders/webhook', bad)).status === 403);
  const stillPro = (await gerente('GET', '/gerente/clinic')).data;
  check('Un evento inválido NO cambia el plan', stillPro.plan === 'pro');

  console.log('\n══ 5. LA TIENDA SIGUE EN SIMULACION ══');
  const admin = session();
  await admin('POST', '/auth/login', { email: 'admin@petgrooming.com', password: 'admin123' });
  const prod = await admin('POST', '/admin/products', { name: `Prod ${stamp}`, price: 20000, stock: 3 });
  const cli = session();
  await cli('POST', '/auth/register', { name: 'Cli', email: `cli${stamp}@test.com`, password: 'c123456' });
  const order = await cli('POST', '/orders', { items: [{ product_id: prod.data.id, quantity: 1 }], payment_method: 'tarjeta', shipping_address: 'X' });
  check('La compra en tienda usa pago SIMULADO (mock)', order.data?.payment?.provider === 'mock');

  // Limpieza
  await db.query('DELETE FROM users WHERE email LIKE $1', [`%${stamp}@test.com`]);
  await db.query('DELETE FROM products WHERE name = $1', [`Prod ${stamp}`]);
  await db.query('DELETE FROM clinics WHERE name LIKE $1', [`Clinica Sub ${stamp}`]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
