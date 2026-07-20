import { useState, useEffect } from 'react';
import { getAvailableSlots, createSlot, createSlotsBulk, deleteSlot } from '../../api/appointments.js';
import Notification from '../../components/Notification.jsx';
import Tooltip from '../../components/Tooltip.jsx';

// Orden visual L→D con los valores de getDay() (0=domingo).
const WEEKDAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const emptyBulk = {
  start_date: '',
  end_date: '',
  weekdays: [1, 2, 3, 4, 5], // L-V por defecto
  day_start: '08:00',
  day_end: '17:00',
  duration_min: 60,
};

// Panel del VETERINARIO: definir su jornada laboral y horarios de citas.
export default function VetSlots() {
  const [slots, setSlots] = useState([]);
  const [bulk, setBulk] = useState(emptyBulk);
  const [single, setSingle] = useState({ starts_at: '', ends_at: '' });
  const [showSingle, setShowSingle] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // mine=1: cada veterinario ve y gestiona solo SUS horarios.
  const load = () => getAvailableSlots({ mine: 1 }).then(setSlots).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggleDay = (value) =>
    setBulk((b) => ({
      ...b,
      weekdays: b.weekdays.includes(value)
        ? b.weekdays.filter((d) => d !== value)
        : [...b.weekdays, value],
    }));

  const handleBulk = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      const r = await createSlotsBulk({ ...bulk, duration_min: Number(bulk.duration_min) });
      setMsg(`✓ ${r.created} horarios creados${r.skipped ? ` · ${r.skipped} omitidos (pasados o ya existentes)` : ''}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al generar la jornada');
    }
  };

  const handleSingle = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      await createSlot(single);
      setSingle({ starts_at: '', ends_at: '' });
      setMsg('✓ Horario individual creado');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear el horario');
    }
  };

  const handleDelete = async (id) => {
    await deleteSlot(id).catch(() => {});
    load();
  };

  // Agrupa los horarios libres por día para una lista legible.
  const grouped = slots.reduce((acc, s) => {
    const key = new Date(s.starts_at).toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="page-title mb-4">Horarios de atención</h1>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />
      <Notification type="error" message={error} onClose={() => setError('')} />

      {/* ── Jornada laboral (generación masiva) ── */}
      <form onSubmit={handleBulk} className="bg-white border border-slate-200 rounded-2xl p-5 my-4 space-y-4">
        <div>
          <h2 className="font-bold text-slate-800">Definir jornada laboral</h2>
          <p className="text-sm text-slate-500">
            Selecciona los días que trabajas y tu horario: se generan todas las franjas de una vez.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">
            Desde
            <input type="date" required className="border rounded-lg p-2 w-full mt-1"
              value={bulk.start_date} onChange={(e) => setBulk({ ...bulk, start_date: e.target.value })} />
          </label>
          <label className="text-sm">
            Hasta
            <input type="date" required className="border rounded-lg p-2 w-full mt-1"
              value={bulk.end_date} onChange={(e) => setBulk({ ...bulk, end_date: e.target.value })} />
          </label>
        </div>

        <div>
          <p className="text-sm mb-1.5">Días de trabajo</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${
                  bulk.weekdays.includes(d.value)
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-sm">
            Inicio de jornada
            <input type="time" required className="border rounded-lg p-2 w-full mt-1"
              value={bulk.day_start} onChange={(e) => setBulk({ ...bulk, day_start: e.target.value })} />
          </label>
          <label className="text-sm">
            Fin de jornada
            <input type="time" required className="border rounded-lg p-2 w-full mt-1"
              value={bulk.day_end} onChange={(e) => setBulk({ ...bulk, day_end: e.target.value })} />
          </label>
          <Tooltip tip="Cuánto dura cada cita: define cada cuánto se crea una franja dentro de tu jornada" side="top">
            <label className="text-sm w-full">
              Duración por cita
              <select className="border rounded-lg p-2 w-full mt-1"
                value={bulk.duration_min} onChange={(e) => setBulk({ ...bulk, duration_min: e.target.value })}>
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">1 hora</option>
                <option value="90">1 hora 30 min</option>
                <option value="120">2 horas</option>
              </select>
            </label>
          </Tooltip>
        </div>

        <button
          disabled={!bulk.weekdays.length}
          className="w-full bg-brand text-white rounded-full py-2.5 font-semibold hover:bg-brand-dark disabled:bg-slate-300 transition"
        >
          Generar horarios de la jornada
        </button>
      </form>

      {/* ── Horario individual (opcional) ── */}
      <button
        onClick={() => setShowSingle((v) => !v)}
        className="text-sm text-brand-dark hover:underline mb-2"
      >
        {showSingle ? '▲ Ocultar' : '▼ ¿Necesitas una franja suelta? Crear horario individual'}
      </button>
      {showSingle && (
        <form onSubmit={handleSingle} className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 grid sm:grid-cols-2 gap-3">
          <label className="text-sm">
            Inicio
            <input type="datetime-local" required className="border rounded-lg p-2 w-full mt-1"
              value={single.starts_at} onChange={(e) => setSingle({ ...single, starts_at: e.target.value })} />
          </label>
          <label className="text-sm">
            Fin
            <input type="datetime-local" required className="border rounded-lg p-2 w-full mt-1"
              value={single.ends_at} onChange={(e) => setSingle({ ...single, ends_at: e.target.value })} />
          </label>
          <button className="bg-brand text-white rounded-full py-2 sm:col-span-2 font-semibold hover:bg-brand-dark">
            Crear franja individual
          </button>
        </form>
      )}

      {/* ── Lista agrupada por día ── */}
      <h2 className="font-bold text-slate-800 mt-6 mb-2">
        Próximos horarios libres <span className="text-slate-400 font-normal">({slots.length})</span>
      </h2>
      <div className="space-y-4">
        {Object.entries(grouped).map(([day, daySlots]) => (
          <div key={day} className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="font-semibold text-brand-dark capitalize mb-2">{day}</p>
            <div className="flex flex-wrap gap-2">
              {daySlots.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 text-sm bg-brand-50 text-slate-700 rounded-full pl-3 pr-1.5 py-1">
                  {new Date(s.starts_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  <button
                    onClick={() => handleDelete(s.id)}
                    title="Eliminar franja"
                    className="w-5 h-5 rounded-full bg-white text-red-500 text-xs leading-none hover:bg-red-50"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
        {slots.length === 0 && (
          <p className="text-slate-500 text-sm">No hay horarios libres. Define tu jornada laboral arriba. 👆</p>
        )}
      </div>
    </div>
  );
}
