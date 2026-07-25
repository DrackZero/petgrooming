import { useMemo } from 'react';
import { STATUS_COLORS } from './MonthCalendar.jsx';

// Horario semanal estilo Q10: rejilla de horas (filas) por días (columnas).
// Cada celda muestra las franjas libres y las citas de esa hora, y se puede
// tocar para crear, eliminar o gestionar sin salir de la vista.

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Lunes de la semana a la que pertenece la fecha dada.
export const startOfWeek = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`;
// Formato 24 h: en una celda estrecha "14:30" cabe donde "02:30 p. m." no.
const timeOf = (d) => {
  const x = new Date(d);
  return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};

export default function WeekSchedule({
  weekStart,
  slots = [],           // franjas libres { id, starts_at, ends_at }
  appointments = [],    // citas { id, status, pet_name, client_name, starts_at }
  onWeekChange,
  onCreateSlot,         // (Date) => void   celda vacía
  onDeleteSlot,         // (slot) => void   franja libre
  onSelectAppointment,  // (cita) => void   cita agendada
  loading = false,
  openHour = 7,         // horario de atención de la clínica
  closeHour = 19,
}) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart]
  );

  // El rango visible es el horario de atención de la clínica. Solo se amplía
  // si hay registros fuera de él (franjas o citas antiguas creadas antes de
  // fijar el horario): nunca se ocultan datos que el veterinario deba gestionar.
  const [firstHour, lastHour] = useMemo(() => {
    const hours = [...slots, ...appointments]
      .map((x) => new Date(x.starts_at))
      .filter((d) => d >= days[0] && d < new Date(days[6].getTime() + 86400000))
      .map((d) => d.getHours());
    // Las filas son bloques de una hora: la última es la que TERMINA al cerrar
    // (con cierre a las 19:00, la última fila es 18:00–19:00).
    const lastOpen = Math.max(openHour, closeHour - 1);
    if (!hours.length) return [openHour, lastOpen];
    return [Math.min(openHour, ...hours), Math.max(lastOpen, ...hours)];
  }, [slots, appointments, days, openHour, closeHour]);

  const hours = useMemo(
    () => Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i),
    [firstHour, lastHour]
  );

  // Índice por "día-hora" para no recorrer las listas en cada celda.
  const byCell = useMemo(() => {
    const map = {};
    const put = (date, kind, item) => {
      const d = new Date(date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
      (map[key] = map[key] || []).push({ kind, item, at: d });
    };
    for (const s of slots) put(s.starts_at, 'slot', s);
    for (const a of appointments) put(a.starts_at, 'appt', a);
    for (const k of Object.keys(map)) map[k].sort((x, y) => x.at - y.at);
    return map;
  }, [slots, appointments]);

  const today = new Date();
  const now = new Date();

  const rangeLabel = () => {
    const a = days[0], b = days[6];
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()} – ${b.getDate()} de ${MONTHS[a.getMonth()]} ${a.getFullYear()}`
      : `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Cabecera con navegación */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button
          onClick={() => onWeekChange(-1)}
          aria-label="Semana anterior"
          className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 font-bold transition"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="font-bold text-slate-800 capitalize">{rangeLabel()}</p>
          <button
            onClick={() => onWeekChange(0)}
            className="text-xs text-brand-dark hover:underline"
          >
            Ir a esta semana
          </button>
        </div>
        <button
          onClick={() => onWeekChange(1)}
          aria-label="Semana siguiente"
          className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 font-bold transition"
        >
          ›
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Encabezado de días */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
            <div />
            {days.map((d, i) => {
              const isToday = sameDay(d, today);
              return (
                <div
                  key={i}
                  className={`py-2 text-center border-l border-slate-100 ${isToday ? 'bg-brand-50' : ''}`}
                >
                  <p className={`text-xs font-semibold ${isToday ? 'text-brand-dark' : 'text-slate-400'}`}>
                    {WEEKDAYS[i]}
                  </p>
                  <p className={`text-sm font-bold ${isToday ? 'text-brand-dark' : 'text-slate-600'}`}>
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Filas de horas */}
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            hours.map((h) => (
              <div key={h} className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0">
                <div className="py-1 pr-2 text-right text-[11px] text-slate-400 font-medium">
                  {hourLabel(h)}
                </div>

                {days.map((d, di) => {
                  const cellDate = new Date(d);
                  cellDate.setHours(h, 0, 0, 0);
                  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${h}`;
                  const items = byCell[key] || [];
                  const isPast = cellDate < now;
                  const isToday = sameDay(d, today);
                  const isClosed = h < openHour || h >= closeHour; // fuera del horario de atención

                  return (
                    <div
                      key={di}
                      className={`min-h-[42px] p-1 border-l border-slate-100 space-y-1 ${
                        isClosed ? 'bg-slate-50/80' : isToday ? 'bg-brand-50/40' : ''
                      }`}
                    >
                      {items.map(({ kind, item }) =>
                        kind === 'slot' ? (
                          <button
                            key={`s${item.id}`}
                            onClick={() => onDeleteSlot?.(item)}
                            title={`Franja libre ${timeOf(item.starts_at)} — toca para eliminarla`}
                            className="w-full text-left px-1.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition"
                          >
                            {timeOf(item.starts_at)} · Libre
                          </button>
                        ) : (
                          <button
                            key={`a${item.id}`}
                            onClick={() => onSelectAppointment?.(item)}
                            title={`${item.pet_name} (${item.client_name}) — ${item.status}`}
                            className="w-full text-left px-1.5 py-1 rounded-md text-[11px] font-semibold text-white hover:brightness-110 hover:shadow-sm transition"
                            style={{ backgroundColor: STATUS_COLORS[item.status] || '#64748b' }}
                          >
                            <span className="block truncate">{timeOf(item.starts_at)} · {item.pet_name}</span>
                          </button>
                        )
                      )}

                      {/* Celda vacía: crear franja. No se permite en el pasado
                          ni fuera del horario de atención de la clínica. */}
                      {!items.length && !isPast && !isClosed && onCreateSlot && (
                        <button
                          onClick={() => onCreateSlot(cellDate)}
                          title={`Crear franja de atención el ${d.getDate()} a las ${hourLabel(h)}`}
                          className="w-full h-[34px] rounded-md text-slate-300 hover:text-brand hover:bg-brand-50 border border-transparent hover:border-brand-200 transition text-sm"
                        >
                          +
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-300" /> Franja libre
        </span>
        {['pendiente', 'confirmada', 'completada', 'cancelada'].map((s) => (
          <span key={s} className="flex items-center gap-1.5 capitalize">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS[s] }} />
            {s}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" /> Fuera de horario
        </span>
        <span className="ml-auto text-slate-400">
          Atención de {String(openHour).padStart(2, '0')}:00 a {String(closeHour).padStart(2, '0')}:00
        </span>
      </div>
    </div>
  );
}
