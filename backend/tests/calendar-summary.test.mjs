// Pruebas: el calendario mensual del veterinario debe mostrar los días
// con horario asignado aunque nadie los haya reservado ('disponible'),
// además de las citas por estado.
// Uso:  node tests/calendar-summary.test.mjs   (API en localhost:4000 y BD local)

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

const findDay = (rows, day, status) => rows.find((r) => r.day.slice(0, 10) === day && r.status === status);

const main = async () => {
  const vet = session(), cli = session();
  const stamp = Date.now();

  await vet('POST', '/auth/login', { email: 'vet@petgrooming.com', password: 'vet123' });

  // Fecha lejana para no chocar con datos de otras pruebas.
  const target = new Date(Date.now() + 300 * 86400000);
  const day = target.toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const startsAt = `${day}T09:00:00`;
  const endsAt = `${day}T10:00:00`;

  console.log('══ 1. HORARIO SIN RESERVAR → APARECE COMO "disponible" ══');
  const slot = await vet('POST', '/appointments/slots', { starts_at: startsAt, ends_at: endsAt });
  check('El veterinario crea el horario', slot.status === 201);

  const cal1 = (await vet('GET', `/appointments/calendar?month=${month}`)).data;
  const disp1 = findDay(cal1, day, 'disponible');
  check('El día aparece como "disponible" (count 1)', disp1?.count === 1, `-> ${JSON.stringify(cal1)}`);
  check('No aparece como cita de ningún estado', !findDay(cal1, day, 'pendiente'));

  console.log('\n══ 2. AL RESERVARSE, PASA A "pendiente" ══');
  const rc = await cli('POST', '/auth/register', { name: 'Cliente Calendario', email: `calcli_${stamp}@test.com`, password: 'c123456' });
  const pet = await cli('POST', '/pets/mine', { name: 'Firulais', species: 'perro' });
  const appt = await cli('POST', '/appointments', { pet_id: pet.data.id, slot_id: slot.data.id });
  check('El cliente reserva la cita', appt.status === 201);

  const cal2 = (await vet('GET', `/appointments/calendar?month=${month}`)).data;
  check('Ya no aparece "disponible" ese día', !findDay(cal2, day, 'disponible'), `-> ${JSON.stringify(cal2)}`);
  check('Aparece como "pendiente" (count 1)', findDay(cal2, day, 'pendiente')?.count === 1);

  console.log('\n══ 3. AL CANCELARSE, EL HORARIO VUELVE A QUEDAR LIBRE ══');
  const cancel = await cli('PATCH', `/appointments/${appt.data.id}/cancel`);
  check('El cliente cancela', cancel.status === 200);

  const cal3 = (await vet('GET', `/appointments/calendar?month=${month}`)).data;
  check('Sigue registrada la cita "cancelada"', findDay(cal3, day, 'cancelada')?.count === 1);
  check('El horario vuelve a mostrarse "disponible"', findDay(cal3, day, 'disponible')?.count === 1, `-> ${JSON.stringify(cal3)}`);

  // Limpieza
  await vet('DELETE', `/appointments/slots/${slot.data.id}`);
  await db.query('DELETE FROM users WHERE id = $1', [rc.data.user.id]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
