import { useState, useEffect } from 'react';
import { getMyClinic } from '../../api/gerente.js';
import { useAuth } from '../../hooks/useAuth.js';

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

// Panel del GERENTE (Fase A): estado de su veterinaria y su suscripción.
export default function GerenteHome() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyClinic().then(setClinic).catch(() => setError('No se pudo cargar tu veterinaria'));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!clinic) return <p className="text-slate-500">Cargando…</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-sm text-slate-500">Hola, {user?.name?.split(' ')[0]}</p>
      <h1 className="page-title mb-4">Mi veterinaria</h1>

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

        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500">Plan contratado</p>
            <p className="text-lg font-extrabold text-brand-dark capitalize">{clinic.plan}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500">Veterinarios</p>
            <p className="text-lg font-extrabold text-brand-dark">{clinic.vet_count}</p>
          </div>
        </div>

        <div className={`mt-5 rounded-xl border p-3 text-sm ${statusStyle[clinic.status] || ''}`}>
          {statusMsg[clinic.status]}
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Próximamente podrás gestionar a tus veterinarios y ver los reportes de tu clínica desde aquí.
      </p>
    </div>
  );
}
