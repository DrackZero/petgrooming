import { useState, useEffect } from 'react';
import { getPets, createPet, deletePet } from '../api/pets.js';
import PetCard from '../components/PetCard.jsx';
import Notification from '../components/Notification.jsx';

const empty = { name: '', species: '', breed: '', size: '', notes: '' };

export default function Pets() {
  const [pets, setPets] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState('');

  const load = () => getPets().then(setPets).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createPet(form);
    setForm(empty);
    setMsg('Mascota añadida');
    load();
  };

  const handleDelete = async (pet) => {
    if (!confirm(`¿Eliminar a ${pet.name}?`)) return;
    await deletePet(pet.id);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Mis mascotas</h1>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 my-4 grid sm:grid-cols-2 gap-3">
        <input name="name" placeholder="Nombre" required className="border rounded p-2" value={form.name} onChange={handleChange} />
        <input name="species" placeholder="Especie (perro/gato)" required className="border rounded p-2" value={form.species} onChange={handleChange} />
        <input name="breed" placeholder="Raza" className="border rounded p-2" value={form.breed} onChange={handleChange} />
        <input name="size" placeholder="Tamaño" className="border rounded p-2" value={form.size} onChange={handleChange} />
        <textarea name="notes" placeholder="Notas" className="border rounded p-2 sm:col-span-2" value={form.notes} onChange={handleChange} />
        <button className="bg-brand text-white rounded py-2 sm:col-span-2 hover:bg-brand-dark">Añadir mascota</button>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pets.map((p) => (
          <PetCard key={p.id} pet={p} onDelete={handleDelete} />
        ))}
        {pets.length === 0 && <p className="text-slate-500">Aún no has registrado mascotas.</p>}
      </div>
    </div>
  );
}
