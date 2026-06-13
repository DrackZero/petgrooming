import { useState, useEffect } from 'react';
import { getAllAppointments, updateAppointmentStatus } from '../../api/admin.js';

const STATUSES = ['pending', 'confirmed', 'done', 'cancelled'];

export default function ManageAppointments() {
  const [appointments, setAppointments] = useState([]);

  const load = () => getAllAppointments().then(setAppointments).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleStatus = async (id, status) => {
    await updateAppointmentStatus(id, status);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Gestionar citas</h1>
      <table className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="p-3">Cliente</th><th className="p-3">Mascota</th>
            <th className="p-3">Servicio</th><th className="p-3">Fecha</th><th className="p-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="p-3">{a.client_name}</td>
              <td className="p-3">{a.pet_name}</td>
              <td className="p-3">{a.service_name}</td>
              <td className="p-3">{new Date(a.starts_at).toLocaleString('es-ES')}</td>
              <td className="p-3">
                <select value={a.status} onChange={(e) => handleStatus(a.id, e.target.value)} className="border rounded p-1">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
