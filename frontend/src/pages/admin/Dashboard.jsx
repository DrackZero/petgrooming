import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSubscription, getVetRequests } from '../../api/admin.js';
import { formatCOP } from '../../utils/format.js';

const cards = [
  { to: '/admin/clinics', label: 'Clínicas y suscripciones', icon: '🏥' },
  { to: '/admin/clients', label: 'Clientes y veterinarios', icon: '👥' },
];

// Panel del ADMINISTRADOR DE PLATAFORMA: enfocado en la suscripción.
// Los reportes operativos (citas, ventas) los ve cada gerente en su clínica.
export default function Dashboard() {
  const [sub, setSub] = useState(null);
  const [vetRequests, setVetRequests] = useState([]);

  useEffect(() => {
    getSubscription().then(setSub).catch(() => {});
    getVetRequests().then(setVetRequests).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Panel de la plataforma</h1>
      <p className="text-sm text-slate-500 mb-4">
        Administras las suscripciones de las clínicas. La operación de cada veterinaria la gestiona su gerente.
      </p>

      {vetRequests.length > 0 && (
        <Link to="/admin/clients" className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-4 hover:bg-amber-100 transition">
          <span className="text-2xl">🩺</span>
          <span className="text-sm font-medium">
            {vetRequests.length} solicitud{vetRequests.length !== 1 && 'es'} de veterinario sin clínica asignada — clic para revisar
          </span>
        </Link>
      )}

      {/* Métricas de suscripción */}
      {sub && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-brand text-white rounded-2xl p-4">
            <p className="text-xs text-brand-100">Ingreso mensual</p>
            <p className="text-2xl font-extrabold">{formatCOP(sub.monthlyRevenue)}</p>
          </div>
          <Stat label="Clínicas activas" value={sub.activas} />
          <Stat label="Pendientes" value={sub.pendientes} />
          <Stat label="Suspendidas" value={sub.suspendidas} />
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
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-brand-dark">{value}</p>
    </div>
  );
}
