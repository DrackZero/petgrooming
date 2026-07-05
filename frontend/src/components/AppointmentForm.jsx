import { useState } from 'react';

// Formulario para reservar una cita (mascota + horario disponible).
// props: pets[], slots[], onSubmit({pet_id, slot_id})
export default function AppointmentForm({ pets = [], slots = [], onSubmit }) {
  const [form, setForm] = useState({ pet_id: '', slot_id: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.pet_id || !form.slot_id) return;
    onSubmit?.(form);
    setForm({ pet_id: '', slot_id: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
      <h3 className="font-semibold">Reservar cita</h3>

      <select name="pet_id" value={form.pet_id} onChange={handleChange} className="w-full border rounded p-2" required>
        <option value="">Selecciona mascota…</option>
        {pets.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <select name="slot_id" value={form.slot_id} onChange={handleChange} className="w-full border rounded p-2" required>
        <option value="">Selecciona horario…</option>
        {slots.map((sl) => (
          <option key={sl.id} value={sl.id}>
            {new Date(sl.starts_at).toLocaleString('es-ES')}
          </option>
        ))}
      </select>

      {pets.length === 0 && (
        <p className="text-xs text-amber-600">
          No tienes mascotas registradas. El veterinario debe registrar tu mascota antes de poder agendar.
        </p>
      )}
      {slots.length === 0 && (
        <p className="text-xs text-amber-600">
          No hay horarios disponibles por el momento. Intenta más tarde.
        </p>
      )}

      <button
        type="submit"
        disabled={!pets.length || !slots.length}
        className="w-full bg-brand text-white rounded py-2 hover:bg-brand-dark disabled:bg-slate-300"
      >
        Reservar cita
      </button>
    </form>
  );
}
