import { useState, useEffect } from 'react';
import { getOrders } from '../api/orders.js';
import { getMyEnrollments } from '../api/courses.js';
import { formatCOP } from '../utils/format.js';

export default function History() {
  const [orders, setOrders] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    getOrders().then(setOrders).catch(() => {});
    getMyEnrollments().then(setEnrollments).catch(() => {});
  }, []);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section>
        <h1 className="text-2xl font-bold mb-4">Mis pedidos</h1>
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between">
                <span className="font-medium">Pedido #{o.id}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 capitalize">{o.status}</span>
              </div>
              <p className="text-sm text-slate-500">{new Date(o.created_at).toLocaleDateString('es-ES')}</p>
              <p className="font-bold mt-1">{formatCOP(o.total)}</p>
            </div>
          ))}
          {orders.length === 0 && <p className="text-slate-500">Sin pedidos.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Mis cursos</h2>
        <div className="space-y-3">
          {enrollments.map((e) => (
            <div key={e.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="font-medium">{e.title}</p>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 capitalize">{e.status}</span>
            </div>
          ))}
          {enrollments.length === 0 && <p className="text-slate-500">Sin inscripciones.</p>}
        </div>
      </section>
    </div>
  );
}
