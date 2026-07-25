// Pruebas Fase A: rol GERENTE, alta de clínica con suscripción y el candado
// (una clínica no activa deja a sus veterinarios sin operar).
// Uso:  node tests/gerente-flow.test.mjs   (API en localhost:4000 y BD local)

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

// Franja en una fecha futura a una hora FIJA dentro del horario de atención
// de la clínica (07:00–19:00 por defecto). La hora se ancla explícitamente a
// la zona de Colombia (-05:00), que es contra la que valida el backend, para
// que la prueba no dependa ni del momento del día ni del huso horario de la
// máquina que la ejecuta.
const slotAt = (hora = 9, dias = 1) => {
  const d = new Date(Date.now() + dias * 86400000);
  const p = (n) => String(n).padStart(2, '0');
  return new Date(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hora)}:00:00-05:00`);
};

const main = async () => {
  const admin = session(), gerente = session();
  const stamp = Date.now();

  await admin('POST', '/auth/login', { email: 'admin@petgrooming.com', password: 'admin123' });

  console.log('══ 1. ALTA DE GERENTE ══');
  const reg = await gerente('POST', '/auth/register', {
    name: 'Gerente Prueba', email: `gerente${stamp}@test.com`, password: 'g123456',
    manage_clinic: true, clinic: { name: `Vet Central ${stamp}`, address: 'Calle 5', phone: '3120000000' },
  });
  check('Se registra con rol gerente (201)', reg.status === 201 && reg.data.user.role === 'gerente');
  check('Registro gerente sin nombre de clínica (400)', (await session()('POST', '/auth/register', {
    name: 'X', email: `x${stamp}@test.com`, password: 'x123456', manage_clinic: true, clinic: {},
  })).status === 400);

  const mine = await gerente('GET', '/gerente/clinic');
  check('El gerente ve su clínica', mine.status === 200 && mine.data.name === `Vet Central ${stamp}`);
  check('Su clínica nace PENDIENTE', mine.data.status === 'pendiente');
  check('Su clínica nace en plan básico', mine.data.plan === 'basico');
  const clinicId = mine.data.id;

  console.log('\n══ 2. PERMISOS DEL GERENTE ══');
  check('Gerente NO accede al panel admin (403)', (await gerente('GET', '/admin/clinics')).status === 403);
  const vetTry = await gerente('POST', '/appointments/slots', { starts_at: slotAt(9).toISOString(), ends_at: slotAt(10).toISOString() });
  check('Gerente NO puede crear horarios (no atiende, 403)', vetTry.status === 403);

  console.log('\n══ 3. EL ADMIN GESTIONA LA SUSCRIPCION ══');
  const clinics = await admin('GET', '/admin/clinics');
  const found = clinics.data.find((c) => c.id === clinicId);
  check('El admin ve la clínica con su gerente', found?.manager_name === 'Gerente Prueba');
  check('Cambiar plan a pro', (await admin('PATCH', `/admin/clinics/${clinicId}/plan`, { plan: 'pro' })).data.plan === 'pro');
  check('Plan inválido (400)', (await admin('PATCH', `/admin/clinics/${clinicId}/plan`, { plan: 'gratis' })).status === 400);
  const act = await admin('PATCH', `/admin/clinics/${clinicId}/status`, { status: 'activa' });
  check('Activar la clínica', act.data.status === 'activa');

  console.log('\n══ 4. EL CANDADO DE SUSCRIPCION ══');
  // Un veterinario nuevo, asignado a la clínica del gerente.
  const tmp = session();
  const rv = await tmp('POST', '/auth/register', { name: `Vet Central ${stamp}`, email: `vetc${stamp}@test.com`, password: 'v123456' });
  await admin('PATCH', `/admin/users/${rv.data.user.id}/vet`);
  await admin('PATCH', `/admin/vets/${rv.data.user.id}/clinic`, { clinic_id: clinicId });
  const vet = session();
  await vet('POST', '/auth/login', { email: `vetc${stamp}@test.com`, password: 'v123456' });

  const t = slotAt(9).toISOString(), t2 = slotAt(10).toISOString();
  check('Con clínica ACTIVA el vet crea horario', (await vet('POST', '/appointments/slots', { starts_at: t, ends_at: t2 })).status === 201);

  // Suspender la clínica → el vet queda congelado.
  await admin('PATCH', `/admin/clinics/${clinicId}/status`, { status: 'suspendida' });
  const t3 = slotAt(9, 2).toISOString(), t4 = slotAt(10, 2).toISOString();
  check('Con clínica SUSPENDIDA el vet NO puede crear horario (403)', (await vet('POST', '/appointments/slots', { starts_at: t3, ends_at: t4 })).status === 403);

  // Y sus horarios ya no aparecen para agendar.
  const cli = session();
  await cli('POST', '/auth/register', { name: 'Cli', email: `cli${stamp}@test.com`, password: 'c123456' });
  const publicSlots = (await cli('GET', '/appointments/slots')).data;
  check('Los horarios de una clínica suspendida NO se ofrecen', !publicSlots.some((s) => s.vet_id === rv.data.user.id));

  console.log('\n══ 5. INGRESOS POR SUSCRIPCION ══');
  const subBefore = (await admin('GET', '/admin/subscription')).data;
  await admin('PATCH', `/admin/clinics/${clinicId}/status`, { status: 'activa' }); // pro activa
  const subAfter = (await admin('GET', '/admin/subscription')).data;
  check('El ingreso mensual sube al reactivar (pro = +150000)', subAfter.monthlyRevenue - subBefore.monthlyRevenue === 150000, `-> ${subBefore.monthlyRevenue} -> ${subAfter.monthlyRevenue}`);

  // Limpieza
  await db.query('DELETE FROM users WHERE email LIKE $1', [`%${stamp}@test.com`]);
  await db.query('DELETE FROM clinics WHERE name LIKE $1', [`Vet Central ${stamp}`]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
