import { useState, useEffect } from 'react';
import { getPets, getPetHistory, createMyPet, requestPet, getMyPetRequests } from '../api/pets.js';
import Notification from '../components/Notification.jsx';
import SpeciesPicker from '../components/SpeciesPicker.jsx';

const emptyForm = { name: '', species: '', breed: '', age: '', notes: '' };

const requestStatusStyle = {
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  aprobada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rechazada: 'bg-red-50 text-red-600 border-red-200',
};

// Vista del CLIENTE: registra su primera mascota; para más de una,
// debe enviar una solicitud que aprueba un veterinario.
export default function Pets() {
  const [pets, setPets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [openId, setOpenId] = useState(null);      // mascota expandida
  const [history, setHistory] = useState({});      // { petId: {vaccines, appointments} }
  const [form, setForm] = useState(emptyForm);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    getPets().then(setPets).catch(() => {});
    getMyPetRequests().then(setRequests).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const toggleHistory = async (petId) => {
    if (openId === petId) return setOpenId(null);
    setOpenId(petId);
    if (!history[petId]) {
      const data = await getPetHistory(petId).catch(() => null);
      if (data) setHistory((prev) => ({ ...prev, [petId]: data }));
    }
  };

  const submitFirstPet = async (e) => {
    e.preventDefault();
    try {
      await createMyPet({ ...form, age: form.age ? Number(form.age) : null });
      setForm(emptyForm);
      setMsg('¡Mascota registrada! ✓');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error al registrar la mascota');
    }
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    try {
      await requestPet({ ...form, age: form.age ? Number(form.age) : null });
      setForm(emptyForm);
      setShowRequestForm(false);
      setMsg('Solicitud enviada. Un veterinario la revisará ✓');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error al enviar la solicitud');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Mis mascotas</h1>
      <p className="text-sm text-slate-500 mb-4">
        {pets.length === 0
          ? 'Registra tu primera mascota. Para más de una, un veterinario debe aprobar la solicitud.'
          : 'El veterinario actualiza y amplía el historial en la clínica.'}
      </p>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      {/* Registrar la primera mascota (self-service) */}
      {pets.length === 0 && (
        <form onSubmit={submitFirstPet} className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 grid sm:grid-cols-2 gap-3">
          <input placeholder="Nombre de tu mascota" required className="border rounded p-2 sm:col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Raza" className="border rounded p-2" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          <input type="number" min="0" placeholder="Edad (años)" className="border rounded p-2" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-slate-600 mb-1">Especie</p>
            <SpeciesPicker value={form.species} onChange={(v) => setForm({ ...form, species: v })} />
          </div>
          <textarea placeholder="Notas (alergias, condiciones, etc.)" className="border rounded p-2 sm:col-span-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="bg-brand text-white rounded-full py-2 sm:col-span-2 font-semibold hover:bg-brand-dark">Registrar mi mascota</button>
        </form>
      )}

      {/* Solicitar mascota adicional */}
      {pets.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
          {!showRequestForm ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">¿Tienes otra mascota?</p>
                <p className="text-sm text-slate-500">Solo puedes registrar una mascota por tu cuenta. Solicita la siguiente y un veterinario la aprobará.</p>
              </div>
              <button onClick={() => setShowRequestForm(true)} className="shrink-0 bg-brand text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-brand-dark">
                Solicitar mascota adicional
              </button>
            </div>
          ) : (
            <form onSubmit={submitRequest} className="grid sm:grid-cols-2 gap-3">
              <p className="sm:col-span-2 font-semibold text-slate-800">Nueva solicitud</p>
              <input placeholder="Nombre de la mascota" required className="border rounded p-2 sm:col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Raza" className="border rounded p-2" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
              <input type="number" min="0" placeholder="Edad (años)" className="border rounded p-2" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-slate-600 mb-1">Especie</p>
                <SpeciesPicker value={form.species} onChange={(v) => setForm({ ...form, species: v })} />
              </div>
              <textarea placeholder="Notas (alergias, condiciones, etc.)" className="border rounded p-2 sm:col-span-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="flex gap-2 sm:col-span-2">
                <button className="flex-1 bg-brand text-white rounded-full py-2 font-semibold hover:bg-brand-dark">Enviar solicitud</button>
                <button type="button" onClick={() => { setShowRequestForm(false); setForm(emptyForm); }} className="px-4 rounded-full bg-slate-100 hover:bg-slate-200">Cancelar</button>
              </div>
            </form>
          )}

          {requests.length > 0 && (
            <div className="mt-4 space-y-2">
              {requests.map((r) => (
                <div key={r.id} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${requestStatusStyle[r.status]}`}>
                  <span>{r.name}{r.species ? ` · ${r.species}` : ''}</span>
                  <span className="font-semibold capitalize">{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {pets.map((p) => (
          <div key={p.id} className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="p-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <p className="text-sm text-slate-500">
                  {p.species || 'mascota'}
                  {p.breed ? ` · ${p.breed}` : ''}
                  {p.age != null ? ` · ${p.age} años` : ''}
                </p>
                {p.notes && <p className="mt-1 text-sm text-slate-600">{p.notes}</p>}
              </div>
              <span className="text-2xl">{p.species?.toLowerCase() === 'gato' ? '🐱' : '🐶'}</span>
            </div>

            <button
              onClick={() => toggleHistory(p.id)}
              className="w-full text-left px-4 py-2 text-sm text-brand-dark border-t border-slate-100 hover:bg-slate-50"
            >
              {openId === p.id ? '▲ Ocultar historial' : '▼ Ver historial (vacunas y citas)'}
            </button>

            {openId === p.id && (
              <div className="px-4 pb-4 grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-1">💉 Vacunas</h4>
                  {history[p.id]?.vaccines?.length ? (
                    <ul className="space-y-1">
                      {history[p.id].vaccines.map((v) => (
                        <li key={v.id} className="text-slate-600">
                          {v.name} — {new Date(v.applied_date).toLocaleDateString('es-ES')}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400">Sin vacunas registradas.</p>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-1">📅 Citas</h4>
                  {history[p.id]?.appointments?.length ? (
                    <ul className="space-y-2">
                      {history[p.id].appointments.map((a) => (
                        <li key={a.id} className="text-slate-600">
                          {new Date(a.starts_at).toLocaleString('es-ES')} —{' '}
                          <span className="capitalize">{a.status}</span>
                          {a.notes && (
                            <p className="mt-0.5 text-xs bg-brand-50 text-slate-600 rounded-lg px-2 py-1">
                              📋 {a.notes}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400">Sin citas registradas.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

      </div>
    </div>
  );
}
