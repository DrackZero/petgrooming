import { useState, useEffect } from 'react';
import { getAllOrders } from '../../api/admin.js';

const statusStyle = {
  pendiente: 'bg-amber-50 text-amber-700',
  pagada: 'bg-emerald-50 text-emerald-700',
  enviada: 'bg-sky-50 text-sky-700',
  entregada: 'bg-slate-100 text-slate-600',
  cancelada: 'bg-red-50 text-red-600',
};

// Alertas de pedidos (solo lectura): el procesamiento lo hace el sistema.
export default function ManageOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => { getAllOrders().then(setOrders).catch(() => {}); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Alertas de pedidos</h1>
      <p className="text-sm text-slate-500 mb-4">
        Vista informativa. El procesamiento de pedidos (pago, stock y notificaciones) lo gestiona el sistema automáticamente.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">#</th><th className="p-3">Cliente</th>
              <th className="p-3">Total</th><th className="p-3">Método</th>
              <th className="p-3">Fecha</th><th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3">{o.id}</td>
                <td className="p-3">{o.client_name}</td>
                <td className="p-3">${Number(o.total).toFixed(2)}</td>
                <td className="p-3 capitalize">{o.payment_method || '—'}</td>
                <td className="p-3">{new Date(o.created_at).toLocaleDateString('es-ES')}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${statusStyle[o.status] || 'bg-slate-100'}`}>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan="6" className="p-3 text-slate-500">Sin pedidos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
