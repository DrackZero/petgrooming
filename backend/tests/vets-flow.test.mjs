// Pruebas: solicitud de rol veterinario en el registro (aprobación del admin)
// y horarios por veterinario (el cliente elige con quién agendar).
// Uso:  node tests/vets-flow.test.mjs   (API en localhost:4000 y BD local)

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
  const admin = session(), maria = session(), pedro = session(), seedVet = session(), cli = session();
  const stamp = Date.now();

  await admin('POST', '/auth/login', { email: 'admin@petgrooming.com', password: 'admin123' });
  await seedVet('POST', '/auth/login', { email: 'vet@petgrooming.com', password: 'vet123' });

  console.log('══ 1. SOLICITUD DE VETERINARIO EN EL REGISTRO ══');
  const rm = await maria('POST', '/auth/register', { name: 'Maria Vet', email: `mariavet${stamp}@test.com`, password: 'm123456', wants_vet: true });
  check('Se registra como cliente (rol no cambia solo)', rm.data.user.role === 'cliente');
  let reqs = (await admin('GET', '/admin/vet-requests')).data;
  check('El admin ve la solicitud pendiente', reqs.some((u) => u.id === rm.data.user.id));

  console.log('\n══ 2. APROBAR SOLICITUD ══');
  const ap = await admin('PATCH', `/admin/users/${rm.data.user.id}/vet`);
  check('Aprobada: rol veterinario', ap.data.role === 'veterinario');
  reqs = (await admin('GET', '/admin/vet-requests')).data;
  check('La solicitud desaparece de pendientes', !reqs.some((u) => u.id === rm.data.user.id));
  const mariaVet = session();
  const lm = await mariaVet('POST', '/auth/login', { email: `mariavet${stamp}@test.com`, password: 'm123456' });
  check('Maria entra ya como veterinaria', lm.data.user.role === 'veterinario');

  console.log('\n══ 3. RECHAZAR SOLICITUD ══');
  const rp = await pedro('POST', '/auth/register', { name: 'Pedro NoVet', email: `pedronovet${stamp}@test.com`, password: 'p123456', wants_vet: true });
  await admin('PATCH', `/admin/vet-requests/${rp.data.user.id}/reject`);
  reqs = (await admin('GET', '/admin/vet-requests')).data;
  check('Rechazada: sale de pendientes', !reqs.some((u) => u.id === rp.data.user.id));
  check('Pedro sigue siendo cliente', (await pedro('GET', '/auth/me')).data.user.role === 'cliente');

  console.log('\n══ 4. HORARIOS POR VETERINARIO ══');
  const t = new Date(Date.now() + 86400000), t2 = new Date(t.getTime() + 3600000);
  const slot = (await mariaVet('POST', '/appointments/slots', { starts_at: t.toISOString(), ends_at: t2.toISOString() })).data;
  check('Maria crea su horario', Boolean(slot.id) && slot.vet_id === rm.data.user.id);

  const rc = await cli('POST', '/auth/register', { name: 'Cliente Elige', email: `elige${stamp}@test.com`, password: 'c123456' });
  const publicSlots = (await cli('GET', '/appointments/slots')).data;
  const visible = publicSlots.find((s) => s.id === slot.id);
  check('El cliente ve el horario CON el nombre del vet', visible?.vet_name === 'Maria Vet');

  const delOther = await seedVet('DELETE', `/appointments/slots/${slot.id}`);
  check('Otro vet NO puede borrar ese horario (409)', delOther.status === 409);

  console.log('\n══ 5. LA CITA PERTENECE AL VET ELEGIDO ══');
  const pet = (await seedVet('POST', '/pets', { owner_id: rc.data.user.id, name: 'Copito', species: 'gato' })).data;
  const appt = (await cli('POST', '/appointments', { pet_id: pet.id, slot_id: slot.id })).data;
  check('Cliente agenda con Maria', appt.status === 'pendiente');

  const mias = (await mariaVet('GET', '/appointments/all')).data;
  check('Maria ve la cita en SU listado', mias.some((a) => a.id === appt.id));
  const ajenas = (await seedVet('GET', '/appointments/all')).data;
  check('El otro vet NO la ve en el suyo', !ajenas.some((a) => a.id === appt.id));

  const intruso = await seedVet('PATCH', `/appointments/${appt.id}/status`, { status: 'confirmada' });
  check('El otro vet NO puede gestionarla (404)', intruso.status === 404);
  const ok = await mariaVet('PATCH', `/appointments/${appt.id}/status`, { status: 'confirmada' });
  check('Maria SI la confirma', ok.data?.status === 'confirmada');

  // Limpieza (orden: cliente→citas, luego vets→slots)
  await db.query('DELETE FROM users WHERE email = $1', [`elige${stamp}@test.com`]);
  await db.query('DELETE FROM users WHERE email LIKE $1', [`%${stamp}@test.com`]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
