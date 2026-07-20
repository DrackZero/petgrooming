import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyClinic, paySubscription, downgradePlan } from '../../api/gerente.js';
import { useAuth } from '../../hooks/useAuth.js';
import { formatCOP } from '../../utils/format.js';
import { wompiCheckoutUrl } from '../../utils/wompi.js';
import Notification from '../../components/Notification.jsx';

// Precios de los planes (mismos que en la plataforma).
const PLANS = [
  { value: 'basico', label: 'Básico', price: 60000, features: 'Citas e historial clínico' },
  { value: 'pro', label: 'Pro', price: 150000, features: 'Todo lo del Básico + tienda y cursos' },
];

const statusStyle = {
  activa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  suspendida: 'bg-red-50 text-red-600 border-red-200',
};

const statusMsg = {
  activa: 'Tu veterinaria está activa. Ya puedes operar con normalidad.',
  pendiente: 'Tu veterinaria está pendiente de activación. Cuando confirmemos tu suscripción, tú y tus veterinarios podrán operar.',
  suspendida: 'Tu veterinaria está suspendida. Regulariza tu suscripción con la plataforma para reactivarla.',
};

// Panel del GERENTE: estado de su veterinaria + accesos a su gestión.
export default function GerenteHome() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState('');

  useEffect(() => {
    getMyClinic().then(setClinic).catch(() => setError('No se pudo cargar tu veterinaria'));
  }, []);

  // Pagar la suscripción por Wompi; al aprobarse, el webhook activa/actualiza la clínica.
  const pay = async (plan) => {
    setPaying(plan);
    try {
      const res = await paySubscription(plan);
      if (res.payment?.provider === 'wompi') {
        window.location.href = wompiCheckoutUrl(res.payment);
        return;
      }
      setError('El pago está en modo simulado (Wompi no configurado). El administrador puede activar tu clínica.');
    } catch (err) {
      setError(err.response?.data?.message || 'No fue posible iniciar el pago');
    } finally {
      setPaying('');
    }
  };

  // Bajar a Básico (inmediato, sin pago). Apaga la tienda.
  const downgrade = async () => {
    if (!confirm('¿Cambiar al plan Básico? Perderás la tienda y los cursos.')) return;
    try {
      const r = await downgradePlan();
      setClinic({ ...clinic, plan: r.plan, store_enabled: r.store_enabled });
    } catch (err) {
      setError(err.response?.data?.message || 'No fue posible cambiar el plan');
    }
  };

  if (!clinic) return error ? <p className="text-red-600">{error}</p> : <p className="text-slate-500">Cargando…</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <p className="text-sm text-slate-500">Hola, {user?.name?.split(' ')[0]}</p>
      <h1 className="page-title mb-4">Mi veterinaria</h1>
      <Notification type="error" message={error} onClose={() => setError('')} />

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">🏥 {clinic.name}</h2>
            {clinic.address && <p className="text-sm text-slate-500">{clinic.address}</p>}
            {clinic.phone && <p className="text-sm text-slate-500">📞 {clinic.phone}</p>}
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${statusStyle[clinic.status] || ''}`}>
            {clinic.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500">Plan</p>
            <p className="text-lg font-extrabold text-brand-dark capitalize">{clinic.plan}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500">Veterinarios</p>
            <p className="text-lg font-extrabold text-brand-dark">{clinic.vet_count}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500">Solicitudes</p>
            <p className="text-lg font-extrabold text-brand-dark">{clinic.pending_count}</p>
          </div>
        </div>

        <div className={`mt-5 rounded-xl border p-3 text-sm ${statusStyle[clinic.status] || ''}`}>
          {statusMsg[clinic.status]}
        </div>
      </div>

      {/* Suscripción: activar (si no está activa) o cambiar de plan (si lo está) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-4">
        {clinic.status !== 'activa' ? (
          <>
            <h2 className="font-bold text-slate-800 mb-1">Activa tu veterinaria</h2>
            <p className="text-sm text-slate-500 mb-4">Elige un plan y paga tu suscripción mensual para empezar a operar.</p>
          </>
        ) : (
          <>
            <h2 className="font-bold text-slate-800 mb-1">Tu plan</h2>
            <p className="text-sm text-slate-500 mb-4">
              Estás en el plan <strong className="capitalize">{clinic.plan}</strong>. Puedes cambiarlo cuando quieras.
            </p>
          </>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {PLANS.map((p) => {
            const current = clinic.status === 'activa' && clinic.plan === p.value;
            const isDowngrade = clinic.status === 'activa' && clinic.plan === 'pro' && p.value === 'basico';
            return (
              <div key={p.value} className={`border rounded-xl p-4 flex flex-col ${current ? 'border-brand bg-brand-50' : 'border-slate-200'}`}>
                <div className="flex items-baseline justify-between">
                  <p className="font-bold text-slate-800">{p.label}</p>
                  <p className="text-lg font-extrabold text-brand-dark">{formatCOP(p.price)}<span className="text-xs font-normal text-slate-400">/mes</span></p>
                </div>
                <p className="text-sm text-slate-500 mt-1 flex-1">{p.features}</p>

                {current ? (
                  <span className="mt-3 text-center text-sm font-semibold text-brand-dark py-2">Plan actual ✓</span>
                ) : isDowngrade ? (
                  <button onClick={downgrade} className="mt-3 rounded-full py-2 text-sm font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 transition">
                    Cambiar a Básico
                  </button>
                ) : (
                  <button
                    onClick={() => pay(p.value)}
                    disabled={!!paying}
                    className="mt-3 bg-brand text-white rounded-full py-2 text-sm font-semibold hover:bg-brand-dark disabled:bg-slate-300 transition"
                  >
                    {paying === p.value ? 'Redirigiendo…' : clinic.status === 'activa' ? `Mejorar a ${p.label}` : `Pagar plan ${p.label}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Accesos a la gestión */}
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <Link to="/gerente/vets" className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition flex items-center gap-3">
          <span className="text-3xl">🩺</span>
          <div>
            <p className="font-bold text-slate-800">Veterinarios</p>
            <p className="text-sm text-slate-500">Aprueba y gestiona a tu equipo</p>
          </div>
          {clinic.pending_count > 0 && (
            <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
              {clinic.pending_count} nueva{clinic.pending_count !== 1 && 's'}
            </span>
          )}
        </Link>
        <Link to="/gerente/reports" className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition flex items-center gap-3">
          <span className="text-3xl">📊</span>
          <div>
            <p className="font-bold text-slate-800">Reportes</p>
            <p className="text-sm text-slate-500">Citas y actividad de tu clínica</p>
          </div>
        </Link>
        <Link to="/gerente/store" className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition flex items-center gap-3 sm:col-span-2">
          <span className="text-3xl">🛍️</span>
          <div>
            <p className="font-bold text-slate-800">Tienda y cursos</p>
            <p className="text-sm text-slate-500">
              {clinic.plan === 'pro' ? 'Gestiona tu catálogo en línea' : 'Disponible al mejorar al plan Pro'}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
