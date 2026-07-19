import { useState, useEffect } from 'react';
import {
  getVetRequests,
  approveVet,
  rejectVet,
  getMyVets,
  setMyVetActive,
} from '../../api/gerente.js';
import Notification from '../../components/Notification.jsx';
import Tooltip from '../../components/Tooltip.jsx';

// Panel del GERENTE: gestión de los veterinarios de su clínica.
export default function GerenteVets() {
  const [requests, setRequests] = useState([]);
  const [vets, setVets] = useState([]);
  const [msg, setMsg] = useState('');

  const load = () => {
    getVetRequests().then(setRequests).catch(() => {});
    getMyVets().then(setVets).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const approve = async (u) => {
    try {
      const r = await approveVet(u.id);
      setMsg(`${r.name} ahora atiende en tu veterinaria ✓`);
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'No fue posible aprobar');
    }
  };

  const reject = async (u) => {
    await rejectVet(u.id).catch(() => {});
    setMsg(`Solicitud de ${u.name} rechazada`);
    load();
  };

  const toggleActive = async (v) => {
    await setMyVetActive(v.id, !v.is_active).catch(() => {});
    load();
  };

  return (
    <div>
      <h1 className="page-title mb-4">Mis veterinarios</h1>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      {/* Solicitudes pendientes */}
      {requests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 my-4">
          <h2 className="font-bold text-amber-800 mb-3">
            Solicitudes para unirse a tu veterinaria ({requests.length})
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
                  <button onClick={() => approve(u)} className="text-sm font-semibold px-4 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition">
                    ✓ Aprobar
                  </button>
                  <button onClick={() => reject(u)} className="text-sm font-semibold px-4 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition">
                    ✕ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipo actual */}
      <div className="overflow-x-auto mt-3">
        <table className="w-full min-w-[640px] bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Veterinario</th><th className="p-3">Email</th>
              <th className="p-3">Teléfono</th><th className="p-3">Estado</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {vets.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="p-3">🩺 {v.name}</td>
                <td className="p-3">{v.email}</td>
                <td className="p-3">{v.phone || '—'}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${v.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {v.is_active ? 'activo' : 'desactivado'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Tooltip tip={v.is_active ? 'Bloquea su acceso; sus citas e historial se conservan' : 'Permite que vuelva a atender'} side="top">
                    <button onClick={() => toggleActive(v)} className={v.is_active ? 'text-red-600 hover:underline' : 'text-emerald-600 hover:underline'}>
                      {v.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </Tooltip>
                </td>
              </tr>
            ))}
            {vets.length === 0 && (
              <tr><td colSpan="5" className="p-3 text-slate-500">Aún no tienes veterinarios en tu equipo.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
