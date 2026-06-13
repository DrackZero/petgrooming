import { useState, useEffect } from 'react';
import { getAvailableSlots } from '../../api/appointments.js';
import { createSlot, deleteSlot } from '../../api/admin.js';

export default function ManageSlots() {
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ starts_at: '', ends_at: '', capacity: 1 });

  const load = () => getAvailableSlots().then(setSlots).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createSlot({ ...form, capacity: Number(form.capacity) });
    setForm({ starts_at: '', ends_at: '', capacity: 1 });
    load();
  };

  const handleDelete = async (id) => {
    await deleteSlot(id);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Gestionar horarios</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 grid sm:grid-cols-3 gap-3 mb-6">
        <input name="starts_at" type="datetime-local" required className="border rounded p-2" value={form.starts_at} onChange={handleChange} />
        <input name="ends_at" type="datetime-local" required className="border rounded p-2" value={form.ends_at} onChange={handleChange} />
        <input name="capacity" type="number" min="1" className="border rounded p-2" value={form.capacity} onChange={handleChange} />
        <button className="bg-brand text-white rounded py-2 sm:col-span-3 hover:bg-brand-dark">Crear franja</button>
      </form>

      <div className="space-y-2">
        {slots.map((s) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center">
            <span>{new Date(s.starts_at).toLocaleString('es-ES')} → {new Date(s.ends_at).toLocaleTimeString('es-ES')}</span>
            <button onClick={() => handleDelete(s.id)} className="text-red-600 text-sm hover:underline">Eliminar</button>
          </div>
        ))}
        {slots.length === 0 && <p className="text-slate-500">No hay franjas disponibles.</p>}
      </div>
    </div>
  );
}
