// Pruebas del chat de emergencia cliente-veterinario.
// REST para gestion/envio + WebSocket para la entrega en tiempo real.
// Uso:  node tests/chat.test.mjs   (API en localhost:4000 y BD local)

import pg from 'pg';
import WebSocket from 'ws';
import dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.API_URL || 'http://localhost:4000/api';
const WS_BASE = BASE.replace(/^http/, 'ws').replace(/\/api\/?$/, '') + '/ws';
let pass = 0, fail = 0;

const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  [OK] ${name}`); }
  else { fail++; console.log(`  [FALLO] ${name} ${extra}`); }
};

const session = () => {
  const jar = {};
  const call = async (method, path, body) => {
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
  call.jar = jar;
  return call;
};

// Abre un WebSocket autenticado con la cookie de la sesion y captura eventos.
const openSocket = (jar) => new Promise((resolve, reject) => {
  const events = [];
  const waiters = [];
  const ws = new WebSocket(WS_BASE, {
    headers: { Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') },
  });
  ws.on('message', (raw) => {
    const ev = JSON.parse(raw.toString());
    events.push(ev);
    waiters.forEach((w) => w());
  });
  ws.on('open', () => resolve({
    ws,
    events,
    // Espera un evento que cumpla el predicado (con timeout).
    waitFor: (pred, ms = 3000) => new Promise((res2) => {
      const found = () => events.find(pred);
      if (found()) return res2(found());
      const t = setTimeout(() => res2(null), ms);
      waiters.push(() => { if (found()) { clearTimeout(t); res2(found()); } });
    }),
  }));
  ws.on('error', reject);
});

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
  const vet = session(), cli = session(), intruso = session();
  const stamp = Date.now();

  await vet('POST', '/auth/login', { email: 'vet@petgrooming.com', password: 'vet123' });
  const rc = await cli('POST', '/auth/register', { name: 'Cliente Urgente', email: `urgente${stamp}@test.com`, password: 'u123456' });
  await intruso('POST', '/auth/register', { name: 'Otro Cliente', email: `intruso${stamp}@test.com`, password: 'i123456' });

  console.log('══ 1. LISTA DE VETERINARIOS ══');
  const vets = (await cli('GET', '/chat/vets')).data;
  const seedVet = vets.find((v) => v.name === 'Dra. Veterinaria');
  check('El cliente ve a los veterinarios disponibles', Boolean(seedVet));

  console.log('\n══ 2. ABRIR URGENCIA ══');
  const c1 = await cli('POST', '/chat/conversations', { vet_id: seedVet.id });
  check('Se crea abierta (201)', c1.status === 201 && c1.data.status === 'abierta');
  const c2 = await cli('POST', '/chat/conversations', { vet_id: seedVet.id });
  check('Repetir reutiliza la misma (200)', c2.status === 200 && c2.data.id === c1.data.id);
  check('El vet no puede abrir urgencias (403)', (await vet('POST', '/chat/conversations', { vet_id: seedVet.id })).status === 403);
  const convId = c1.data.id;

  console.log('\n══ 3. TIEMPO REAL (WebSocket) ══');
  const vetSock = await openSocket(vet.jar);
  const cliSock = await openSocket(cli.jar);
  check('Vet conectado al WS', Boolean(await vetSock.waitFor((e) => e.type === 'connected')));
  check('Cliente conectado al WS', Boolean(await cliSock.waitFor((e) => e.type === 'connected')));

  const sent = await cli('POST', `/chat/conversations/${convId}/messages`, { body: 'Mi perro comió chocolate, ¿qué hago?' });
  check('Mensaje guardado (201)', sent.status === 201);

  const recibidoVet = await vetSock.waitFor((e) => e.type === 'message' && e.message?.id === sent.data.id);
  check('El VET lo recibe EN VIVO por WebSocket', Boolean(recibidoVet), '-> no llego en 3s');
  const ecoCliente = await cliSock.waitFor((e) => e.type === 'message' && e.message?.id === sent.data.id);
  check('El cliente recibe el eco (multi-pestaña)', Boolean(ecoCliente));

  const reply = await vet('POST', `/chat/conversations/${convId}/messages`, { body: 'Llevalo de inmediato, te espero en la clinica.' });
  const recibidoCli = await cliSock.waitFor((e) => e.type === 'message' && e.message?.id === reply.data.id);
  check('La respuesta del vet llega EN VIVO al cliente', Boolean(recibidoCli));

  console.log('\n══ 4. PERMISOS ══');
  check('Un tercero NO ve la conversación (404)', (await intruso('GET', `/chat/conversations/${convId}/messages`)).status === 404);
  check('Un tercero NO puede escribir (404)', (await intruso('POST', `/chat/conversations/${convId}/messages`, { body: 'hola' })).status === 404);
  const hist = (await vet('GET', `/chat/conversations/${convId}/messages`)).data;
  check('El vet ve el historial completo (2 mensajes)', hist.messages.length === 2);
  check('Mensaje vacío rechazado (400)', (await cli('POST', `/chat/conversations/${convId}/messages`, { body: '   ' })).status === 400);

  console.log('\n══ 5. CIERRE ══');
  const closed = await vet('PATCH', `/chat/conversations/${convId}/close`);
  check("El vet cierra la urgencia", closed.data?.status === 'cerrada');
  const closedEv = await cliSock.waitFor((e) => e.type === 'conversation_closed' && e.conversationId === convId);
  check('El cliente recibe el cierre EN VIVO', Boolean(closedEv));
  check('No se puede escribir en cerrada (409)', (await cli('POST', `/chat/conversations/${convId}/messages`, { body: 'hola?' })).status === 409);

  vetSock.ws.close();
  cliSock.ws.close();

  // Limpieza
  await db.query('DELETE FROM users WHERE email LIKE $1', [`%${stamp}@test.com`]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
