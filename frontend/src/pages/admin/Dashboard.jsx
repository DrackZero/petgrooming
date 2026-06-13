import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../../api/admin.js';

const cards = [
  { to: '/admin/products', label: 'Productos', icon: '📦' },
  { to: '/admin/courses', label: 'Cursos', icon: '🎓' },
  { to: '/admin/slots', label: 'Horarios', icon: '🕐' },
  { to: '/admin/appointments', label: 'Citas', icon: '📅' },
  { to: '/admin/orders', label: 'Pedidos', icon: '🛒' },
  { to: '/admin/clients', label: 'Clientes', icon: '👥' },
  { to: '/admin/reports', label: 'Reportes', icon: '📊' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => { getStats().then(setStats).catch(() => {}); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Panel de administración</h1>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat label="Clientes" value={stats.clients} />
          <Stat label="Citas" value={stats.appointments} />
          <Stat label="Pedidos" value={stats.orders} />
          <Stat label="Ingresos" value={`$${Number(stats.revenue).toFixed(2)}`} />
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="bg-white border border-slate-200 rounded-lg p-6 text-center hover:shadow-md transition">
            <div className="text-3xl">{c.icon}</div>
            <div className="mt-2 font-medium">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-brand-dark">{value}</p>
    </div>
  );
}
