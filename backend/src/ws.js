import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

// Registro de conexiones activas: userId -> Set<WebSocket>.
// Un usuario puede tener varias pestañas/dispositivos conectados.
const clients = new Map();

const parseCookies = (header = '') =>
  Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim().split('=').map(decodeURIComponent))
      .filter((p) => p[0])
  );

// Inicializa el servidor WebSocket sobre el mismo servidor HTTP de Express.
// La autenticación reutiliza la cookie httpOnly del access token.
export const initWebSocket = (server) => {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    let user;
    try {
      const { accessToken } = parseCookies(req.headers.cookie);
      const payload = jwt.verify(accessToken, process.env.JWT_SECRET);
      user = { id: payload.id, role: payload.role };
    } catch {
      ws.close(4401, 'No autenticado');
      return;
    }

    if (!clients.has(user.id)) clients.set(user.id, new Set());
    clients.get(user.id).add(ws);

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('close', () => {
      const set = clients.get(user.id);
      if (set) {
        set.delete(ws);
        if (!set.size) clients.delete(user.id);
      }
    });

    ws.send(JSON.stringify({ type: 'connected' }));
  });

  // Keepalive: los proxies (Render) cierran conexiones inactivas.
  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);
  wss.on('close', () => clearInterval(interval));

  return wss;
};

// Envía un evento a todas las conexiones de un usuario (si está en línea).
export const pushToUser = (userId, event) => {
  const set = clients.get(Number(userId));
  if (!set || !set.size) return false;
  const data = JSON.stringify(event);
  for (const ws of set) {
    try { ws.send(data); } catch { /* conexión rota: la limpia el keepalive */ }
  }
  return true;
};
