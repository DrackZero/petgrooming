import { useState, useEffect } from 'react';
import { getPets, getPetHistory } from '../api/pets.js';

// Vista del CLIENTE: solo lectura.
// Las mascotas las registra el veterinario en la clínica.
export default function Pets() {
  const [pets, setPets] = useState([]);
  const [openId, setOpenId] = useState(null);      // mascota expandida
  const [history, setHistory] = useState({});      // { petId: {vaccines, appointments} }

  useEffect(() => {
    getPets().then(setPets).catch(() => {});
  }, []);

  const toggleHistory = async (petId) => {
    if (openId === petId) return setOpenId(null);
    setOpenId(petId);
    if (!history[petId]) {
      const data = await getPetHistory(petId).catch(() => null);
      if (data) setHistory((prev) => ({ ...prev, [petId]: data }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Mis mascotas</h1>
      <p className="text-sm text-slate-500 mb-4">
        El registro y actualización de mascotas lo realiza el veterinario en la clínica.
      </p>

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
                    <ul className="space-y-1">
                      {history[p.id].appointments.map((a) => (
                        <li key={a.id} className="text-slate-600">
                          {new Date(a.starts_at).toLocaleString('es-ES')} —{' '}
                          <span className="capitalize">{a.status}</span>
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

        {pets.length === 0 && (
          <p className="text-slate-500">
            Aún no tienes mascotas registradas. Acércate a la clínica para que el veterinario registre a tu mascota.
          </p>
        )}
      </div>
    </div>
  );
}
