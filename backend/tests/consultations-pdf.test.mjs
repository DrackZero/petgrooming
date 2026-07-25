// Pruebas: consultas clínicas estructuradas + descarga de la historia
// clínica en PDF (veterinario y dueño), con sus permisos.
// Uso:  node tests/consultations-pdf.test.mjs   (API en localhost:4000 y BD local)

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.API_URL || 'http://localhost:4000/api';
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  [OK] ${name}`); }
  else { fail++; console.log(`  [FALLO] ${name} ${extra}`); }
};

// Sesión que además permite pedir respuestas binarias (el PDF).
const session = () => {
  const jar = {};
  const call = async (method, path, body, raw = false) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';'); const [k, v] = pair.split('='); jar[k] = v;
    }
    if (raw) {
      const buf = Buffer.from(await res.arrayBuffer());
      return { status: res.status, buf, headers: res.headers };
    }
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data };
  };
  return call;
};

const db = new pg.Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : { host: process.env.PGHOST, port: process.env.PGPORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE }
);

const main = async () => {
  const vet = session(), cli = session(), otro = session();
  const stamp = Date.now();

  await vet('POST', '/auth/login', { email: 'vet@petgrooming.com', password: 'vet123' });

  console.log('══ 0. PREPARACION ══');
  const rc = await cli('POST', '/auth/register', { name: 'Dueno Consulta', email: `dcons${stamp}@test.com`, password: 'c123456' });
  const pet = await cli('POST', '/pets/mine', { name: 'Ñoño', species: 'perro', breed: 'Beagle', age: 3 });
  check('Mascota creada (con acento en el nombre)', pet.status === 201);
  const petId = pet.data.id;

  console.log('\n══ 1. EL VETERINARIO REGISTRA UNA CONSULTA ══');
  const c1 = await vet('POST', `/pets/${petId}/consultations`, {
    reason: 'Control anual',
    symptoms: 'Paciente activo, sin signos de dolor',
    diagnosis: 'Estado general saludable',
    treatment: 'Continuar dieta actual',
    medications: 'Ninguno',
  });
  check('Crea la consulta (201)', c1.status === 201);
  check('Guarda el diagnóstico', c1.data.diagnosis === 'Estado general saludable');
  check('Queda asociada al veterinario', c1.data.vet_id != null);
  check('Sin motivo → 400', (await vet('POST', `/pets/${petId}/consultations`, { diagnosis: 'x' })).status === 400);
  check('Mascota inexistente → 404', (await vet('POST', '/pets/999999/consultations', { reason: 'x' })).status === 404);

  console.log('\n══ 2. LA CONSULTA APARECE EN EL HISTORIAL ══');
  const hist = await cli('GET', `/pets/${petId}/history`);
  check('El historial trae las consultas', hist.data.consultations?.length === 1, `-> ${JSON.stringify(hist.data.consultations)}`);
  check('Con el nombre del veterinario', hist.data.consultations[0].vet_name === 'Dra. Veterinaria');
  const list = await cli('GET', `/pets/${petId}/consultations`);
  check('El dueño lista las consultas de SU mascota', list.status === 200 && list.data.length === 1);

  console.log('\n══ 3. PERMISOS SOBRE LAS CONSULTAS ══');
  await otro('POST', '/auth/register', { name: 'Ajeno', email: `ajeno${stamp}@test.com`, password: 'a123456' });
  check('Otro cliente NO ve las consultas ajenas (404)',
    (await otro('GET', `/pets/${petId}/consultations`)).status === 404);
  check('Un cliente NO puede crear consultas (403)',
    (await cli('POST', `/pets/${petId}/consultations`, { reason: 'auto-diagnóstico' })).status === 403);

  console.log('\n══ 4. PDF DE LA HISTORIA CLINICA ══');
  const pdfVet = await vet('GET', `/pets/${petId}/history.pdf`, null, true);
  check('El veterinario descarga el PDF (200)', pdfVet.status === 200);
  check('Content-Type application/pdf', pdfVet.headers.get('content-type')?.includes('application/pdf'));
  check('Es un PDF válido (cabecera %PDF)', pdfVet.buf.subarray(0, 4).toString() === '%PDF');
  check('Tiene contenido real (> 1 KB)', pdfVet.buf.length > 1024, `-> ${pdfVet.buf.length} bytes`);
  check('Nombre de archivo sin acentos', /filename="historia-clinica-N.?o.?o\.pdf"/.test(pdfVet.headers.get('content-disposition') || ''),
    `-> ${pdfVet.headers.get('content-disposition')}`);

  const pdfCli = await cli('GET', `/pets/${petId}/history.pdf`, null, true);
  check('El dueño también descarga el PDF de SU mascota', pdfCli.status === 200 && pdfCli.buf.subarray(0, 4).toString() === '%PDF');

  const pdfAjeno = await otro('GET', `/pets/${petId}/history.pdf`, null, true);
  check('Otro cliente NO puede descargarlo (404)', pdfAjeno.status === 404);

  console.log('\n══ 5. EL ACCESO DEL VET QUEDA AUDITADO (break-glass) ══');
  const log = await db.query(
    'SELECT COUNT(*)::int AS total FROM emergency_access_log WHERE pet_id = $1',
    [petId]
  );
  check('La descarga del vet quedó en la bitácora', log.rows[0].total > 0, `-> ${log.rows[0].total} accesos`);

  console.log('\n══ 6. ELIMINAR UNA CONSULTA ══');
  check('El veterinario elimina la consulta',
    (await vet('DELETE', `/pets/${petId}/consultations/${c1.data.id}`)).status === 200);
  check('Consulta inexistente → 404',
    (await vet('DELETE', `/pets/${petId}/consultations/999999`)).status === 404);
  const after = await cli('GET', `/pets/${petId}/consultations`);
  check('Ya no aparece en el historial', after.data.length === 0);

  console.log('\n══ 7. EL PDF FUNCIONA SIN REGISTROS ══');
  const pdfVacio = await vet('GET', `/pets/${petId}/history.pdf`, null, true);
  check('Genera PDF aunque el historial esté vacío', pdfVacio.status === 200 && pdfVacio.buf.subarray(0, 4).toString() === '%PDF');

  // Limpieza (consultas y mascotas caen por CASCADE)
  await db.query('DELETE FROM users WHERE email LIKE $1', [`%${stamp}@test.com`]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
