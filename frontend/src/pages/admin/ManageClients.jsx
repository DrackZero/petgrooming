import { useState, useEffect } from 'react';
import { getClients } from '../../api/admin.js';

export default function ManageClients() {
  const [clients, setClients] = useState([]);

  useEffect(() => { getClients().then(setClients).catch(() => {}); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Clientes</h1>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead className="bg-slate-50 text-left">
          <tr><th className="p-3">Nombre</th><th className="p-3">Email</th><th className="p-3">Teléfono</th><th className="p-3">Alta</th></tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">{c.name}</td>
              <td className="p-3">{c.email}</td>
              <td className="p-3">{c.phone || '—'}</td>
              <td className="p-3">{new Date(c.created_at).toLocaleDateString('es-ES')}</td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr><td colSpan="4" className="p-3 text-slate-500">Sin clientes registrados.</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
