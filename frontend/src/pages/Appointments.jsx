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

// Servicios fijos de ejemplo (en producción vendrían de /api/services).
const SERVICES = [
  { id: 1, name: 'Baño básico', price: 25 },
  { id: 2, name: 'Corte completo', price: 40 },
  { id: 3, name: 'Corte de uñas', price: 10 },
];

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
    await createAppointment(form);
    setMsg('Cita reservada ✓');
    load();
  };

  const handleCancel = async (id) => {
    await cancelAppointment(id);
    load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">Reservar cita</h1>
        <Notification type="success" message={msg} onClose={() => setMsg('')} />
        <AppointmentForm pets={pets} services={SERVICES} slots={slots} onSubmit={handleSubmit} />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Mis citas</h2>
        <div className="space-y-3">
          {appointments.map((a) => (
            <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{a.pet_name} · {a.service_name}</p>
                <p className="text-sm text-slate-500">{new Date(a.starts_at).toLocaleString('es-ES')}</p>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 capitalize">{a.status}</span>
              </div>
              {a.status !== 'cancelled' && (
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
