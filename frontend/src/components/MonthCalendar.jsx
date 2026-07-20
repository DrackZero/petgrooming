import { useMemo } from 'react';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Mismos colores de estado usados en el resto de la app (Appointments, VetAgenda, Reports).
export const STATUS_COLORS = {
  disponible: '#6366f1',
  pendiente: '#d97706',
  confirmada: '#059669',
  completada: '#0284c7',
  cancelada: '#dc2626',
};

const pad = (n) => String(n).padStart(2, '0');
const toKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Calendario mensual (estilo Q10): resalta con puntos de color los días
// que tienen citas, coloreados por estado. Clic en un día lo selecciona.
// summaryByDay: { 'YYYY-MM-DD': { pendiente: 2, confirmada: 1, ... } }
export default function MonthCalendar({ year, month, summaryByDay, selectedDay, onSelectDay, onMonthChange }) {
  const today = new Date();
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // semana empieza en lunes
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [year, month]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onMonthChange(-1)}
          aria-label="Mes anterior"
          className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 font-bold"
        >
          ‹
        </button>
        <p className="font-bold text-slate-800">{MONTHS[month]} {year}</p>
        <button
          onClick={() => onMonthChange(1)}
          aria-label="Mes siguiente"
          className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 font-bold"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-1">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const key = toKey(year, month, d);
          const summary = summaryByDay[key];
          const total = summary ? Object.values(summary).reduce((a, b) => a + b, 0) : 0;
          const available = summary?.disponible || 0;
          const bookedCount = total - available;
          const isToday = key === todayKey;
          const isSelected = key === selectedDay;

          const titleParts = [];
          if (bookedCount > 0) titleParts.push(`${bookedCount} cita${bookedCount !== 1 ? 's' : ''}`);
          if (available > 0) titleParts.push(`${available} horario${available !== 1 ? 's' : ''} libre${available !== 1 ? 's' : ''}`);

          return (
            <button
              key={key}
              onClick={() => onSelectDay(key)}
              title={titleParts.length ? titleParts.join(' · ') : undefined}
              className={`relative aspect-square rounded-xl text-sm flex flex-col items-center justify-center gap-0.5 transition
                ${isSelected ? 'bg-brand text-white font-bold shadow-sm' : isToday ? 'bg-brand-50 text-brand-dark font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {d}
              {total > 0 && (
                <span className="flex gap-0.5">
                  {Object.keys(summary).slice(0, 3).map((status) => (
                    <span
                      key={status}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: isSelected ? '#ffffff' : STATUS_COLORS[status] || '#64748b' }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5 capitalize">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {status}
          </span>
        ))}
      </div>
    </div>
  );
}
