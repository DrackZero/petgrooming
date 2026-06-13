import { useState, useEffect } from 'react';
import { getStats } from '../../api/admin.js';

export default function Reports() {
  const [stats, setStats] = useState(null);

  useEffect(() => { getStats().then(setStats).catch(() => {}); }, []);

  if (!stats) return <p className="text-slate-500">Cargando reportes…</p>;

  const rows = [
    { label: 'Clientes registrados', value: stats.clients },
    { label: 'Citas totales', value: stats.appointments },
    { label: 'Pedidos totales', value: stats.orders },
    { label: 'Ingresos (pagados)', value: `$${Number(stats.revenue).toFixed(2)}` },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Reportes</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {rows.map((r) => (
          <div key={r.label} className="bg-white border border-slate-200 rounded-lg p-6">
            <p className="text-sm text-slate-500">{r.label}</p>
            <p className="text-3xl font-bold text-brand-dark mt-1">{r.value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-4">
        * Amplía este módulo con gráficas (Recharts/Chart.js) y filtros por fecha según necesites.
      </p>
    </div>
  );
}
