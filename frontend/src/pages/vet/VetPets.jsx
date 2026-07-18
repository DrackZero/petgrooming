import { useState, useEffect } from 'react';
import { getAllPets, getClientsForVet, createPet, addVaccine, deleteVaccine, getPetHistory } from '../../api/pets.js';
import Notification from '../../components/Notification.jsx';
import Tooltip from '../../components/Tooltip.jsx';

const emptyPet = { owner_id: '', name: '', species: '', breed: '', age: '', notes: '' };

// Panel del VETERINARIO: registrar mascotas de clientes y sus vacunas.
export default function VetPets() {
  const [pets, setPets] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyPet);
  const [vaccineFor, setVaccineFor] = useState(null); // mascota a la que se añade vacuna
  const [vaccine, setVaccine] = useState({ name: '', applied_date: '' });
  const [historyFor, setHistoryFor] = useState(null); // mascota cuyo historial se muestra
  const [history, setHistory] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => getAllPets().then(setPets).catch(() => {});

  useEffect(() => {
    load();
    getClientsForVet().then(setClients).catch(() => {});
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPet({ ...form, age: form.age ? Number(form.age) : null });
      setForm(emptyPet);
      setMsg('Mascota registrada ✓');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error al registrar la mascota');
    }
  };

  const showHistory = async (pet) => {
    if (historyFor?.id === pet.id) { setHistoryFor(null); setHistory(null); return; }
    setHistoryFor(pet);
    setHistory(await getPetHistory(pet.id).catch(() => null));
  };

  const removeVaccine = async (vaccineId) => {
    if (!confirm('¿Eliminar esta vacuna del historial?')) return;
    await deleteVaccine(historyFor.id, vaccineId).catch(() => {});
    setHistory(await getPetHistory(historyFor.id).catch(() => null));
  };

  const handleVaccine = async (e) => {
    e.preventDefault();
    try {
      await addVaccine(vaccineFor.id, {
        name: vaccine.name,
        applied_date: vaccine.applied_date || undefined,
      });
      setMsg(`Vacuna "${vaccine.name}" registrada a ${vaccineFor.name} ✓`);
      setVaccineFor(null);
      setVaccine({ name: '', applied_date: '' });
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error al registrar la vacuna');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Gestión de mascotas</h1>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      {/* Registrar mascota para un cliente */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 my-4 grid sm:grid-cols-2 gap-3">
        <select name="owner_id" value={form.owner_id} onChange={handleChange} required className="border rounded p-2 sm:col-span-2">
          <option value="">Selecciona el cliente dueño…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
          ))}
        </select>
        <input name="name" placeholder="Nombre de la mascota" required className="border rounded p-2" value={form.name} onChange={handleChange} />
        <input name="species" placeholder="Especie (perro/gato)" className="border rounded p-2" value={form.species} onChange={handleChange} />
        <input name="breed" placeholder="Raza" className="border rounded p-2" value={form.breed} onChange={handleChange} />
        <input name="age" type="number" min="0" placeholder="Edad (años)" className="border rounded p-2" value={form.age} onChange={handleChange} />
        <textarea name="notes" placeholder="Notas clínicas" className="border rounded p-2 sm:col-span-2" value={form.notes} onChange={handleChange} />
        <button className="bg-brand text-white rounded py-2 sm:col-span-2 hover:bg-brand-dark">
          Registrar mascota
        </button>
      </form>

      {/* Listado de mascotas */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Mascota</th><th className="p-3">Especie / Raza</th>
              <th className="p-3">Edad</th><th className="p-3">Dueño</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {pets.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.species || '—'}{p.breed ? ` / ${p.breed}` : ''}</td>
                <td className="p-3">{p.age != null ? `${p.age} años` : '—'}</td>
                <td className="p-3">{p.owner_name}</td>
                <td className="p-3 text-right space-x-3 whitespace-nowrap">
                  <Tooltip tip="Registrar una vacuna aplicada a esta mascota" side="top">
                    <button onClick={() => setVaccineFor(p)} className="text-brand-dark hover:underline">
                      💉 Vacuna
                    </button>
                  </Tooltip>
                  <Tooltip tip="Ver el historial clínico completo (vacunas y consultas)" side="top">
                    <button onClick={() => showHistory(p)} className="text-brand-dark hover:underline">
                      📋 Historial
                    </button>
                  </Tooltip>
                </td>
              </tr>
            ))}
            {pets.length === 0 && (
              <tr><td colSpan="5" className="p-3 text-slate-500">No hay mascotas registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Formulario de vacuna */}
      {vaccineFor && (
        <form onSubmit={handleVaccine} className="bg-white border border-brand rounded-lg p-4 mt-4 grid sm:grid-cols-3 gap-3">
          <p className="sm:col-span-3 font-medium">Registrar vacuna para <span className="text-brand-dark">{vaccineFor.name}</span></p>
          <input placeholder="Nombre de la vacuna" required className="border rounded p-2" value={vaccine.name} onChange={(e) => setVaccine({ ...vaccine, name: e.target.value })} />
          <input type="date" className="border rounded p-2" value={vaccine.applied_date} onChange={(e) => setVaccine({ ...vaccine, applied_date: e.target.value })} />
          <div className="flex gap-2">
            <button className="flex-1 bg-brand text-white rounded py-2 hover:bg-brand-dark">Guardar</button>
            <button type="button" onClick={() => setVaccineFor(null)} className="px-3 rounded bg-slate-100 hover:bg-slate-200">✕</button>
          </div>
        </form>
      )}

      {/* Historial clínico de la mascota seleccionada */}
      {historyFor && (
        <div className="bg-white border border-brand-200 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">
              📋 Historial clínico — <span className="text-brand-dark">{historyFor.name}</span>
              <span className="text-slate-400 font-normal text-sm"> ({historyFor.owner_name})</span>
            </h2>
            <button onClick={() => { setHistoryFor(null); setHistory(null); }} className="px-2 rounded bg-slate-100 hover:bg-slate-200">✕</button>
          </div>

          {historyFor.notes && (
            <p className="text-sm bg-amber-50 text-amber-800 rounded-lg px-3 py-2 mb-3">
              ⚠️ Notas clínicas: {historyFor.notes}
            </p>
          )}

          {!history ? (
            <p className="text-slate-400 text-sm">Cargando…</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">💉 Vacunas ({history.vaccines.length})</h4>
                {history.vaccines.length ? (
                  <ul className="space-y-1.5">
                    {history.vaccines.map((v) => (
                      <li key={v.id} className="flex items-start justify-between gap-2 text-slate-600">
                        <span>
                          {v.name} — {new Date(v.applied_date).toLocaleDateString('es-ES')}
                          {v.notes && <span className="block text-xs text-slate-400">{v.notes}</span>}
                        </span>
                        <button onClick={() => removeVaccine(v.id)} className="text-red-500 text-xs hover:underline shrink-0">
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400">Sin vacunas registradas.</p>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-2">📅 Consultas ({history.appointments.length})</h4>
                {history.appointments.length ? (
                  <ul className="space-y-2">
                    {history.appointments.map((a) => (
                      <li key={a.id} className="text-slate-600">
                        {new Date(a.starts_at).toLocaleString('es-ES')} — <span className="capitalize">{a.status}</span>
                        {a.notes && (
                          <p className="mt-0.5 text-xs bg-brand-50 rounded-lg px-2 py-1">📋 {a.notes}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400">Sin consultas registradas.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
