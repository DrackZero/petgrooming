import { useState, useEffect } from 'react';
import {
  getClinics,
  createClinic,
  setClinicStatus,
  setClinicPlan,
  expireClinicNow,
  setClinicExpiry,
  getSubscription,
  getAccessLog,
} from '../../api/admin.js';
import { formatCOP } from '../../utils/format.js';
import Notification from '../../components/Notification.jsx';
import TrendBars from '../../components/TrendBars.jsx';
import BarList from '../../components/BarList.jsx';
import { SkeletonRows } from '../../components/Skeleton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useConfirm } from '../../hooks/useConfirm.js';

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Monto abreviado para las etiquetas de la gráfica ($ 1,2 M).
const compactCOP = (v) => {
  if (v >= 1_000_000) return `$ ${(v / 1_000_000).toFixed(1).replace('.', ',')} M`;
  if (v >= 1_000) return `$ ${Math.round(v / 1000)} K`;
  return `$ ${v}`;
};

const empty = { name: '', address: '', phone: '' };

// Días que faltan para el vencimiento (negativo si ya venció).
const daysLeft = (expiresAt) => Math.ceil((new Date(expiresAt) - new Date()) / 86400000);

const statusStyle = {
  activa: 'bg-emerald-50 text-emerald-700',
  pendiente: 'bg-amber-50 text-amber-700',
  suspendida: 'bg-red-50 text-red-600',
};

// Administración de plataforma: suscripciones de las clínicas + auditoría.
export default function ManageClinics() {
  const confirmar = useConfirm();
  const [clinics, setClinics] = useState([]);
  const [sub, setSub] = useState(null);
  const [log, setLog] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState('');

  const load = () => {
    getClinics().then(setClinics).catch(() => {});
    getSubscription().then(setSub).catch(() => {});
    getAccessLog().then(setLog).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createClinic(form);
      setForm(empty);
      setMsg('Clínica creada ✓');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error al crear la clínica');
    }
  };

  const changeStatus = async (c, status) => {
    await setClinicStatus(c.id, status).catch(() => {});
    setMsg(`"${c.name}" → ${status}`);
    load();
  };

  const changePlan = async (c, plan) => {
    await setClinicPlan(c.id, plan).catch(() => {});
    load();
  };

  // Corta el servicio al instante (útil para demostrar el ciclo sin esperar 30 días).
  const expireNow = async (c) => {
    const ok = await confirmar({
      title: `Vencer la suscripción de ${c.name}`,
      message: 'La clínica quedará suspendida al instante: sus veterinarios no podrán atender, sus horarios dejarán de ofrecerse y su tienda se ocultará. Puede reactivarla renovando su plan.',
      confirmLabel: 'Vencer ahora',
      danger: true,
    });
    if (!ok) return;
    await expireClinicNow(c.id).catch(() => {});
    setMsg(`Suscripción de "${c.name}" vencida — clínica suspendida`);
    load();
  };

  // Extiende la vigencia N días desde hoy (regalar meses, corregir fechas).
  const extend = async (c, days) => {
    const date = new Date(Date.now() + days * 86400000).toISOString();
    await setClinicExpiry(c.id, date).catch(() => {});
    setMsg(`"${c.name}" vigente por ${days} días más`);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Clínicas y suscripciones</h1>
      <p className="text-sm text-slate-500 mb-4">
        Activa o suspende la suscripción de cada veterinaria y define su plan.
      </p>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      {/* Resumen de ingresos por suscripción */}
      {sub && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="bg-brand text-white rounded-2xl p-4">
              <p className="text-xs text-brand-100">Recaudado este mes</p>
              <p className="text-2xl font-extrabold">{formatCOP(sub.collectedThisMonth || 0)}</p>
              <p className="text-xs text-brand-100 mt-0.5">
                {sub.paymentsThisMonth || 0} pago{sub.paymentsThisMonth !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-500">Proyectado mensual</p>
              <p className="text-2xl font-extrabold text-slate-400">{formatCOP(sub.monthlyRevenue)}</p>
              <p className="text-xs text-slate-400 mt-0.5">si todas renuevan</p>
            </div>
            <Stat label="Activas" value={sub.activas} />
            <Stat label="Pendientes" value={sub.pendientes} />
            <Stat label="Suspendidas" value={sub.suspendidas} />
          </div>

          {/* Gráficas: recaudo mensual y distribución de clínicas */}
          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 mb-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="font-bold text-slate-800">Recaudo por suscripciones</h2>
              <p className="text-sm text-slate-500 mb-4">Últimos 6 meses, en pesos colombianos.</p>
              <TrendBars
                data={(sub.revenueSeries || []).map((r) => {
                  const [y, m] = r.periodo.split('-');
                  return { label: `${MES_CORTO[Number(m) - 1]} ${y.slice(2)}`, value: r.total };
                })}
                formatValue={compactCOP}
                emptyText="Aún no hay pagos de suscripción registrados."
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="font-bold text-slate-800">Clínicas</h2>
              <p className="text-sm text-slate-500 mb-4">Por estado de su suscripción.</p>
              <BarList
                data={[
                  { label: 'activas', value: sub.activas, color: '#059669' },
                  { label: 'pendientes', value: sub.pendientes, color: '#d97706' },
                  { label: 'suspendidas', value: sub.suspendidas, color: '#dc2626' },
                ]}
                emptyText="Sin clínicas registradas."
              />
              <div className="border-t border-slate-100 mt-4 pt-4">
                <p className="text-xs text-slate-400 uppercase mb-2">Por plan</p>
                <BarList
                  data={[
                    { label: 'básico', value: sub.byPlan?.basico || 0, color: '#93c5fd' },
                    { label: 'pro', value: sub.byPlan?.pro || 0, color: '#2563eb' },
                  ]}
                  emptyText="Sin clínicas activas."
                />
              </div>
            </div>
          </div>

          {sub.upcomingRenewals?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
              <p className="font-bold text-amber-800 mb-2">
                Vencen en los próximos 7 días ({sub.upcomingRenewals.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {sub.upcomingRenewals.map((c) => (
                  <span key={c.id} className="bg-white rounded-full px-3 py-1 text-sm">
                    🏥 {c.name} — {new Date(c.subscription_expires_at).toLocaleDateString('es-CO')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Alta manual de clínica */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-4 my-4 grid sm:grid-cols-3 gap-3">
        <input name="name" placeholder="Nombre de la clínica" required className="border rounded-lg p-2" value={form.name} onChange={handleChange} />
        <input name="address" placeholder="Dirección" className="border rounded-lg p-2" value={form.address} onChange={handleChange} />
        <input name="phone" placeholder="Teléfono" className="border rounded-lg p-2" value={form.phone} onChange={handleChange} />
        <button className="bg-brand text-white rounded-full py-2 sm:col-span-3 font-semibold hover:bg-brand-dark transition">
          Registrar clínica manualmente (queda activa)
        </button>
      </form>

      {/* Listado con controles de suscripción */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full min-w-[760px] bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Clínica</th><th className="p-3">Gerente</th>
              <th className="p-3">Vets</th><th className="p-3">Plan</th>
              <th className="p-3">Estado</th><th className="p-3">Vigencia</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clinics.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">
                  <p className="font-medium">🏥 {c.name}</p>
                  <p className="text-xs text-slate-400">{c.address || 'Sin dirección'}</p>
                </td>
                <td className="p-3">{c.manager_name || '—'}</td>
                <td className="p-3">{c.vet_count}</td>
                <td className="p-3">
                  <select value={c.plan} onChange={(e) => changePlan(c, e.target.value)} className="border rounded-lg p-1.5 capitalize">
                    <option value="basico">Básico</option>
                    <option value="pro">Pro</option>
                  </select>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${statusStyle[c.status] || 'bg-slate-100'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">
                  {c.subscription_expires_at ? (
                    <>
                      <p className={daysLeft(c.subscription_expires_at) <= 0 ? 'text-red-600 font-semibold' : ''}>
                        {new Date(c.subscription_expires_at).toLocaleDateString('es-CO')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {daysLeft(c.subscription_expires_at) > 0
                          ? `${daysLeft(c.subscription_expires_at)} días`
                          : 'vencida'}
                      </p>
                    </>
                  ) : (
                    <span className="text-slate-400">sin pagos</span>
                  )}
                </td>
                <td className="p-3 space-x-2 whitespace-nowrap">
                  {c.status !== 'activa' && (
                    <button onClick={() => changeStatus(c, 'activa')} className="text-emerald-600 hover:underline">Activar</button>
                  )}
                  {c.status === 'activa' && (
                    <>
                      <button onClick={() => expireNow(c)} className="text-red-600 hover:underline" title="Vence la suscripción al instante">
                        Vencer ahora
                      </button>
                      <button onClick={() => extend(c, 30)} className="text-brand-dark hover:underline" title="Extiende la vigencia 30 días desde hoy">
                        +30 días
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {clinics.length === 0 && (
              <tr><td colSpan="7" className="p-3 text-slate-500">Sin clínicas registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Auditoría de acceso a historiales */}
      <h2 className="font-bold text-slate-800 mb-1">Auditoría de acceso a historiales</h2>
      <p className="text-sm text-slate-500 mb-3">
        Cada consulta de un historial clínico por un veterinario queda registrada aquí.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Fecha</th><th className="p-3">Veterinario</th>
              <th className="p-3">Clínica</th><th className="p-3">Mascota</th><th className="p-3">Dueño</th>
            </tr>
          </thead>
          <tbody>
            {log.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 whitespace-nowrap">{new Date(l.accessed_at).toLocaleString('es-ES')}</td>
                <td className="p-3">🩺 {l.vet_name}</td>
                <td className="p-3">{l.clinic_name || '—'}</td>
                <td className="p-3">{l.pet_name}</td>
                <td className="p-3">{l.owner_name}</td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr><td colSpan="5" className="p-3 text-slate-500">Sin accesos registrados todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-extrabold text-brand-dark">{value}</p>
    </div>
  );
}
