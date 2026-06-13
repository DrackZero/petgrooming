import { useState, useEffect } from 'react';
import { getAllOrders, updateOrderStatus } from '../../api/admin.js';

const STATUSES = ['pending', 'paid', 'shipped', 'cancelled'];

export default function ManageOrders() {
  const [orders, setOrders] = useState([]);

  const load = () => getAllOrders().then(setOrders).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleStatus = async (id, status) => {
    await updateOrderStatus(id, status);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Gestionar pedidos</h1>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="p-3">#</th><th className="p-3">Cliente</th>
            <th className="p-3">Total</th><th className="p-3">Fecha</th><th className="p-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-3">{o.id}</td>
              <td className="p-3">{o.client_name}</td>
              <td className="p-3">${Number(o.total).toFixed(2)}</td>
              <td className="p-3">{new Date(o.created_at).toLocaleDateString('es-ES')}</td>
              <td className="p-3">
                <select value={o.status} onChange={(e) => handleStatus(o.id, e.target.value)} className="border rounded p-1">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
