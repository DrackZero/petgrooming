// Pruebas del modelo multi-clínica: clínicas, veterinarios por clínica,
// historial portable entre clínicas y bitácora de acceso (break-glass).
// Uso:  node tests/multiclinic.test.mjs   (API en localhost:4000 y BD local)

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
  const admin = session(), vet1 = session(), cli = session();
  const stamp = Date.now();

  await admin('POST', '/auth/login', { email: 'admin@petgrooming.com', password: 'admin123' });
  await vet1('POST', '/auth/login', { email: 'vet@petgrooming.com', password: 'vet123' });
  const rc = await cli('POST', '/auth/register', { name: 'Dueno Portable', email: `portable${stamp}@test.com`, password: 'p123456' });

  console.log('══ 1. CLINICAS ══');
  const nueva = await admin('POST', '/admin/clinics', { name: `Clinica Norte ${stamp}`, address: 'Calle 30', phone: '3110000000' });
  check('Crear clinica (201)', nueva.status === 201);
  check('Clinica sin nombre rechazada (400)', (await admin('POST', '/admin/clinics', { address: 'x' })).status === 400);
  const clinicas = (await admin('GET', '/admin/clinics')).data;
  check('Listado incluye la semilla y la nueva', clinicas.length >= 2);
  const semilla = clinicas.find((c) => c.name === 'PetGrooming Yopal');
  check('La semilla tiene veterinarios asignados', semilla?.vet_count >= 1);

  console.log('\n══ 2. VETERINARIO DE OTRA CLINICA ══');
  const tmp = session(); // sesión aparte: register inicia sesión y pisaría las cookies del admin
  const rv = await tmp('POST', '/auth/register', { name: `Dr Norte ${stamp}`, email: `drnorte${stamp}@test.com`, password: 'n123456' });
  await admin('PATCH', `/admin/users/${rv.data.user.id}/vet`);
  const asignado = await admin('PATCH', `/admin/vets/${rv.data.user.id}/clinic`, { clinic_id: nueva.data.id });
  check('Vet asignado a la clinica nueva', asignado.data?.clinic_id === nueva.data.id);
  check('Asignar clinica inexistente (404)', (await admin('PATCH', `/admin/vets/${rv.data.user.id}/clinic`, { clinic_id: 99999 })).status === 404);
  const vets = (await admin('GET', '/admin/vets')).data;
  check('Listado admin muestra la clinica de cada vet', vets.find((v) => v.id === rv.data.user.id)?.clinic_name?.startsWith('Clinica Norte'));

  const vet2 = session();
  await vet2('POST', '/auth/login', { email: `drnorte${stamp}@test.com`, password: 'n123456' });

  console.log('\n══ 3. EL CLIENTE VE LA CLINICA AL ELEGIR ══');
  const t = new Date(Date.now() + 86400000), t2 = new Date(t.getTime() + 3600000);
  const slot = (await vet2('POST', '/appointments/slots', { starts_at: t.toISOString(), ends_at: t2.toISOString() })).data;
  const slots = (await cli('GET', '/appointments/slots')).data;
  const visto = slots.find((s) => s.id === slot.id);
  check('El horario muestra la clinica del vet', visto?.clinic_name?.startsWith('Clinica Norte'));
  const chatVets = (await cli('GET', '/chat/vets')).data;
  check('El chat muestra la clinica de cada vet', chatVets.find((v) => v.id === rv.data.user.id)?.clinic_name?.startsWith('Clinica Norte'));

  console.log('\n══ 4. TRAZABILIDAD DE VACUNAS ══');
  const pet = (await vet1('POST', '/pets', { owner_id: rc.data.user.id, name: 'Portatil', species: 'perro' })).data;
  await vet1('POST', `/pets/${pet.id}/vaccines`, { name: 'Rabia' });
  const vacs = (await cli('GET', `/pets/${pet.id}/vaccines`)).data;
  check('La vacuna registra quien la aplico', vacs[0]?.vet_name === 'Dra. Veterinaria');
  check('Y la clinica de quien la aplico', vacs[0]?.clinic_name === 'PetGrooming Yopal');

  console.log('\n══ 5. HISTORIAL PORTABLE + AUDITORIA (break-glass) ══');
  // vet2 (Clinica Norte) nunca ha atendido a la mascota: emergencia.
  const acceso = await vet2('GET', `/pets/${pet.id}/history`);
  check('Un vet de OTRA clinica accede al historial (200)', acceso.status === 200 && acceso.data.vaccines.length === 1);
  await new Promise((r) => setTimeout(r, 300)); // el log es best-effort asincrono
  const log = (await admin('GET', '/admin/access-log')).data;
  const entrada = log.find((l) => l.pet_name === 'Portatil' && l.vet_name === `Dr Norte ${stamp}`);
  check('El acceso quedo en la bitacora', Boolean(entrada));
  check('La bitacora registra la clinica del vet', entrada?.clinic_name?.startsWith('Clinica Norte'));
  check('El cliente NO ve la bitacora (403)', (await cli('GET', '/admin/access-log')).status === 403);

  // Limpieza
  await db.query('DELETE FROM users WHERE email LIKE $1', [`%${stamp}@test.com`]);
  await db.query('DELETE FROM clinics WHERE name LIKE $1', [`Clinica Norte ${stamp}`]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
