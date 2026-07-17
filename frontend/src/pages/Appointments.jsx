import { useState, useEffect } from 'react';
import {
  getAppointments,
  getAvailableSlots,
  createAppointment,
  cancelAppointment,
} from '../api/appointments.js';
import { getPets } from '../api/pets.js';
import AppointmentForm from '../components/AppointmentForm.jsx';
import Notification from '../components/Notification.jsx';

const statusStyle = {
  pendiente: 'bg-amber-50 text-amber-700',
  confirmada: 'bg-emerald-50 text-emerald-700',
  completada: 'bg-sky-50 text-sky-700',
  cancelada: 'bg-red-50 text-red-600',
};

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [pets, setPets] = useState([]);
  const [slots, setSlots] = useState([]);
  const [msg, setMsg] = useState('');

  const load = () => {
    getAppointments().then(setAppointments).catch(() => {});
    getAvailableSlots().then(setSlots).catch(() => {});
  };

  useEffect(() => {
    getPets().then(setPets).catch(() => {});
    load();
  }, []);

  const handleSubmit = async (form) => {
    try {
      await createAppointment(form);
      setMsg('Cita reservada ✓ Queda pendiente de confirmación por el veterinario.');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'No fue posible reservar la cita');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar esta cita?')) return;
    await cancelAppointment(id);
    load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">Reservar cita</h1>
        <Notification type="info" message={msg} onClose={() => setMsg('')} />
        <div className="mt-3">
          <AppointmentForm pets={pets} slots={slots} onSubmit={handleSubmit} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Mis citas</h2>
        <div className="space-y-3">
          {appointments.map((a) => (
            <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{a.pet_name}</p>
                <p className="text-sm text-slate-500">{new Date(a.starts_at).toLocaleString('es-ES')}</p>
                {a.vet_name && <p className="text-xs text-slate-400">🩺 {a.vet_name}</p>}
                <span className={`text-xs px-2 py-0.5 rounded capitalize ${statusStyle[a.status] || 'bg-slate-100'}`}>
                  {a.status}
                </span>
              </div>
              {!['cancelada', 'completada'].includes(a.status) && (
                <button onClick={() => handleCancel(a.id)} className="text-sm text-red-600 hover:underline">
                  Cancelar
                </button>
              )}
            </div>
          ))}
          {appointments.length === 0 && <p className="text-slate-500">No tienes citas.</p>}
        </div>
      </div>
    </div>
  );
}
