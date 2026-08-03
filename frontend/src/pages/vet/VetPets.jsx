import { useState, useEffect } from 'react';
import {
  getAllPets, getClientsForVet, createPet, addVaccine, deleteVaccine, getPetHistory,
  getPetRequests, approvePetRequest, rejectPetRequest,
  addConsultation, deleteConsultation, downloadHistoryPdf,
} from '../../api/pets.js';
import Notification from '../../components/Notification.jsx';
import Tooltip from '../../components/Tooltip.jsx';
import SpeciesPicker from '../../components/SpeciesPicker.jsx';
import { useConfirm } from '../../hooks/useConfirm.js';

const emptyPet = { owner_id: '', name: '', species: '', breed: '', age: '', notes: '' };
const emptyConsultation = {
  reason: '', symptoms: '', diagnosis: '', treatment: '', medications: '',
};

// Panel del VETERINARIO: registrar mascotas de clientes, sus vacunas,
// y revisar solicitudes de mascota adicional enviadas por clientes.
export default function VetPets() {
  const confirmar = useConfirm();
  const [pets, setPets] = useState([]);
  const [clients, setClients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(emptyPet);
  const [vaccineFor, setVaccineFor] = useState(null); // mascota a la que se añade vacuna
  const [vaccine, setVaccine] = useState({ name: '', applied_date: '' });
  const [consultFor, setConsultFor] = useState(null); // mascota que se está atendiendo
  const [consultation, setConsultation] = useState(emptyConsultation);
  const [historyFor, setHistoryFor] = useState(null); // mascota cuyo historial se muestra
  const [history, setHistory] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    getAllPets().then(setPets).catch(() => {});
    getPetRequests().then(setRequests).catch(() => {});
  };

  useEffect(() => {
    load();
    getClientsForVet().then(setClients).catch(() => {});
  }, []);

  const approveRequest = async (r) => {
    try {
      await approvePetRequest(r.id);
      setMsg(`Solicitud de ${r.client_name} aprobada: "${r.name}" registrada ✓`);
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'No fue posible aprobar la solicitud');
    }
  };

  const rejectRequest = async (r) => {
    await rejectPetRequest(r.id).catch(() => {});
    setMsg(`Solicitud de ${r.client_name} rechazada`);
    load();
  };

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
    const ok = await confirmar({
      title: 'Eliminar vacuna',
      message: 'Se borrará del historial clínico de la mascota y dejará de aparecer en su PDF. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await deleteVaccine(historyFor.id, vaccineId).catch(() => {});
    setHistory(await getPetHistory(historyFor.id).catch(() => null));
  };

  const handleConsultation = async (e) => {
    e.preventDefault();
    try {
      await addConsultation(consultFor.id, consultation);
      setMsg(`Consulta de ${consultFor.name} registrada ✓`);
      setConsultFor(null);
      setConsultation(emptyConsultation);
      if (historyFor?.id === consultFor.id) {
        setHistory(await getPetHistory(consultFor.id).catch(() => null));
      }
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error al registrar la consulta');
    }
  };

  const removeConsultation = async (consultationId) => {
    const ok = await confirmar({
      title: 'Eliminar consulta clínica',
      message: 'Se borrarán el motivo, diagnóstico, tratamiento y medicamentos de esta atención. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await deleteConsultation(historyFor.id, consultationId).catch(() => {});
    setHistory(await getPetHistory(historyFor.id).catch(() => null));
  };

  const downloadPdf = async (pet) => {
    try {
      await downloadHistoryPdf(pet.id, pet.name);
      setMsg(`Historia clínica de ${pet.name} descargada ✓`);
    } catch {
      setMsg('No fue posible generar el PDF');
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

      {/* Solicitudes de mascota adicional pendientes */}
      {requests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <h2 className="font-bold text-amber-800 mb-3">
            Solicitudes de mascota adicional ({requests.length})
          </h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="bg-white rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{r.name}{r.species ? ` — ${r.species}` : ''}{r.breed ? ` / ${r.breed}` : ''}</p>
                  <p className="text-xs text-slate-500">
                    Cliente: {r.client_name} ({r.client_email}) · solicitó el {new Date(r.created_at).toLocaleDateString('es-ES')}
                  </p>
                  {r.notes && <p className="text-xs text-slate-500 mt-0.5">📋 {r.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveRequest(r)} className="text-sm font-semibold px-4 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition">
                    ✓ Aprobar
                  </button>
                  <button onClick={() => rejectRequest(r)} className="text-sm font-semibold px-4 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition">
                    ✕ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registrar mascota para un cliente */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 my-4 grid sm:grid-cols-2 gap-3">
        <select name="owner_id" value={form.owner_id} onChange={handleChange} required className="border rounded p-2 sm:col-span-2">
          <option value="">Selecciona el cliente dueño…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
          ))}
        </select>
        <input name="name" placeholder="Nombre de la mascota" required className="border rounded p-2" value={form.name} onChange={handleChange} />
        <input name="breed" placeholder="Raza" className="border rounded p-2" value={form.breed} onChange={handleChange} />
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-slate-600 mb-1">Especie</p>
          <SpeciesPicker value={form.species} onChange={(v) => setForm({ ...form, species: v })} />
        </div>
        <input name="age" type="number" min="0" placeholder="Edad (años)" className="border rounded p-2" value={form.age} onChange={handleChange} />
        <Tooltip tip="Alergias, condiciones o cualquier dato clínico relevante" side="top" className="sm:col-span-2">
          <textarea name="notes" placeholder="Notas clínicas" className="border rounded p-2 w-full" value={form.notes} onChange={handleChange} />
        </Tooltip>
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
                  <Tooltip tip="Registrar la atención: motivo, diagnóstico, tratamiento y medicamentos" side="top">
                    <button onClick={() => { setConsultFor(p); setConsultation(emptyConsultation); }} className="text-brand-dark hover:underline">
                      🩺 Consulta
                    </button>
                  </Tooltip>
                  <Tooltip tip="Registrar una vacuna aplicada a esta mascota" side="top">
                    <button onClick={() => setVaccineFor(p)} className="text-brand-dark hover:underline">
                      💉 Vacuna
                    </button>
                  </Tooltip>
                  <Tooltip tip="Ver el historial clínico completo (consultas, vacunas y citas)" side="top">
                    <button onClick={() => showHistory(p)} className="text-brand-dark hover:underline">
                      📋 Historial
                    </button>
                  </Tooltip>
                  <Tooltip tip="Descargar la historia clínica completa en PDF" side="top">
                    <button onClick={() => downloadPdf(p)} className="text-brand-dark hover:underline">
                      📄 PDF
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

      {/* Formulario de consulta clínica */}
      {consultFor && (
        <form onSubmit={handleConsultation} className="bg-white border-2 border-brand rounded-2xl p-5 mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-800">
              🩺 Registrar consulta — <span className="text-brand-dark">{consultFor.name}</span>
              <span className="text-slate-400 font-normal text-sm"> ({consultFor.owner_name})</span>
            </p>
            <button type="button" onClick={() => setConsultFor(null)} className="px-2 rounded bg-slate-100 hover:bg-slate-200">✕</button>
          </div>

          <label className="block text-sm">
            Motivo de consulta *
            <input
              required placeholder="Ej. Control anual, vómito, cojera…"
              className="border rounded-lg p-2 w-full mt-1"
              value={consultation.reason}
              onChange={(e) => setConsultation({ ...consultation, reason: e.target.value })}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              Síntomas observados
              <textarea
                rows="3" placeholder="Qué presenta el paciente"
                className="border rounded-lg p-2 w-full mt-1"
                value={consultation.symptoms}
                onChange={(e) => setConsultation({ ...consultation, symptoms: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Diagnóstico
              <textarea
                rows="3" placeholder="Conclusión clínica"
                className="border rounded-lg p-2 w-full mt-1"
                value={consultation.diagnosis}
                onChange={(e) => setConsultation({ ...consultation, diagnosis: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Tratamiento indicado
              <textarea
                rows="3" placeholder="Procedimiento y cuidados"
                className="border rounded-lg p-2 w-full mt-1"
                value={consultation.treatment}
                onChange={(e) => setConsultation({ ...consultation, treatment: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Medicamentos recetados
              <textarea
                rows="3" placeholder="Nombre, dosis y duración"
                className="border rounded-lg p-2 w-full mt-1"
                value={consultation.medications}
                onChange={(e) => setConsultation({ ...consultation, medications: e.target.value })}
              />
            </label>
          </div>

          <button className="w-full bg-brand text-white rounded-full py-2.5 font-semibold hover:bg-brand-dark transition">
            Guardar consulta en el historial
          </button>
        </form>
      )}

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
            <div className="flex gap-2">
              <button onClick={() => downloadPdf(historyFor)} className="text-sm font-semibold px-3 py-1 rounded-full bg-brand text-white hover:bg-brand-dark transition">
                📄 Descargar PDF
              </button>
              <button onClick={() => { setHistoryFor(null); setHistory(null); }} className="px-2 rounded bg-slate-100 hover:bg-slate-200">✕</button>
            </div>
          </div>

          {historyFor.notes && (
            <p className="text-sm bg-amber-50 text-amber-800 rounded-lg px-3 py-2 mb-3">
              ⚠️ Notas clínicas: {historyFor.notes}
            </p>
          )}

          {/* Consultas clínicas */}
          {history && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 text-sm">🩺 Consultas ({history.consultations?.length || 0})</h4>
              {history.consultations?.length ? (
                <div className="space-y-2">
                  {history.consultations.map((c) => (
                    <div key={c.id} className="border border-slate-200 rounded-xl p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">{c.reason}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(c.consulted_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {c.vet_name && ` · ${c.vet_name}`}{c.clinic_name && ` (${c.clinic_name})`}
                          </p>
                        </div>
                        <button onClick={() => removeConsultation(c.id)} className="text-red-500 text-xs hover:underline shrink-0">
                          Quitar
                        </button>
                      </div>
                      <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
                        {c.symptoms && <div><dt className="text-xs text-slate-400 uppercase">Síntomas</dt><dd className="text-slate-600">{c.symptoms}</dd></div>}
                        {c.diagnosis && <div><dt className="text-xs text-slate-400 uppercase">Diagnóstico</dt><dd className="text-slate-600">{c.diagnosis}</dd></div>}
                        {c.treatment && <div><dt className="text-xs text-slate-400 uppercase">Tratamiento</dt><dd className="text-slate-600">{c.treatment}</dd></div>}
                        {c.medications && <div><dt className="text-xs text-slate-400 uppercase">Medicamentos</dt><dd className="text-slate-600">{c.medications}</dd></div>}
                      </dl>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Sin consultas registradas.</p>
              )}
            </div>
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
                          {v.vet_name && (
                            <span className="block text-xs text-slate-400">
                              Registrada por {v.vet_name}{v.clinic_name ? ` (${v.clinic_name})` : ''}
                            </span>
                          )}
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
                <h4 className="font-medium mb-2">📅 Citas ({history.appointments.length})</h4>
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
