import { useState, useEffect } from 'react';
import { getAllPets, getClientsForVet, createPet, addVaccine } from '../../api/pets.js';
import Notification from '../../components/Notification.jsx';

const emptyPet = { owner_id: '', name: '', species: '', breed: '', age: '', notes: '' };

// Panel del VETERINARIO: registrar mascotas de clientes y sus vacunas.
export default function VetPets() {
  const [pets, setPets] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyPet);
  const [vaccineFor, setVaccineFor] = useState(null); // mascota a la que se añade vacuna
  const [vaccine, setVaccine] = useState({ name: '', applied_date: '' });
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
                <td className="p-3 text-right">
                  <button onClick={() => setVaccineFor(p)} className="text-brand-dark hover:underline">
                    💉 Vacuna
                  </button>
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
    </div>
  );
}
