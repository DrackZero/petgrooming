// Pruebas: ciclo de vida de la suscripción — pago (simulado) que otorga
// vigencia, renovación que suma días, vencimiento que suspende sola a la
// clínica, y controles del admin (vencer ahora / extender).
// Uso:  node tests/subscription-cycle.test.mjs   (API en localhost:4000 y BD local)

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
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';'); const [k, v] = pair.split('='); jar[k] = v;
    }
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data };
  };
};

const db = new pg.Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : { host: process.env.PGHOST, port: process.env.PGPORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE }
);

const daysFromNow = (d) => Math.round((new Date(d) - Date.now()) / 86400000);

const main = async () => {
  const admin = session(), gerente = session();
  const stamp = Date.now();
  const clinicName = `Vet Ciclo ${stamp}`;

  await admin('POST', '/auth/login', { email: 'admin@petgrooming.com', password: 'admin123' });

  console.log('══ 1. CLINICA NUEVA: SIN VIGENCIA ══');
  await gerente('POST', '/auth/register', {
    name: 'Gerente Ciclo', email: `gciclo${stamp}@test.com`, password: 'g123456',
    manage_clinic: true, clinic: { name: clinicName },
  });
  let mine = (await gerente('GET', '/gerente/clinic')).data;
  const clinicId = mine.id;
  check('Nace pendiente', mine.status === 'pendiente');
  check('Sin fecha de vencimiento (nunca ha pagado)', mine.subscription_expires_at === null);

  console.log('\n══ 2. PAGO SIMULADO: ACTIVA Y OTORGA 30 DIAS ══');
  const payInit = await gerente('POST', '/gerente/subscription/pay', { plan: 'pro' });
  check('El pago se inicia en modo simulado', payInit.data.payment?.provider === 'mock', `-> ${JSON.stringify(payInit.data)}`);

  const confirm = await gerente('POST', '/gerente/subscription/confirm', { plan: 'pro' });
  check('Confirmar el pago simulado (200)', confirm.status === 200);
  check('La clínica queda activa', confirm.data.clinic?.status === 'activa');
  check('En plan pro', confirm.data.clinic?.plan === 'pro');
  const exp1 = confirm.data.clinic.subscription_expires_at;
  check('Vigencia de ~30 días', daysFromNow(exp1) === 30, `-> ${daysFromNow(exp1)} días`);
  check('Queda registrado el pago', confirm.data.payment?.amount == 150000);

  console.log('\n══ 3. RENOVAR SUMA DIAS, NO LOS REINICIA ══');
  const renew = await gerente('POST', '/gerente/subscription/confirm', { plan: 'pro' });
  check('Renovación aceptada', renew.status === 200);
  check('Ahora vence en ~60 días (se sumó al restante)', daysFromNow(renew.data.clinic.subscription_expires_at) === 60,
    `-> ${daysFromNow(renew.data.clinic.subscription_expires_at)} días`);

  const history = await gerente('GET', '/gerente/subscription/payments');
  check('El historial muestra los 2 pagos', history.data.length === 2);

  console.log('\n══ 4. INGRESO REAL vs PROYECTADO (ADMIN) ══');
  const sub = (await admin('GET', '/admin/subscription')).data;
  check('Reporta recaudo real del mes', sub.collectedThisMonth >= 300000, `-> ${sub.collectedThisMonth}`);
  check('Reporta pagos del mes', sub.paymentsThisMonth >= 2);
  check('Sigue reportando el proyectado', typeof sub.monthlyRevenue === 'number');

  console.log('\n══ 5. AL VENCER, LA CLINICA SE SUSPENDE SOLA ══');
  // Se fuerza el vencimiento en BD (simula el paso del tiempo).
  await db.query(
    `UPDATE clinics SET subscription_expires_at = now() - interval '1 hour' WHERE id = $1`,
    [clinicId]
  );
  const afterExpiry = (await gerente('GET', '/gerente/clinic')).data;
  check('El gerente la ve suspendida', afterExpiry.status === 'suspendida', `-> ${afterExpiry.status}`);
  check('Y su tienda apagada', afterExpiry.store_enabled === false);

  console.log('\n══ 6. EL CANDADO CONGELA AL VETERINARIO ══');
  const rv = await session()('POST', '/auth/register', { name: 'Vet Ciclo', email: `vciclo${stamp}@test.com`, password: 'v123456' });
  await admin('PATCH', `/admin/users/${rv.data.user.id}/vet`);
  await admin('PATCH', `/admin/vets/${rv.data.user.id}/clinic`, { clinic_id: clinicId });
  const vet = session();
  await vet('POST', '/auth/login', { email: `vciclo${stamp}@test.com`, password: 'v123456' });

  const t = new Date(Date.now() + 8.64e7).toISOString(), t2 = new Date(Date.now() + 9e7).toISOString();
  check('Con suscripción vencida NO puede crear horario (403)',
    (await vet('POST', '/appointments/slots', { starts_at: t, ends_at: t2 })).status === 403);

  console.log('\n══ 7. RENOVAR REACTIVA AL INSTANTE ══');
  const reactivate = await gerente('POST', '/gerente/subscription/confirm', { plan: 'pro' });
  check('Tras renovar, vuelve a estar activa', reactivate.data.clinic?.status === 'activa');
  check('Con vigencia nueva de ~30 días', daysFromNow(reactivate.data.clinic.subscription_expires_at) === 30);
  check('El veterinario puede volver a operar (201)',
    (await vet('POST', '/appointments/slots', { starts_at: t, ends_at: t2 })).status === 201);

  console.log('\n══ 8. CONTROLES DEL ADMIN ══');
  const expired = await admin('PATCH', `/admin/clinics/${clinicId}/expire`);
  check('"Vencer ahora" suspende la clínica', expired.data?.status === 'suspendida');

  const extended = await admin('PATCH', `/admin/clinics/${clinicId}/expiry`, {
    expires_at: new Date(Date.now() + 10 * 86400000).toISOString(),
  });
  check('Fijar vencimiento futuro la reactiva', extended.data?.status === 'activa');
  check('Con la fecha indicada (~10 días)', daysFromNow(extended.data.subscription_expires_at) === 10);
  check('Fecha inválida → 400',
    (await admin('PATCH', `/admin/clinics/${clinicId}/expiry`, { expires_at: 'no-es-fecha' })).status === 400);

  console.log('\n══ 9. PERMISOS ══');
  check('El gerente NO puede vencer clínicas (403)',
    (await gerente('PATCH', `/admin/clinics/${clinicId}/expire`)).status === 403);
  check('Plan inválido al confirmar → 400',
    (await gerente('POST', '/gerente/subscription/confirm', { plan: 'gratis' })).status === 400);

  // Limpieza
  await db.query('DELETE FROM users WHERE email LIKE $1', [`%${stamp}@test.com`]);
  await db.query('DELETE FROM clinics WHERE name = $1', [clinicName]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
