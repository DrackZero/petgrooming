import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getVetRequests } from '../../api/admin.js';
import { formatCOP } from '../../utils/format.js';

const cards = [
  { to: '/admin/products', label: 'Productos y stock', icon: '📦' },
  { to: '/admin/courses', label: 'Cursos', icon: '🎓' },
  { to: '/admin/clients', label: 'Clientes y roles', icon: '👥' },
  { to: '/admin/orders', label: 'Alertas de pedidos', icon: '🛒' },
  { to: '/admin/reports', label: 'Reportes', icon: '📊' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [vetRequests, setVetRequests] = useState([]);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    getVetRequests().then(setVetRequests).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Panel de administración</h1>
      <p className="text-sm text-slate-500 mb-4">
        La gestión de mascotas, horarios y citas corresponde al veterinario.
      </p>

      {/* Notificación: solicitudes de rol veterinario pendientes */}
      {vetRequests.length > 0 && (
        <Link
          to="/admin/clients"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-4 hover:bg-amber-100 transition"
        >
          <span className="text-2xl">🩺</span>
          <span className="text-sm font-medium">
            {vetRequests.length} solicitud{vetRequests.length !== 1 && 'es'} pendiente{vetRequests.length !== 1 && 's'} para ser veterinario — clic para revisar
          </span>
        </Link>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat label="Clientes" value={stats.clients} />
          <Stat label="Citas" value={stats.appointments} />
          <Stat label="Pedidos" value={stats.orders} />
          <Stat label="Ingresos" value={formatCOP(stats.revenue)} />
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
