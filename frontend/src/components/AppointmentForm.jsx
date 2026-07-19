import { useState, useMemo } from 'react';

// Formulario para reservar una cita: mascota + veterinario + horario.
// props: pets[], slots[] (con vet_id/vet_name), onSubmit({pet_id, slot_id})
export default function AppointmentForm({ pets = [], slots = [], onSubmit }) {
  const [form, setForm] = useState({ pet_id: '', vet_id: '', slot_id: '' });

  // Veterinarios que tienen al menos un horario disponible (con su clínica).
  const vets = useMemo(() => {
    const map = new Map();
    for (const s of slots) {
      if (s.vet_id && !map.has(s.vet_id)) {
        map.set(s.vet_id, {
          name: s.vet_name || 'Veterinario/a',
          clinic: s.clinic_name || null,
        });
      }
    }
    return [...map.entries()].map(([id, v]) => ({ id, ...v }));
  }, [slots]);

  // Horarios del veterinario elegido.
  const vetSlots = form.vet_id
    ? slots.filter((s) => String(s.vet_id) === String(form.vet_id))
    : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.pet_id || !form.slot_id) return;
    onSubmit?.({ pet_id: form.pet_id, slot_id: form.slot_id });
    setForm({ pet_id: '', vet_id: '', slot_id: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
      <h3 className="font-semibold">Reservar cita</h3>

      <select
        value={form.pet_id}
        onChange={(e) => setForm({ ...form, pet_id: e.target.value })}
        className="w-full border rounded p-2"
        required
      >
        <option value="">Selecciona mascota…</option>
        {pets.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <select
        value={form.vet_id}
        onChange={(e) => setForm({ ...form, vet_id: e.target.value, slot_id: '' })}
        className="w-full border rounded p-2"
        required
      >
        <option value="">Selecciona veterinario/a…</option>
        {vets.map((v) => (
          <option key={v.id} value={v.id}>
            🩺 {v.name}{v.clinic ? ` — ${v.clinic}` : ''}
          </option>
        ))}
      </select>

      <select
        value={form.slot_id}
        onChange={(e) => setForm({ ...form, slot_id: e.target.value })}
        className="w-full border rounded p-2 disabled:bg-slate-50 disabled:text-slate-400"
        disabled={!form.vet_id}
        required
      >
        <option value="">
          {form.vet_id ? 'Selecciona horario…' : 'Primero elige veterinario/a'}
        </option>
        {vetSlots.map((sl) => (
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
      {vets.length === 0 && (
        <p className="text-xs text-amber-600">
          No hay veterinarios con horarios disponibles por el momento. Intenta más tarde.
        </p>
      )}

      <button
        type="submit"
        disabled={!pets.length || !vets.length}
        className="w-full bg-brand text-white rounded py-2 hover:bg-brand-dark disabled:bg-slate-300"
      >
        Reservar cita
      </button>
    </form>
  );
}
