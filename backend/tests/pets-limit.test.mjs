// Pruebas: límite de mascotas por cliente (solo 1 autogestionada) +
// solicitud de mascota adicional que aprueba/rechaza un veterinario.
// Uso:  node tests/pets-limit.test.mjs   (API en localhost:4000 y BD local)

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

const main = async () => {
  const cli1 = session(), cli2 = session(), seedVet = session();
  const stamp = Date.now();

  await seedVet('POST', '/auth/login', { email: 'vet@petgrooming.com', password: 'vet123' });

  console.log('══ 1. EL CLIENTE REGISTRA SU PRIMERA MASCOTA ══');
  const rc1 = await cli1('POST', '/auth/register', { name: 'Cliente Uno', email: `cli1_${stamp}@test.com`, password: 'c123456' });
  check('Se registra como cliente', rc1.data.user.role === 'cliente');

  const first = await cli1('POST', '/pets/mine', { name: 'Firulais', species: 'perro', breed: 'Criollo', age: 2 });
  check('Registra su primera mascota (201)', first.status === 201 && first.data.name === 'Firulais');

  console.log('\n══ 2. EL LIMITE BLOQUEA LA SEGUNDA ══');
  const second = await cli1('POST', '/pets/mine', { name: 'Michi', species: 'gato' });
  check('No puede registrar una segunda por su cuenta (409)', second.status === 409);

  console.log('\n══ 3. SOLICITUD DE MASCOTA ADICIONAL ══');
  const reqRes = await cli1('POST', '/pets/requests', { name: 'Michi', species: 'gato', notes: 'Es de mi mamá' });
  check('Envía la solicitud (201, pendiente)', reqRes.status === 201 && reqRes.data.status === 'pendiente');
  const requestId = reqRes.data.id;

  const mine = await cli1('GET', '/pets/requests/mine');
  check('Ve su propia solicitud', mine.data.some((r) => r.id === requestId));

  const forbidden = await cli1('GET', '/pets/requests');
  check('El cliente NO ve la cola de solicitudes (403)', forbidden.status === 403);

  console.log('\n══ 4. EL VETERINARIO APRUEBA ══');
  const queue = await seedVet('GET', '/pets/requests');
  check('El veterinario ve la solicitud pendiente', queue.data.some((r) => r.id === requestId && r.client_name === 'Cliente Uno'));

  const approved = await seedVet('PATCH', `/pets/requests/${requestId}/approve`);
  check('Aprobar crea la mascota (201→200, dueño correcto)', approved.status === 200 && approved.data.owner_id === rc1.data.user.id);

  const petsAfter = await cli1('GET', '/pets');
  check('El cliente ahora tiene 2 mascotas', petsAfter.data.length === 2);

  const stillBlocked = await cli1('POST', '/pets/mine', { name: 'Otra', species: 'perro' });
  check('Sigue sin poder autoregistrar una tercera (409)', stillBlocked.status === 409);

  console.log('\n══ 5. RECHAZO DE SOLICITUD ══');
  const reqRes2 = await cli1('POST', '/pets/requests', { name: 'Rechazado', species: 'ave' });
  const reject = await seedVet('PATCH', `/pets/requests/${reqRes2.data.id}/reject`);
  check('El veterinario rechaza (200)', reject.status === 200);
  const petsAfterReject = await cli1('GET', '/pets');
  check('No se creó mascota por la solicitud rechazada', petsAfterReject.data.length === 2);

  console.log('\n══ 6. OTRO CLIENTE NO VE NI TOCA LAS SOLICITUDES AJENAS ══');
  await cli2('POST', '/auth/register', { name: 'Cliente Dos', email: `cli2_${stamp}@test.com`, password: 'c223456' });
  const other = await cli2('GET', '/pets/requests/mine');
  check('Cliente Dos no ve las solicitudes de Cliente Uno', !other.data.some((r) => r.id === requestId));

  // Limpieza (pets y pet_requests caen por CASCADE al borrar el usuario)
  await db.query('DELETE FROM users WHERE email LIKE $1', [`%${stamp}@test.com`]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
