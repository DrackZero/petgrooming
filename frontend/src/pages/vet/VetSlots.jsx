import { useState, useEffect } from 'react';
import {
  getAvailableSlots, getAllAppointments, createSlot, createSlotsBulk, deleteSlot, getClinicHours,
} from '../../api/appointments.js';
import Notification from '../../components/Notification.jsx';
import Tooltip from '../../components/Tooltip.jsx';
import WeekSchedule, { startOfWeek } from '../../components/WeekSchedule.jsx';
import { useConfirm } from '../../hooks/useConfirm.js';

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
  const confirmar = useConfirm();
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [bulk, setBulk] = useState(emptyBulk);
  const [single, setSingle] = useState({ starts_at: '', ends_at: '' });
  const [showSingle, setShowSingle] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [week, setWeek] = useState(startOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState({ opens_at: '07:00:00', closes_at: '19:00:00' });

  // El horario de la clínica acota la jornada que el veterinario puede definir.
  useEffect(() => {
    getClinicHours()
      .then((h) => {
        setHours(h);
        setBulk((b) => ({ ...b, day_start: String(h.opens_at).slice(0, 5), day_end: String(h.closes_at).slice(0, 5) }));
      })
      .catch(() => {});
  }, []);

  // mine=1: cada veterinario ve y gestiona solo SUS horarios.
  const load = () => {
    setLoading(true);
    Promise.all([
      getAvailableSlots({ mine: 1 }).catch(() => []),
      getAllAppointments().catch(() => []),
    ])
      .then(([s, a]) => { setSlots(s); setAppointments(a); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const changeWeek = (delta) => {
    setWeek((w) => {
      if (delta === 0) return startOfWeek(new Date());
      const d = new Date(w);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  };

  // Crear una franja de 1 hora tocando una celda vacía.
  const addSlotAt = async (date) => {
    const ends = new Date(date.getTime() + 60 * 60 * 1000);
    setMsg(''); setError('');
    try {
      await createSlot({ starts_at: date.toISOString(), ends_at: ends.toISOString() });
      setMsg(`✓ Franja abierta el ${date.toLocaleDateString('es-CO')} a las ${date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No fue posible crear la franja');
    }
  };

  const removeSlotFromGrid = async (slot) => {
    const f = new Date(slot.starts_at);
    const p2 = (n) => String(n).padStart(2, '0');
    const hora = `${f.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })} a las ${p2(f.getHours())}:${p2(f.getMinutes())}`;
    const ok = await confirmar({
      title: 'Eliminar franja de atención',
      message: `Se quitará la franja del ${hora}. Los clientes dejarán de verla al agendar.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await deleteSlot(slot.id).catch(() => {});
    setMsg('Franja eliminada');
    load();
  };

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

  return (
    <div className="max-w-5xl mx-auto">
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
          <p className="text-xs text-slate-400 mt-1">
            Tu veterinaria atiende de <strong>{String(hours.opens_at).slice(0, 5)}</strong> a{' '}
            <strong>{String(hours.closes_at).slice(0, 5)}</strong>. El gerente puede cambiar este horario.
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
            <input type="time" required
              min={String(hours.opens_at).slice(0, 5)} max={String(hours.closes_at).slice(0, 5)}
              className="border rounded-lg p-2 w-full mt-1"
              value={bulk.day_start} onChange={(e) => setBulk({ ...bulk, day_start: e.target.value })} />
          </label>
          <label className="text-sm">
            Fin de jornada
            <input type="time" required
              min={String(hours.opens_at).slice(0, 5)} max={String(hours.closes_at).slice(0, 5)}
              className="border rounded-lg p-2 w-full mt-1"
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

      {/* ── Horario semanal interactivo ── */}
      <div className="mt-6 mb-2">
        <h2 className="font-bold text-slate-800">
          Mi horario semanal <span className="text-slate-400 font-normal">({slots.length} franjas libres)</span>
        </h2>
        <p className="text-sm text-slate-500">
          Toca una celda vacía para abrir una franja de atención, o una franja libre para quitarla.
        </p>
      </div>
      <WeekSchedule
        weekStart={week}
        slots={slots}
        appointments={appointments}
        loading={loading}
        onWeekChange={changeWeek}
        onCreateSlot={addSlotAt}
        onDeleteSlot={removeSlotFromGrid}
        openHour={Number(String(hours.opens_at).slice(0, 2))}
        closeHour={Number(String(hours.closes_at).slice(0, 2))}
      />
    </div>
  );
}
