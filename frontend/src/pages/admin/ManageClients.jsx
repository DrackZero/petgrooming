import { useState, useEffect } from 'react';
import {
  getClients,
  setClientActive,
  assignVetRole,
  getVetRequests,
  rejectVetRequest,
} from '../../api/admin.js';
import Notification from '../../components/Notification.jsx';

export default function ManageClients() {
  const [clients, setClients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState('');

  const load = () => {
    getClients().then(setClients).catch(() => {});
    getVetRequests().then(setRequests).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (c) => {
    await setClientActive(c.id, !c.is_active).catch(() => {});
    load();
  };

  const makeVet = async (c) => {
    if (!confirm(`¿Asignar rol de VETERINARIO a ${c.name}? Dejará de ser cliente.`)) return;
    try {
      const r = await assignVetRole(c.id);
      setMsg(`${r.name} ahora es ${r.role} ✓`);
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'No fue posible asignar el rol');
    }
  };

  const rejectRequest = async (u) => {
    await rejectVetRequest(u.id).catch(() => {});
    setMsg(`Solicitud de ${u.name} rechazada`);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Clientes y roles</h1>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      {/* Solicitudes pendientes de rol veterinario */}
      {requests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 my-4">
          <h2 className="font-bold text-amber-800 mb-3">
            🩺 Solicitudes para ser veterinario ({requests.length})
          </h2>
          <div className="space-y-2">
            {requests.map((u) => (
              <div key={u.id} className="bg-white rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-slate-500">
                    {u.email} · solicitó el {new Date(u.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => makeVet(u)}
                    className="text-sm font-semibold px-4 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition"
                  >
                    ✓ Aprobar
                  </button>
                  <button
                    onClick={() => rejectRequest(u)}
                    className="text-sm font-semibold px-4 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition"
                  >
                    ✕ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto mt-3">
        <table className="w-full min-w-[640px] bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Nombre</th><th className="p-3">Email</th>
              <th className="p-3">Teléfono</th><th className="p-3">Estado</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.name}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.phone || '—'}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {c.is_active ? 'activa' : 'desactivada'}
                  </span>
                </td>
                <td className="p-3 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => makeVet(c)} className="text-brand-dark hover:underline">
                    🩺 Hacer veterinario
                  </button>
                  <button onClick={() => toggleActive(c)} className={c.is_active ? 'text-red-600 hover:underline' : 'text-emerald-600 hover:underline'}>
                    {c.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan="5" className="p-3 text-slate-500">Sin clientes registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
