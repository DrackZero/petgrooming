import { useState, useEffect } from 'react';
import { getAvailableSlots, createSlot, deleteSlot } from '../../api/appointments.js';
import Notification from '../../components/Notification.jsx';

// Panel del VETERINARIO: definir los horarios disponibles para citas.
export default function VetSlots() {
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ starts_at: '', ends_at: '' });
  const [msg, setMsg] = useState('');

  const load = () => getAvailableSlots().then(setSlots).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createSlot(form);
      setForm({ starts_at: '', ends_at: '' });
      setMsg('Horario creado ✓');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error al crear el horario');
    }
  };

  const handleDelete = async (id) => {
    await deleteSlot(id).catch(() => {});
    load();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Horarios de atención</h1>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 my-4 grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Inicio
          <input name="starts_at" type="datetime-local" required className="border rounded p-2 w-full mt-1" value={form.starts_at} onChange={handleChange} />
        </label>
        <label className="text-sm">
          Fin
          <input name="ends_at" type="datetime-local" required className="border rounded p-2 w-full mt-1" value={form.ends_at} onChange={handleChange} />
        </label>
        <button className="bg-brand text-white rounded py-2 sm:col-span-2 hover:bg-brand-dark">
          Crear horario disponible
        </button>
      </form>

      <h2 className="font-semibold mb-2">Próximos horarios libres</h2>
      <div className="space-y-2">
        {slots.map((s) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center">
            <span className="text-sm">
              {new Date(s.starts_at).toLocaleString('es-ES')} → {new Date(s.ends_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button onClick={() => handleDelete(s.id)} className="text-red-600 text-sm hover:underline">
              Eliminar
            </button>
          </div>
        ))}
        {slots.length === 0 && <p className="text-slate-500 text-sm">No hay horarios libres creados.</p>}
      </div>
    </div>
  );
}
