// Pruebas: horario de atención configurable por clínica. Los veterinarios
// no pueden abrir franjas fuera del horario de su veterinaria (ni a las 3 de
// la madrugada, ni en el pasado, ni con fin anterior al inicio).
// Uso:  node tests/clinic-hours.test.mjs   (API en localhost:4000 y BD local)

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

// Construye una fecha futura a una hora local concreta de Colombia (UTC-5).
const futureAt = (hourLocal, plusDays = 3) => {
  const d = new Date();
  d.setDate(d.getDate() + plusDays);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}T${String(hourLocal).padStart(2, '0')}:00:00-05:00`;
};
const plusHour = (iso) => new Date(new Date(iso).getTime() + 3600000).toISOString();

const main = async () => {
  const admin = session(), gerente = session();
  const stamp = Date.now();
  const clinicName = `Vet Horario ${stamp}`;

  await admin('POST', '/auth/login', { email: 'admin@petgrooming.com', password: 'admin123' });

  console.log('══ 0. CLINICA CON GERENTE Y VETERINARIO ══');
  await gerente('POST', '/auth/register', {
    name: 'Gte Horario', email: `gh${stamp}@test.com`, password: 'g123456',
    manage_clinic: true, clinic: { name: clinicName },
  });
  const clinic = (await gerente('GET', '/gerente/clinic')).data;
  check('La clínica nace con horario por defecto 07:00–19:00',
    String(clinic.opens_at).startsWith('07') && String(clinic.closes_at).startsWith('19'),
    `-> ${clinic.opens_at} a ${clinic.closes_at}`);

  await gerente('POST', '/gerente/subscription/confirm', { plan: 'pro' });

  const rv = await session()('POST', '/auth/register', { name: 'Vet Horario', email: `vh${stamp}@test.com`, password: 'v123456' });
  await admin('PATCH', `/admin/users/${rv.data.user.id}/vet`);
  await admin('PATCH', `/admin/vets/${rv.data.user.id}/clinic`, { clinic_id: clinic.id });
  const vet = session();
  await vet('POST', '/auth/login', { email: `vh${stamp}@test.com`, password: 'v123456' });

  console.log('\n══ 1. EL VET CONSULTA EL HORARIO DE SU CLINICA ══');
  const hrs = await vet('GET', '/appointments/clinic-hours');
  check('Devuelve el horario de la clínica', hrs.status === 200 && String(hrs.data.opens_at).startsWith('07'));
  check('Con el nombre de la veterinaria', hrs.data.name === clinicName);

  console.log('\n══ 2. FRANJAS DENTRO Y FUERA DEL HORARIO ══');
  const dentro = futureAt(9);
  check('09:00 está dentro del horario (201)',
    (await vet('POST', '/appointments/slots', { starts_at: dentro, ends_at: plusHour(dentro) })).status === 201);

  const madrugada = futureAt(3);
  const r3am = await vet('POST', '/appointments/slots', { starts_at: madrugada, ends_at: plusHour(madrugada) });
  check('03:00 de la madrugada se rechaza (400)', r3am.status === 400, `-> ${r3am.status}`);
  check('Con un mensaje que explica el horario', /horario de atención/i.test(r3am.data?.message || ''), `-> ${r3am.data?.message}`);

  const nocturna = futureAt(22);
  check('22:00 también se rechaza (400)',
    (await vet('POST', '/appointments/slots', { starts_at: nocturna, ends_at: plusHour(nocturna) })).status === 400);

  const limite = futureAt(18);
  check('18:00–19:00 (justo hasta el cierre) se acepta',
    (await vet('POST', '/appointments/slots', { starts_at: limite, ends_at: plusHour(limite) })).status === 201);

  console.log('\n══ 3. OTRAS VALIDACIONES DE LA FRANJA ══');
  const base = futureAt(10);
  check('Fin anterior al inicio → 400',
    (await vet('POST', '/appointments/slots', { starts_at: base, ends_at: futureAt(9) })).status === 400);
  const pasado = new Date(Date.now() - 86400000).toISOString();
  check('Franja en el pasado → 400',
    (await vet('POST', '/appointments/slots', { starts_at: pasado, ends_at: plusHour(pasado) })).status === 400);
  check('Fecha inválida → 400',
    (await vet('POST', '/appointments/slots', { starts_at: 'no-es-fecha', ends_at: 'tampoco' })).status === 400);

  console.log('\n══ 4. LA JORNADA MASIVA RESPETA EL HORARIO ══');
  const f = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const desde = new Date(Date.now() + 10 * 86400000), hasta = new Date(Date.now() + 12 * 86400000);
  const payload = { start_date: f(desde), end_date: f(hasta), weekdays: [0, 1, 2, 3, 4, 5, 6], duration_min: 60 };

  const fuera = await vet('POST', '/appointments/slots/bulk', { ...payload, day_start: '00:00', day_end: '23:00' });
  check('Jornada de 00:00 a 23:00 se rechaza (400)', fuera.status === 400, `-> ${JSON.stringify(fuera.data)}`);
  check('Jornada dentro del horario se acepta',
    (await vet('POST', '/appointments/slots/bulk', { ...payload, day_start: '08:00', day_end: '12:00' })).data?.created > 0);

  console.log('\n══ 5. EL GERENTE AMPLIA EL HORARIO ══');
  const upd = await gerente('PUT', '/gerente/clinic', {
    name: clinicName, opens_at: '06:00', closes_at: '23:00',
  });
  check('El gerente actualiza el horario (200)', upd.status === 200);
  check('Queda guardado', String(upd.data.opens_at).startsWith('06') && String(upd.data.closes_at).startsWith('23'));
  check('Ahora 22:00 SÍ se acepta',
    (await vet('POST', '/appointments/slots', { starts_at: nocturna, ends_at: plusHour(nocturna) })).status === 201);
  check('Pero las 3 de la madrugada siguen fuera',
    (await vet('POST', '/appointments/slots', { starts_at: madrugada, ends_at: plusHour(madrugada) })).status === 400);

  console.log('\n══ 6. VALIDACION DEL HORARIO QUE FIJA EL GERENTE ══');
  check('Apertura posterior al cierre → 400',
    (await gerente('PUT', '/gerente/clinic', { name: clinicName, opens_at: '20:00', closes_at: '08:00' })).status === 400);
  check('Formato inválido → 400',
    (await gerente('PUT', '/gerente/clinic', { name: clinicName, opens_at: '25:99', closes_at: '19:00' })).status === 400);

  // Limpieza
  await db.query('DELETE FROM users WHERE email LIKE $1', [`%${stamp}@test.com`]);
  await db.query('DELETE FROM clinics WHERE name = $1', [clinicName]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
