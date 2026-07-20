// Pruebas Fase C: tienda por clínica, solo plan Pro, con interruptor.
// El cliente solo ve productos de clínicas Pro con tienda activa.
// Uso:  node tests/store-clinic.test.mjs

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
      headers: { 'Content-Type': 'application/json', Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie?.() || []) { const [p] = c.split(';'); const [k, v] = p.split('='); jar[k] = v; }
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data };
  };
};

const db = new pg.Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : { host: process.env.PGHOST, port: process.env.PGPORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE }
);

const setupGerente = async (admin, stamp, suffix, plan) => {
  const g = session();
  await g('POST', '/auth/register', { name: `Gte ${suffix}`, email: `gte${suffix}${stamp}@test.com`, password: 'g123456', manage_clinic: true, clinic: { name: `Clinica ${suffix} ${stamp}` } });
  const clinicId = (await g('GET', '/gerente/clinic')).data.id;
  await admin('PATCH', `/admin/clinics/${clinicId}/status`, { status: 'activa' });
  if (plan === 'pro') await admin('PATCH', `/admin/clinics/${clinicId}/plan`, { plan: 'pro' });
  return { g, clinicId };
};

const main = async () => {
  const admin = session(), cli = session();
  const stamp = Date.now();
  await admin('POST', '/auth/login', { email: 'admin@petgrooming.com', password: 'admin123' });

  console.log('══ 1. GERENTE BASICO: SIN TIENDA ══');
  const { g: gBasico } = await setupGerente(admin, stamp, 'Basica', 'basico');
  check('Gerente básico NO puede activar tienda (403)', (await gBasico('PATCH', '/gerente/store', { enabled: true })).status === 403);
  check('Gerente básico NO puede crear producto (403)', (await gBasico('POST', '/gerente/products', { name: 'X', price: 1000, stock: 1 })).status === 403);

  console.log('\n══ 2. GERENTE PRO: TIENDA Y CATALOGO ══');
  const { g: gPro, clinicId: proId } = await setupGerente(admin, stamp, 'Pro', 'pro');
  const prod = await gPro('POST', '/gerente/products', { name: `Correa ${stamp}`, price: 30000, stock: 5, category: 'accesorios' });
  check('Gerente Pro crea producto', prod.status === 201 && prod.data.clinic_id === proId);
  const mine = (await gPro('GET', '/gerente/products')).data;
  check('Ve solo SUS productos', mine.length === 1 && mine[0].id === prod.data.id);

  console.log('\n══ 3. EL INTERRUPTOR CONTROLA LA VISIBILIDAD ══');
  // Tienda apagada por defecto → el cliente no ve el producto.
  let shop = (await cli('GET', '/orders/products')).data;
  check('Con tienda APAGADA el producto NO aparece', !shop.some((p) => p.id === prod.data.id));
  // Encender la tienda.
  const on = await gPro('PATCH', '/gerente/store', { enabled: true });
  check('Gerente Pro activa su tienda', on.data.store_enabled === true);
  shop = (await cli('GET', '/orders/products')).data;
  const visible = shop.find((p) => p.id === prod.data.id);
  check('Con tienda ENCENDIDA el producto aparece con su clínica', visible?.clinic_name?.startsWith('Clinica Pro'));

  console.log('\n══ 4. SUSPENDER LA CLINICA OCULTA LA TIENDA ══');
  await admin('PATCH', `/admin/clinics/${proId}/status`, { status: 'suspendida' });
  shop = (await cli('GET', '/orders/products')).data;
  check('Clínica suspendida → su tienda desaparece', !shop.some((p) => p.id === prod.data.id));

  console.log('\n══ 5. AISLAMIENTO ENTRE CLINICAS ══');
  const { g: gOtro } = await setupGerente(admin, stamp, 'Otra', 'pro');
  check('Otro gerente NO ve productos ajenos', !(await gOtro('GET', '/gerente/products')).data.some((p) => p.id === prod.data.id));
  check('Otro gerente NO puede editar producto ajeno (404)',
    (await gOtro('PUT', `/gerente/products/${prod.data.id}`, { name: 'hack' })).status === 404);

  // Limpieza
  await db.query('DELETE FROM users WHERE email LIKE $1', [`%${stamp}@test.com`]);
  await db.query('DELETE FROM clinics WHERE name LIKE $1', [`Clinica %${stamp}`]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
