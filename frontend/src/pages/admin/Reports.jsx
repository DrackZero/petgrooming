import { useState, useEffect } from 'react';
import { getReports } from '../../api/admin.js';
import { formatCOP } from '../../utils/format.js';
import Tooltip from '../../components/Tooltip.jsx';

const dayStr = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => dayStr(new Date(Date.now() - n * 86400000));

// Colores de estado (paleta validada); siempre acompañados de etiqueta.
const STATUS_COLORS = {
  pendiente: '#d97706',
  confirmada: '#059669',
  completada: '#0284c7',
  cancelada: '#dc2626',
};

export default function Reports() {
  const [range, setRange] = useState({ from: daysAgo(29), to: daysAgo(0) });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    getReports(range)
      .then(setData)
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar el reporte'));
  }, [range]);

  const quick = (days) => setRange({ from: daysAgo(days - 1), to: daysAgo(0) });

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-slate-500">Cargando reportes…</p>;

  const { totals, salesByDay, apptByStatus, topProducts } = data;
  const maxSale = Math.max(...salesByDay.map((d) => Number(d.total)), 1);
  const totalAppts = apptByStatus.reduce((s, r) => s + r.count, 0) || 1;
  const maxUnits = Math.max(...topProducts.map((p) => p.units), 1);

  const tiles = [
    { label: 'Ingresos', value: formatCOP(totals.revenue) },
    { label: 'Pedidos pagados', value: `${totals.paidOrders} de ${totals.orders}` },
    { label: 'Citas', value: totals.appointments },
    { label: 'Inscripciones', value: totals.enrollments },
    { label: 'Clientes nuevos', value: totals.newClients },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Reportes</h1>
      <p className="text-sm text-slate-500 mb-4">Resultados del negocio en el periodo seleccionado.</p>

      {/* Filtros de fecha */}
      <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <label className="text-sm">
          Desde
          <input
            type="date" value={range.from} max={range.to}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            className="border rounded-lg p-2 w-full mt-1"
          />
        </label>
        <label className="text-sm">
          Hasta
          <input
            type="date" value={range.to} min={range.from} max={daysAgo(0)}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            className="border rounded-lg p-2 w-full mt-1"
          />
        </label>
        <div className="flex gap-2 ml-auto">
          {[7, 30, 90].map((d) => (
            <Tooltip key={d} tip={`Ver los últimos ${d} días`}>
              <button
                onClick={() => quick(d)}
                className="px-3 py-1.5 rounded-full text-sm font-semibold border border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-dark transition"
              >
                {d} días
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Cifras del periodo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-sm text-slate-500">{t.label}</p>
            <p className="text-xl font-extrabold text-brand-dark mt-1">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ventas por día */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:col-span-2">
          <h2 className="font-bold text-slate-800 mb-4">Ventas por día</h2>
          {salesByDay.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Sin ventas pagadas en este periodo.</p>
          ) : (
            <>
              <div className="flex items-end gap-[2px] h-40">
                {salesByDay.map((d) => (
                  <div
                    key={d.day}
                    title={`${new Date(d.day).toLocaleDateString('es-CO')} — ${formatCOP(d.total)}`}
                    className="flex-1 bg-brand-600 rounded-t hover:bg-brand-400 transition min-w-[6px]"
                    style={{ height: `${Math.max((Number(d.total) / maxSale) * 100, 3)}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>{new Date(salesByDay[0].day).toLocaleDateString('es-CO')}</span>
                <span>{new Date(salesByDay[salesByDay.length - 1].day).toLocaleDateString('es-CO')}</span>
              </div>
            </>
          )}
        </div>

        {/* Citas por estado */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-bold text-slate-800 mb-4">Citas por estado</h2>
          {apptByStatus.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Sin citas en este periodo.</p>
          ) : (
            <div className="space-y-3">
              {apptByStatus.map((r) => (
                <div key={r.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-slate-600">{r.status}</span>
                    <span className="font-semibold text-slate-700">{r.count}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(r.count / totalAppts) * 100}%`,
                        backgroundColor: STATUS_COLORS[r.status] || '#64748b',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Productos más vendidos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-bold text-slate-800 mb-4">Productos más vendidos</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Sin ventas de productos en este periodo.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 truncate pr-2">{p.name}</span>
                    <span className="font-semibold text-slate-700 whitespace-nowrap">
                      {p.units} und
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-600 rounded-full"
                      style={{ width: `${(p.units / maxUnits) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
