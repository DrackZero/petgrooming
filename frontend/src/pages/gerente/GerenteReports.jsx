import { useState, useEffect } from 'react';
import { getMyReports } from '../../api/gerente.js';
import { STATUS_COLORS } from '../../components/MonthCalendar.jsx';
import BarList from '../../components/BarList.jsx';
import { Skeleton } from '../../components/Skeleton.jsx';
import EmptyState from '../../components/EmptyState.jsx';

// Panel del GERENTE: reportes de actividad de su clínica.
export default function GerenteReports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyReports().then(setData).catch(() => setError('No se pudieron cargar los reportes'));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;

  // Esqueletos mientras llegan los datos: no salta el diseño.
  if (!data) {
    return (
      <div>
        <h1 className="page-title mb-1">Reportes de mi clínica</h1>
        <p className="text-sm text-slate-500 mb-4">Actividad de tu veterinaria.</p>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <Skeleton className="h-52 rounded-2xl max-w-xl" />
      </div>
    );
  }

  const tiles = [
    { label: 'Veterinarios activos', value: `${data.vets.activos} de ${data.vets.total}`, icon: '🩺' },
    { label: 'Citas totales', value: data.totalAppointments, icon: '📋' },
    { label: 'Próximas citas', value: data.upcoming, icon: '📅' },
  ];

  return (
    <div>
      <h1 className="page-title mb-1">Reportes de mi clínica</h1>
      <p className="text-sm text-slate-500 mb-4">Actividad de tu veterinaria.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition duration-200"
          >
            <div className="flex items-start justify-between">
              <p className="text-xs text-slate-500">{t.label}</p>
              <span className="text-lg leading-none">{t.icon}</span>
            </div>
            <p className="text-2xl font-extrabold text-brand-dark mt-1">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-xl">
        <h2 className="font-bold text-slate-800">Citas por estado</h2>
        <p className="text-sm text-slate-500 mb-4">Distribución de todas las citas de tu clínica.</p>
        {data.apptByStatus.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Aún no hay citas"
            description="Cuando tus clientes agenden con tus veterinarios, aquí verás cómo se reparten por estado."
            className="border-0 py-6"
          />
        ) : (
          <BarList
            data={data.apptByStatus.map((r) => ({
              label: r.status,
              value: r.count,
              color: STATUS_COLORS[r.status] || '#64748b',
            }))}
          />
        )}
      </div>
    </div>
  );
}
