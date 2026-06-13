import { useState } from 'react';

// Formulario para reservar una cita.
// props: pets[], services[], slots[], onSubmit({pet_id, service_id, slot_id, notes})
export default function AppointmentForm({ pets = [], services = [], slots = [], onSubmit }) {
  const [form, setForm] = useState({ pet_id: '', service_id: '', slot_id: '', notes: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.pet_id || !form.service_id || !form.slot_id) return;
    onSubmit?.(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
      <h3 className="font-semibold">Reservar cita</h3>

      <select name="pet_id" value={form.pet_id} onChange={handleChange} className="w-full border rounded p-2">
        <option value="">Selecciona mascota…</option>
        {pets.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <select name="service_id" value={form.service_id} onChange={handleChange} className="w-full border rounded p-2">
        <option value="">Selecciona servicio…</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>{s.name} — ${s.price}</option>
        ))}
      </select>

      <select name="slot_id" value={form.slot_id} onChange={handleChange} className="w-full border rounded p-2">
        <option value="">Selecciona horario…</option>
        {slots.map((sl) => (
          <option key={sl.id} value={sl.id}>
            {new Date(sl.starts_at).toLocaleString('es-ES')}
          </option>
        ))}
      </select>

      <textarea
        name="notes"
        value={form.notes}
        onChange={handleChange}
        placeholder="Notas (opcional)"
        className="w-full border rounded p-2"
      />

      <button type="submit" className="w-full bg-brand text-white rounded py-2 hover:bg-brand-dark">
        Confirmar cita
      </button>
    </form>
  );
}
