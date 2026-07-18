import { useState, useEffect, useCallback } from 'react';
import {
  getAgenda,
  getAllAppointments,
  getCalendarSummary,
  updateAppointmentStatus,
} from '../../api/appointments.js';
import MonthCalendar, { STATUS_COLORS } from '../../components/MonthCalendar.jsx';
import Notification from '../../components/Notification.jsx';

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Panel del VETERINARIO: calendario mensual (estilo Q10) + agenda del día + gestión de citas.
export default function VetAgenda() {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState(toKey(today));
  const [summaryByDay, setSummaryByDay] = useState({});
  const [agenda, setAgenda] = useState([]);
  const [all, setAll] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [notesFor, setNotesFor] = useState(null);
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');

  const loadCalendar = useCallback(() => {
    const month = `${cursor.year}-${pad(cursor.month + 1)}`;
    getCalendarSummary(month)
      .then((rows) => {
        const map = {};
        for (const r of rows) {
          const day = r.day.slice(0, 10);
          map[day] = { ...(map[day] || {}), [r.status]: r.count };
        }
        setSummaryByDay(map);
      })
      .catch(() => {});
  }, [cursor]);

  const loadAgenda = useCallback(() => {
    getAgenda(selectedDay).then(setAgenda).catch(() => {});
  }, [selectedDay]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);
  useEffect(() => { loadAgenda(); }, [loadAgenda]);
  useEffect(() => { if (showAll) getAllAppointments().then(setAll).catch(() => {}); }, [showAll]);

  const changeMonth = (delta) => {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const setStatus = async (id, status, withNotes) => {
    try {
      await updateAppointmentStatus(id, status, withNotes);
      setMsg(`Cita ${status} ✓`);
      setNotesFor(null);
      setNotes('');
      loadAgenda();
      loadCalendar();
      if (showAll) getAllAppointments().then(setAll).catch(() => {});
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

  const selectedDate = new Date(`${selectedDay}T00:00:00`);
  const isToday = selectedDay === toKey(today);

  return (
    <div>
      <h1 className="page-title mb-4">Agenda</h1>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Calendario mensual */}
        <MonthCalendar
          year={cursor.year}
          month={cursor.month}
          summaryByDay={summaryByDay}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onMonthChange={changeMonth}
        />

        {/* Agenda del día seleccionado */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-bold text-slate-800 mb-3 capitalize">
            {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            {isToday && <span className="ml-2 text-xs font-semibold text-brand-dark bg-brand-50 rounded-full px-2 py-0.5">Hoy</span>}
          </h2>

          <div className="space-y-2">
            {agenda.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                <div>
                  <p className="text-sm font-medium">
                    {new Date(a.starts_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    {' — '}{a.pet_name} <span className="text-slate-400">({a.client_name})</span>
                  </p>
                  <span
                    className="text-xs px-2 py-0.5 rounded capitalize text-white"
                    style={{ backgroundColor: STATUS_COLORS[a.status] || '#64748b' }}
                  >
                    {a.status}
                  </span>
                </div>
                <Actions a={a} />
              </div>
            ))}
            {agenda.length === 0 && <p className="text-slate-500 text-sm">No hay citas para este día.</p>}
          </div>
        </div>
      </div>

      {/* Notas al completar */}
      {notesFor && (
        <div className="bg-white border border-brand rounded-lg p-4 my-4">
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

      {/* Todas las citas (plegable) */}
      <button
        onClick={() => setShowAll((v) => !v)}
        className="text-sm text-brand-dark hover:underline mt-6 mb-2"
      >
        {showAll ? '▲ Ocultar' : '▼ Ver listado completo de citas'}
      </button>
      {showAll && (
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
                    <span
                      className="text-xs px-2 py-0.5 rounded capitalize text-white"
                      style={{ backgroundColor: STATUS_COLORS[a.status] || '#64748b' }}
                    >
                      {a.status}
                    </span>
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
      )}
    </div>
  );
}
