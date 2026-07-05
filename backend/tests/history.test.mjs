// Suite de pruebas del HISTORIAL CLÍNICO de mascotas (núcleo del proyecto).
// Uso:  node tests/history.test.mjs   (con la API corriendo en localhost:4000)

const BASE = process.env.API_URL || 'http://localhost:4000/api';
let pass = 0, fail = 0;

const check = (name, cond) => {
  if (cond) { pass++; console.log(`  [OK] ${name}`); }
  else { fail++; console.log(`  [FALLO] ${name}`); }
};

// Mini-cliente HTTP con manejo de cookies por sesión.
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

const main = async () => {
  const vet = session(), ana = session(), beto = session();
  const stamp = Date.now();

  // ══ SETUP ══
  const ra = await ana('POST', '/auth/register', { name: 'Ana Historia', email: `ana${stamp}@test.com`, password: 'ana123' });
  const rb = await beto('POST', '/auth/register', { name: 'Beto Ajeno', email: `beto${stamp}@test.com`, password: 'beto123' });
  await vet('POST', '/auth/login', { email: 'vet@petgrooming.com', password: 'vet123' });
  const anaId = ra.data.user.id, betoId = rb.data.user.id;
  console.log(`Setup: Ana=${anaId} Beto=${betoId}\n`);

  console.log('══ 1. VET REGISTRA MASCOTAS ══');
  const rocky = (await vet('POST', '/pets', { owner_id: anaId, name: 'Rocky', species: 'perro', breed: 'Pastor Aleman', age: 4, notes: 'Alergico a la penicilina' })).data;
  check('Mascota creada con notas clinicas', rocky.id && rocky.notes === 'Alergico a la penicilina');
  const michi = (await vet('POST', '/pets', { owner_id: betoId, name: 'Michi', species: 'gato' })).data;
  check('Segunda mascota (otro dueño)', michi.owner_id === betoId);

  console.log('\n══ 2. VACUNAS ══');
  await vet('POST', `/pets/${rocky.id}/vaccines`, { name: 'Rabia', applied_date: '2026-01-15' });
  await vet('POST', `/pets/${rocky.id}/vaccines`, { name: 'Parvovirus', applied_date: '2026-03-10', notes: 'Refuerzo anual' });
  const v3 = (await vet('POST', `/pets/${rocky.id}/vaccines`, { name: 'Moquillo', applied_date: '2026-06-20' })).data;
  const vacs = (await vet('GET', `/pets/${rocky.id}/vaccines`)).data;
  check('3 vacunas registradas', vacs.length === 3);
  check('Orden descendente por fecha (Moquillo primero)', vacs[0].name === 'Moquillo');
  check('Notas de vacuna guardadas', vacs.find(v => v.name === 'Parvovirus')?.notes === 'Refuerzo anual');

  console.log('\n══ 3. CITA CON NOTAS DE CONSULTA ══');
  const t = new Date(Date.now() + 86400000);
  const t2 = new Date(t.getTime() + 3600000);
  const slot = (await vet('POST', '/appointments/slots', { starts_at: t.toISOString(), ends_at: t2.toISOString() })).data;
  const appt = (await ana('POST', '/appointments', { pet_id: rocky.id, slot_id: slot.id })).data;
  check('Cliente agenda (pendiente)', appt.status === 'pendiente');
  await vet('PATCH', `/appointments/${appt.id}/status`, { status: 'confirmada' });
  const done = (await vet('PATCH', `/appointments/${appt.id}/status`, { status: 'completada', notes: 'Desparasitacion aplicada. Peso 32kg. Control en 6 meses.' })).data;
  check('Cita completada con notas clinicas', done.status === 'completada' && /Desparasitacion/.test(done.notes));

  console.log('\n══ 4. HISTORIAL (vision del cliente) ══');
  const hist = (await ana('GET', `/pets/${rocky.id}/history`)).data;
  check('Historial: 3 vacunas', hist.vaccines.length === 3);
  check('Historial: 1 cita', hist.appointments.length === 1);
  check('Cita en historial completada', hist.appointments[0].status === 'completada');
  check('Historial incluye NOTAS de consulta', hist.appointments[0].notes != null);

  console.log('\n══ 5. SEGURIDAD ══');
  check('Beto NO ve historial ajeno (404)', (await beto('GET', `/pets/${rocky.id}/history`)).status === 404);
  check('Cliente NO agrega vacunas (403)', (await beto('POST', `/pets/${rocky.id}/vaccines`, { name: 'Falsa' })).status === 403);
  check('Dueño NO borra vacunas (403)', (await ana('DELETE', `/pets/${rocky.id}/vaccines/${v3.id}`)).status === 403);
  check('Vet SI ve cualquier historial', (await vet('GET', `/pets/${rocky.id}/history`)).data.vaccines.length === 3);

  console.log('\n══ 6. CASOS LIMITE ══');
  const vacio = (await beto('GET', `/pets/${michi.id}/history`)).data;
  check('Sin historial: arreglos vacios', vacio.vaccines.length === 0 && vacio.appointments.length === 0);
  check('Mascota inexistente 404', (await vet('GET', '/pets/99999/history')).status === 404);
  check('Vacuna sin nombre 400', (await vet('POST', `/pets/${rocky.id}/vaccines`, { applied_date: '2026-01-01' })).status === 400);
  await vet('DELETE', `/pets/${rocky.id}/vaccines/${v3.id}`);
  check('Vet elimina vacuna (quedan 2)', (await vet('GET', `/pets/${rocky.id}/vaccines`)).data.length === 2);

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
