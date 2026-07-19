import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getChatVets,
  getConversations,
  createConversation,
  getMessages,
  sendChatMessage,
  closeConversation,
} from '../api/chat.js';
import { useAuth } from '../hooks/useAuth.js';
import { useChatSocket } from '../hooks/useChatSocket.js';
import Notification from '../components/Notification.jsx';

// Chat de emergencia en vivo entre cliente y veterinario.
// Envío por REST (fiable); recepción en tiempo real por WebSocket.
export default function Chat() {
  const { user, isClient } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [vets, setVets] = useState([]);
  const [newVetId, setNewVetId] = useState('');
  const [active, setActive] = useState(null); // conversación seleccionada
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const activeIdRef = useRef(null);
  activeIdRef.current = active?.id ?? null;

  const loadConversations = useCallback(() => {
    getConversations().then(setConversations).catch(() => {});
  }, []);

  useEffect(() => {
    loadConversations();
    if (isClient) getChatVets().then(setVets).catch(() => {});
  }, [isClient, loadConversations]);

  // Al elegir conversación, carga su historial.
  const openConversation = async (conv) => {
    setActive(conv);
    const data = await getMessages(conv.id).catch(() => null);
    if (data) {
      setActive(data.conversation);
      setMessages(data.messages);
    }
  };

  // Eventos en vivo del servidor.
  useChatSocket((event) => {
    if (event.type === 'message') {
      if (event.conversationId === activeIdRef.current) {
        setMessages((prev) =>
          prev.some((m) => m.id === event.message.id) ? prev : [...prev, event.message]
        );
      }
      loadConversations(); // refresca "último mensaje" en la lista
    }
    if (event.type === 'conversation') {
      loadConversations(); // nueva urgencia entrante (vista del vet)
    }
    if (event.type === 'conversation_closed') {
      if (event.conversationId === activeIdRef.current) {
        setActive((prev) => (prev ? { ...prev, status: 'cerrada' } : prev));
      }
      loadConversations();
    }
  });

  // Autoscroll al último mensaje.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startEmergency = async () => {
    if (!newVetId) return;
    try {
      const conv = await createConversation(newVetId);
      setNewVetId('');
      loadConversations();
      openConversation(conv);
    } catch (err) {
      setError(err.response?.data?.message || 'No fue posible iniciar la urgencia');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !active || sending) return;
    setSending(true);
    try {
      const msg = await sendChatMessage(active.id, body);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setText('');
    } catch (err) {
      setError(err.response?.data?.message || 'No fue posible enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!active || !confirm('¿Cerrar esta conversación de urgencia?')) return;
    await closeConversation(active.id).catch(() => {});
    setActive((prev) => (prev ? { ...prev, status: 'cerrada' } : prev));
    loadConversations();
  };

  const otherName = (c) => (isClient ? c.vet_name : c.client_name);

  return (
    <div>
      <h1 className="page-title mb-1">🚨 Urgencias</h1>
      <p className="text-sm text-slate-500 mb-4">
        {isClient
          ? 'Chatea en vivo con un veterinario cuando tu mascota necesita ayuda urgente.'
          : 'Emergencias de tus clientes en tiempo real.'}
      </p>
      <Notification type="error" message={error} onClose={() => setError('')} />

      <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start mt-3">
        {/* Lista de conversaciones */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {isClient && (
            <div className="p-3 border-b border-slate-100 bg-red-50">
              <p className="text-xs font-bold text-red-700 mb-2">NUEVA URGENCIA</p>
              <div className="flex gap-2">
                <select
                  value={newVetId}
                  onChange={(e) => setNewVetId(e.target.value)}
                  className="flex-1 border rounded-lg p-2 text-sm min-w-0"
                >
                  <option value="">Elige veterinario…</option>
                  {vets.map((v) => (
                    <option key={v.id} value={v.id}>🩺 {v.name}</option>
                  ))}
                </select>
                <button
                  onClick={startEmergency}
                  disabled={!newVetId}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:bg-slate-300 transition"
                >
                  Iniciar
                </button>
              </div>
            </div>
          )}

          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c)}
                className={`w-full text-left p-3 hover:bg-slate-50 transition ${active?.id === c.id ? 'bg-brand-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{otherName(c)}</p>
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    c.status === 'abierta' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {c.last_message || 'Sin mensajes aún'}
                </p>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="p-4 text-sm text-slate-400">
                {isClient ? 'Sin urgencias. Inicia una arriba si la necesitas.' : 'No tienes urgencias entrantes.'}
              </p>
            )}
          </div>
        </div>

        {/* Hilo de mensajes */}
        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[520px]">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Selecciona una conversación para ver los mensajes.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div>
                  <p className="font-bold">{otherName(active)}</p>
                  <p className={`text-xs ${active.status === 'abierta' ? 'text-red-600' : 'text-slate-400'}`}>
                    {active.status === 'abierta' ? '● Urgencia abierta' : 'Conversación cerrada'}
                  </p>
                </div>
                {active.status === 'abierta' && (
                  <button onClick={handleClose} className="text-sm text-slate-500 hover:text-red-600 hover:underline">
                    Cerrar urgencia
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                        mine ? 'bg-brand text-white rounded-br-md' : 'bg-slate-100 text-slate-700 rounded-bl-md'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${mine ? 'text-brand-100' : 'text-slate-400'}`}>
                          {new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <p className="text-center text-sm text-slate-400 mt-8">
                    Aún no hay mensajes. Escribe el primero.
                  </p>
                )}
                <div ref={bottomRef} />
              </div>

              {active.status === 'abierta' ? (
                <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-slate-100">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Escribe un mensaje…"
                    maxLength={2000}
                    className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <button
                    disabled={!text.trim() || sending}
                    className="px-5 py-2 rounded-full bg-brand text-white text-sm font-bold hover:bg-brand-dark disabled:bg-slate-300 transition"
                  >
                    Enviar
                  </button>
                </form>
              ) : (
                <p className="p-3 border-t border-slate-100 text-center text-xs text-slate-400">
                  Esta urgencia fue cerrada. {isClient && 'Puedes iniciar una nueva si la necesitas.'}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
