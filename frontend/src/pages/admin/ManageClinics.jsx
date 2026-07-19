import { useState, useEffect } from 'react';
import { getClinics, createClinic, getAccessLog } from '../../api/admin.js';
import Notification from '../../components/Notification.jsx';

const empty = { name: '', address: '', phone: '' };

// Gestión de clínicas (modelo multi-clínica) + auditoría de accesos
// a historiales clínicos ("break-glass").
export default function ManageClinics() {
  const [clinics, setClinics] = useState([]);
  const [log, setLog] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState('');

  const load = () => {
    getClinics().then(setClinics).catch(() => {});
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Clínicas</h1>
      <p className="text-sm text-slate-500 mb-4">
        Clínicas suscritas a la plataforma. Los veterinarios se asignan a su clínica
        desde la sección de Clientes y veterinarios.
      </p>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      {/* Crear clínica */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-4 my-4 grid sm:grid-cols-3 gap-3">
        <input name="name" placeholder="Nombre de la clínica" required className="border rounded-lg p-2" value={form.name} onChange={handleChange} />
        <input name="address" placeholder="Dirección" className="border rounded-lg p-2" value={form.address} onChange={handleChange} />
        <input name="phone" placeholder="Teléfono" className="border rounded-lg p-2" value={form.phone} onChange={handleChange} />
        <button className="bg-brand text-white rounded-full py-2 sm:col-span-3 font-semibold hover:bg-brand-dark transition">
          Registrar clínica
        </button>
      </form>

      {/* Listado */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {clinics.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-slate-800">🏥 {c.name}</h3>
              <span className="text-xs bg-brand-50 text-brand-dark rounded-full px-2 py-0.5 whitespace-nowrap">
                {c.vet_count} vet{c.vet_count !== 1 && 's'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{c.address || 'Sin dirección'}</p>
            {c.phone && <p className="text-sm text-slate-500">📞 {c.phone}</p>}
          </div>
        ))}
        {clinics.length === 0 && <p className="text-slate-500">Sin clínicas registradas.</p>}
      </div>

      {/* Auditoría de accesos a historiales */}
      <h2 className="font-bold text-slate-800 mb-1">Auditoría de acceso a historiales</h2>
      <p className="text-sm text-slate-500 mb-3">
        El historial clínico es portable entre clínicas: cualquier veterinario puede
        consultarlo en una emergencia, y cada consulta queda registrada aquí.
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
