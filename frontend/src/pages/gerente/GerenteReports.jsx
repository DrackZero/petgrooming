import { useState, useEffect } from 'react';
import { getMyReports } from '../../api/gerente.js';

const STATUS_COLORS = {
  pendiente: '#d97706',
  confirmada: '#059669',
  completada: '#0284c7',
  cancelada: '#dc2626',
};

// Panel del GERENTE: reportes de actividad de su clínica.
export default function GerenteReports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyReports().then(setData).catch(() => setError('No se pudieron cargar los reportes'));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-slate-500">Cargando…</p>;

  const totalAppts = data.totalAppointments || 1;
  const tiles = [
    { label: 'Veterinarios activos', value: `${data.vets.activos} de ${data.vets.total}` },
    { label: 'Citas totales', value: data.totalAppointments },
    { label: 'Próximas citas', value: data.upcoming },
  ];

  return (
    <div>
      <h1 className="page-title mb-1">Reportes de mi clínica</h1>
      <p className="text-sm text-slate-500 mb-4">Actividad de tu veterinaria.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs text-slate-500">{t.label}</p>
            <p className="text-xl font-extrabold text-brand-dark mt-1">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-xl">
        <h2 className="font-bold text-slate-800 mb-4">Citas por estado</h2>
        {data.apptByStatus.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Aún no hay citas en tu clínica.</p>
        ) : (
          <div className="space-y-3">
            {data.apptByStatus.map((r) => (
              <div key={r.status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-slate-600">{r.status}</span>
                  <span className="font-semibold text-slate-700">{r.count}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(r.count / totalAppts) * 100}%`, backgroundColor: STATUS_COLORS[r.status] || '#64748b' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
