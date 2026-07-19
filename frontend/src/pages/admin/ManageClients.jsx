import { useState, useEffect } from 'react';
import {
  getClients,
  setClientActive,
  getVets,
  setVetActive,
  setVetClinic,
  getClinics,
  assignVetRole,
  getVetRequests,
  rejectVetRequest,
} from '../../api/admin.js';
import Notification from '../../components/Notification.jsx';
import Tooltip from '../../components/Tooltip.jsx';

export default function ManageClients() {
  const [tab, setTab] = useState('clients'); // 'clients' | 'vets'
  const [clients, setClients] = useState([]);
  const [vets, setVets] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState('');

  const load = () => {
    getClients().then(setClients).catch(() => {});
    getVets().then(setVets).catch(() => {});
    getClinics().then(setClinics).catch(() => {});
    getVetRequests().then(setRequests).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const toggleClientActive = async (c) => {
    await setClientActive(c.id, !c.is_active).catch(() => {});
    load();
  };

  const toggleVetActive = async (v) => {
    await setVetActive(v.id, !v.is_active).catch(() => {});
    load();
  };

  const changeVetClinic = async (v, clinicId) => {
    await setVetClinic(v.id, clinicId ? Number(clinicId) : null).catch(() => {});
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
      <h1 className="text-2xl font-bold mb-4">Clientes y veterinarios</h1>
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

      {/* Pestañas */}
      <div className="flex gap-2 mt-4 mb-3">
        <button
          onClick={() => setTab('clients')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
            tab === 'clients' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'
          }`}
        >
          Clientes ({clients.length})
        </button>
        <button
          onClick={() => setTab('vets')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
            tab === 'vets' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'
          }`}
        >
          🩺 Veterinarios ({vets.length})
        </button>
      </div>

      {tab === 'clients' && (
        <div className="overflow-x-auto">
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
                    <Tooltip tip="Convierte esta cuenta de cliente en veterinario" side="top">
                      <button onClick={() => makeVet(c)} className="text-brand-dark hover:underline">
                        🩺 Hacer veterinario
                      </button>
                    </Tooltip>
                    <Tooltip tip={c.is_active ? 'Bloquea el inicio de sesión sin borrar su historial' : 'Permite que vuelva a iniciar sesión'} side="top">
                      <button onClick={() => toggleClientActive(c)} className={c.is_active ? 'text-red-600 hover:underline' : 'text-emerald-600 hover:underline'}>
                        {c.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan="5" className="p-3 text-slate-500">Sin clientes registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'vets' && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">Nombre</th><th className="p-3">Email</th>
                <th className="p-3">Clínica</th><th className="p-3">Estado</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {vets.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="p-3">🩺 {v.name}</td>
                  <td className="p-3">{v.email}</td>
                  <td className="p-3">
                    <select
                      value={v.clinic_id || ''}
                      onChange={(e) => changeVetClinic(v, e.target.value)}
                      className="border rounded-lg p-1.5 text-sm max-w-[180px]"
                    >
                      <option value="">Sin clínica</option>
                      {clinics.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${v.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {v.is_active ? 'activo' : 'desactivado'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Tooltip tip={v.is_active ? 'Bloquea su acceso; sus citas e historial se conservan' : 'Permite que vuelva a iniciar sesión'} side="top">
                      <button onClick={() => toggleVetActive(v)} className={v.is_active ? 'text-red-600 hover:underline' : 'text-emerald-600 hover:underline'}>
                        {v.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
              {vets.length === 0 && (
                <tr><td colSpan="5" className="p-3 text-slate-500">Sin veterinarios registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
