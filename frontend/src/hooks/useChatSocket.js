import { useEffect, useRef } from 'react';

// Deriva la URL del WebSocket a partir de la URL de la API:
// http://host/api  ->  ws://host/ws   (https -> wss)
const wsUrl = () => {
  const api = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  return api.replace(/^http/, 'ws').replace(/\/api\/?$/, '') + '/ws';
};

// Conexión WebSocket con reconexión automática (backoff exponencial).
// onEvent recibe cada evento JSON del servidor. Las cookies httpOnly
// de la sesión viajan solas en el handshake.
export function useChatSocket(onEvent) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    let ws = null;
    let closed = false;
    let retry = 1000;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(wsUrl());
      ws.onopen = () => { retry = 1000; };
      ws.onmessage = (e) => {
        try { cbRef.current(JSON.parse(e.data)); } catch { /* evento no JSON */ }
      };
      ws.onclose = () => {
        if (!closed) {
          setTimeout(connect, retry);
          retry = Math.min(retry * 2, 15000);
        }
      };
    };

    connect();
    return () => { closed = true; ws?.close(); };
  }, []);
}
