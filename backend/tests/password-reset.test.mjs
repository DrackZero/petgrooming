// Pruebas: recuperación de contraseña (forgot → email con token → reset).
// Fuera de producción /auth/forgot devuelve debug_token para poder probar
// el flujo completo sin bandeja de correo.
// Uso:  node tests/password-reset.test.mjs   (API en localhost:4000 y BD local)

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
  const stamp = Date.now();
  const email = `resetme_${stamp}@test.com`;

  console.log('══ 0. PREPARACION: USUARIO NUEVO ══');
  const reg = await session()('POST', '/auth/register', { name: 'Reset Me', email, password: 'original123' });
  check('Usuario creado', reg.status === 201);

  console.log('\n══ 1. FORGOT: RESPUESTA GENERICA SIEMPRE ══');
  const f1 = await session()('POST', '/auth/forgot', { email });
  check('Email registrado → 200', f1.status === 200);
  check('En dev incluye debug_token', typeof f1.data.debug_token === 'string' && f1.data.debug_token.length === 64);

  const f2 = await session()('POST', '/auth/forgot', { email: `noexiste_${stamp}@test.com` });
  check('Email NO registrado → también 200 (no revela cuentas)', f2.status === 200);
  check('Y sin token', !f2.data.debug_token);
  check('Mismo mensaje en ambos casos', f1.data.message === f2.data.message);
  check('Sin email → 400', (await session()('POST', '/auth/forgot', {})).status === 400);

  console.log('\n══ 2. VALIDACIONES DEL RESET ══');
  const token = f1.data.debug_token;
  check('Token inventado → 400', (await session()('POST', '/auth/reset', { token: 'x'.repeat(64), password: 'nueva123' })).status === 400);
  check('Contraseña corta → 400', (await session()('POST', '/auth/reset', { token, password: '123' })).status === 400);
  check('Sin datos → 400', (await session()('POST', '/auth/reset', {})).status === 400);

  console.log('\n══ 3. RESET EXITOSO ══');
  const r = await session()('POST', '/auth/reset', { token, password: 'nueva123456' });
  check('Cambia la contraseña (200)', r.status === 200);

  const oldLogin = await session()('POST', '/auth/login', { email, password: 'original123' });
  check('La contraseña vieja ya NO sirve (401)', oldLogin.status === 401);
  const newLogin = await session()('POST', '/auth/login', { email, password: 'nueva123456' });
  check('La nueva SI sirve (200)', newLogin.status === 200);

  console.log('\n══ 4. EL TOKEN ES DE UN SOLO USO ══');
  const reuse = await session()('POST', '/auth/reset', { token, password: 'otra123456' });
  check('Reusar el token → 400', reuse.status === 400);
  const stillNew = await session()('POST', '/auth/login', { email, password: 'nueva123456' });
  check('La contraseña no cambió con el token usado', stillNew.status === 200);

  console.log('\n══ 5. TOKEN EXPIRADO ══');
  const f3 = await session()('POST', '/auth/forgot', { email });
  await db.query(
    `UPDATE password_resets SET expires_at = now() - interval '1 minute'
     WHERE user_id = (SELECT id FROM users WHERE email = $1) AND used = false`,
    [email]
  );
  const expired = await session()('POST', '/auth/reset', { token: f3.data.debug_token, password: 'expirada123' });
  check('Token vencido → 400', expired.status === 400);

  console.log('\n══ 6. EL RESET CIERRA LAS SESIONES ABIERTAS ══');
  const sess = session();
  await sess('POST', '/auth/login', { email, password: 'nueva123456' });
  const f4 = await session()('POST', '/auth/forgot', { email });
  await session()('POST', '/auth/reset', { token: f4.data.debug_token, password: 'final123456' });
  const refreshTry = await sess('POST', '/auth/refresh');
  check('El refresh token quedó revocado (401)', refreshTry.status === 401);

  // Limpieza (password_resets cae por CASCADE)
  await db.query('DELETE FROM users WHERE email = $1', [email]);
  await db.end();

  console.log('\n════════════════════════════');
  console.log(`RESULTADO: ${pass} OK · ${fail} FALLOS`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('Error fatal:', e.message); process.exit(1); });
