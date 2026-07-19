// Pruebas Fase B: el veterinario elige clínica al registrarse y el GERENTE
// de esa clínica aprueba/gestiona a sus veterinarios y ve sus reportes.
// Uso:  node tests/gerente-manage.test.mjs

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

const main = async () => {
  const admin = session(), gerente = session();
  const stamp = Date.now();
  await admin('POST', '/auth/login', { email: 'admin@petgrooming.com', password: 'admin123' });

  // Gerente + clínica activa
  const reg = await gerente('POST', '/auth/register', {
    name: 'Gte B', email: `gteb${stamp}@test.com`, password: 'g123456',
    manage_clinic: true, clinic: { name: `Clinica B ${stamp}` },
  });
  const clinicId = (await gerente('GET', '/gerente/clinic')).data.id;
  await admin('PATCH', `/admin/clinics/${clinicId}/status`, { status: 'activa' });

  console.log('══ 1. EL VET ELIGE CLINICA AL REGISTRARSE ══');
  const clinicsPub = (await session()('GET', '/clinics/active')).data;
  check('La clínica activa aparece en el listado público', clinicsPub.some((c) => c.id === clinicId));

  const vet = session();
  const rv = await vet('POST', '/auth/register', {
    name: 'Vet B', email: `vetb${stamp}@test.com`, password: 'v123456',
    wants_vet: true, clinic_id: clinicId,
  });
  check('El vet se registra como cliente pendiente', rv.data.user.role === 'cliente');

  console.log('\n══ 2. EL GERENTE VE Y APRUEBA ══');
  const reqs = (await gerente('GET', '/gerente/vet-requests')).data;
  check('El gerente ve la solicitud en SU clínica', reqs.some((u) => u.id === rv.data.user.id));
  check('El admin NO la ve (tiene clínica elegida)', !(await admin('GET', '/admin/vet-requests')).data.some((u) => u.id === rv.data.user.id));

  const appr = await gerente('PATCH', `/gerente/vet-requests/${rv.data.user.id}/approve`);
  check('Aprobado: rol veterinario', appr.data.role === 'veterinario');
  const myVets = (await gerente('GET', '/gerente/vets')).data;
  check('Aparece en el equipo del gerente', myVets.some((v) => v.id === rv.data.user.id));

  console.log('\n══ 3. EL VET APROBADO YA OPERA (clínica activa) ══');
  const vetS = session();
  await vetS('POST', '/auth/login', { email: `vetb${stamp}@test.com`, password: 'v123456' });
  const t = new Date(Date.now() + 8.64e7).toISOString(), t2 = new Date(Date.now() + 9e7).toISOString();
  check('Crea horario en su clínica activa', (await vetS('POST', '/appointments/slots', { starts_at: t, ends_at: t2 })).status === 201);

  console.log('\n══ 4. PERMISOS ENTRE CLINICAS ══');
  const otro = session();
  await otro('POST', '/auth/register', {
    name: 'Gte Otro', email: `gteo${stamp}@test.com`, password: 'o123456',
    manage_clinic: true, clinic: { name: `Clinica Otra ${stamp}` },
  });
  check('Otro gerente NO puede aprobar a un vet ajeno (404)',
    (await otro('PATCH', `/gerente/vet-requests/${rv.data.user.id}/approve`)).status === 404);
  check('Otro gerente NO ve al vet en su equipo',
    !(await otro('GET', '/gerente/vets')).data.some((v) => v.id === rv.data.user.id));

  console.log('\n══ 5. DESACTIVAR + REPORTES ══');
  const off = await gerente('PATCH', `/gerente/vets/${rv.data.user.id}/active`, { is_active: false });
  check('El gerente desactiva a su vet', off.data?.is_active === false);
  const rep = (await gerente('GET', '/gerente/reports')).data;
  check('Reportes: 1 vet en total, 0 activos', rep.vets.total === 1 && rep.vets.activos === 0);
  check('El vet desactivado NO puede volver a iniciar sesión (403)',
    (await session()('POST', '/auth/login', { email: `vetb${stamp}@test.com`, password: 'v123456' })).status === 403);

  // Limpieza
  await db.query('DELETE FROM users WHERE email LIKE $1', [`%${stamp}@test.com`]);
  await db.query('DELETE FROM clinics WHERE name LIKE $1', [`Clinica B ${stamp}`]);
  await db.query('DELETE FROM clinics WHERE name LIKE $1', [`Clinica Otra ${stamp}`]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
