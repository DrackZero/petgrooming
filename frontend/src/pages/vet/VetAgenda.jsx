import { useState, useEffect } from 'react';
import { getAgenda, getAllAppointments, updateAppointmentStatus } from '../../api/appointments.js';
import Notification from '../../components/Notification.jsx';

const today = () => new Date().toISOString().slice(0, 10);

const statusStyle = {
  pendiente: 'bg-amber-50 text-amber-700',
  confirmada: 'bg-emerald-50 text-emerald-700',
  completada: 'bg-sky-50 text-sky-700',
  cancelada: 'bg-red-50 text-red-600',
};

// Panel del VETERINARIO: agenda del día + gestión de todas las citas.
export default function VetAgenda() {
  const [date, setDate] = useState(today());
  const [agenda, setAgenda] = useState([]);
  const [all, setAll] = useState([]);
  const [notesFor, setNotesFor] = useState(null); // cita a completar con notas
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    getAgenda(date).then(setAgenda).catch(() => {});
    getAllAppointments().then(setAll).catch(() => {});
  };

  useEffect(() => { load(); }, [date]);

  const setStatus = async (id, status, withNotes) => {
    try {
      await updateAppointmentStatus(id, status, withNotes);
      setMsg(`Cita ${status} ✓`);
      setNotesFor(null);
      setNotes('');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error al actualizar la cita');
    }
  };

  const Actions = ({ a }) => (
    <div className="flex gap-2 flex-wrap justify-end">
      {a.status === 'pendiente' && (
        <>
          <button onClick={() => setStatus(a.id, 'confirmada')} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">
            Confirmar
          </button>
          <button onClick={() => setStatus(a.id, 'cancelada')} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">
            Rechazar
          </button>
        </>
      )}
      {a.status === 'confirmada' && (
        <>
          <button onClick={() => { setNotesFor(a); setNotes(''); }} className="text-xs px-2 py-1 rounded bg-sky-600 text-white hover:bg-sky-700">
            Completar
          </button>
          <button onClick={() => setStatus(a.id, 'cancelada')} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">
            Cancelar
          </button>
        </>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Agenda</h1>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      {/* Agenda del día */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 my-4">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="font-semibold">Agenda del día</h2>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded p-1 text-sm" />
        </div>
        <div className="space-y-2">
          {agenda.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
              <div>
                <p className="text-sm font-medium">
                  {new Date(a.starts_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  {' — '}{a.pet_name} <span className="text-slate-400">({a.client_name})</span>
                </p>
                <span className={`text-xs px-2 py-0.5 rounded capitalize ${statusStyle[a.status] || 'bg-slate-100'}`}>{a.status}</span>
              </div>
              <Actions a={a} />
            </div>
          ))}
          {agenda.length === 0 && <p className="text-slate-500 text-sm">No hay citas para esta fecha.</p>}
        </div>
      </div>

      {/* Notas al completar */}
      {notesFor && (
        <div className="bg-white border border-brand rounded-lg p-4 mb-4">
          <p className="font-medium mb-2">
            Notas de la consulta — {notesFor.pet_name} ({notesFor.client_name})
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones de la atención…"
            className="w-full border rounded p-2 text-sm"
            rows="3"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setStatus(notesFor.id, 'completada', notes)} className="bg-brand text-white rounded px-4 py-2 text-sm hover:bg-brand-dark">
              Marcar como completada
            </button>
            <button onClick={() => setNotesFor(null)} className="px-3 rounded bg-slate-100 hover:bg-slate-200 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Todas las citas */}
      <h2 className="font-semibold mb-2">Todas las citas</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Fecha</th><th className="p-3">Cliente</th>
              <th className="p-3">Mascota</th><th className="p-3">Estado</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {all.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{new Date(a.starts_at).toLocaleString('es-ES')}</td>
                <td className="p-3">{a.client_name}</td>
                <td className="p-3">{a.pet_name}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${statusStyle[a.status] || 'bg-slate-100'}`}>{a.status}</span>
                </td>
                <td className="p-3"><Actions a={a} /></td>
              </tr>
            ))}
            {all.length === 0 && (
              <tr><td colSpan="5" className="p-3 text-slate-500">No hay citas registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
