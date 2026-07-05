// Pruebas de la generación masiva de horarios (jornada laboral del veterinario).
// Uso:  node tests/slots-bulk.test.mjs   (con la API corriendo en localhost:4000)

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

const pad = (n) => String(n).padStart(2, '0');
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const main = async () => {
  const vet = session();
  await vet('POST', '/auth/login', { email: 'vet@petgrooming.com', password: 'vet123' });

  // Rango: de mañana a +14 días, trabajando Lun/Mié/Vie de 08:00 a 10:00 (2 citas de 1h por día).
  const start = new Date(Date.now() + 86400000);
  const end = new Date(Date.now() + 14 * 86400000);
  const weekdays = [1, 3, 5];

  let expectedDays = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (weekdays.includes(d.getDay())) expectedDays++;
  }
  const expected = expectedDays * 2;

  const payload = {
    start_date: dateStr(start), end_date: dateStr(end),
    weekdays, day_start: '08:00', day_end: '10:00', duration_min: 60,
  };

  console.log('══ 1. GENERACION MASIVA ══');
  const r1 = await vet('POST', '/appointments/slots/bulk', payload);
  check(`Crea ${expected} franjas (${expectedDays} dias x 2)`, r1.data?.created === expected, `-> ${JSON.stringify(r1.data)}`);

  console.log('\n══ 2. IDEMPOTENCIA (repetir = omitir todo) ══');
  const r2 = await vet('POST', '/appointments/slots/bulk', payload);
  check('Segunda pasada: 0 creados', r2.data?.created === 0, `-> ${JSON.stringify(r2.data)}`);
  check(`Segunda pasada: ${expected} omitidos`, r2.data?.skipped === expected);

  console.log('\n══ 3. VALIDACIONES ══');
  check('Sin dias seleccionados -> 400', (await vet('POST', '/appointments/slots/bulk', { ...payload, weekdays: [] })).status === 400);
  check('Fechas invertidas -> 400', (await vet('POST', '/appointments/slots/bulk', { ...payload, start_date: payload.end_date, end_date: payload.start_date })).status === 400);
  check('Jornada invertida -> 400', (await vet('POST', '/appointments/slots/bulk', { ...payload, day_start: '18:00', day_end: '08:00' })).status === 400);
  check('Duracion invalida -> 400', (await vet('POST', '/appointments/slots/bulk', { ...payload, duration_min: 5 })).status === 400);
  check('Rango > 60 dias -> 400', (await vet('POST', '/appointments/slots/bulk', { ...payload, end_date: dateStr(new Date(Date.now() + 90 * 86400000)) })).status === 400);

  console.log('\n══ 4. LOS SLOTS QUEDAN DISPONIBLES ══');
  const slots = (await vet('GET', '/appointments/slots')).data;
  check(`Disponibles >= ${expected}`, Array.isArray(slots) && slots.length >= expected);

  // Limpieza: elimina las franjas libres creadas.
  let deleted = 0;
  for (const s of slots) {
    const del = await vet('DELETE', `/appointments/slots/${s.id}`);
    if (del.status === 200) deleted++;
  }
  console.log(`\n(limpieza: ${deleted} franjas eliminadas)`);

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
