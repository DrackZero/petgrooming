import { useState, useEffect } from 'react';
import { getOrders, payOrder } from '../api/orders.js';
import { getMyEnrollments } from '../api/courses.js';
import { formatCOP } from '../utils/format.js';
import { wompiCheckoutUrl } from '../utils/wompi.js';
import Notification from '../components/Notification.jsx';
import Tooltip from '../components/Tooltip.jsx';

const statusStyle = {
  pendiente: 'bg-amber-50 text-amber-700',
  pagada: 'bg-emerald-50 text-emerald-700',
  enviada: 'bg-sky-50 text-sky-700',
  entregada: 'bg-slate-100 text-slate-600',
  cancelada: 'bg-red-50 text-red-600',
};

export default function History() {
  const [orders, setOrders] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getOrders().then(setOrders).catch(() => {});
    getMyEnrollments().then(setEnrollments).catch(() => {});
  }, []);

  // Reintenta el pago de un pedido pendiente (vuelve al checkout de Wompi).
  const handlePay = async (orderId) => {
    try {
      const { payment } = await payOrder(orderId);
      if (payment?.provider === 'wompi') {
        window.location.href = wompiCheckoutUrl(payment);
        return;
      }
      setMsg('El pago está en modo simulado (sin pasarela configurada).');
    } catch (err) {
      setMsg(err.response?.data?.message || 'No fue posible retomar el pago');
      getOrders().then(setOrders).catch(() => {}); // refresca estados
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section>
        <h1 className="text-2xl font-bold mb-4">Mis pedidos</h1>
        <Notification type="info" message={msg} onClose={() => setMsg('')} />
        <div className="space-y-3 mt-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Pedido #{o.id}</span>
                <span className={`text-xs px-2 py-0.5 rounded capitalize ${statusStyle[o.status] || 'bg-slate-100'}`}>
                  {o.status}
                </span>
              </div>
              <p className="text-sm text-slate-500">{new Date(o.created_at).toLocaleDateString('es-ES')}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="font-bold">{formatCOP(o.total)}</p>
                {o.status === 'pendiente' && (
                  <Tooltip tip="Retoma el pago seguro de este pedido en Wompi" side="top">
                    <button
                      onClick={() => handlePay(o.id)}
                      className="text-sm font-semibold px-4 py-1.5 rounded-full bg-brand text-white hover:bg-brand-dark transition"
                    >
                      💳 Pagar ahora
                    </button>
                  </Tooltip>
                )}
              </div>
              {o.status === 'pendiente' && (
                <p className="text-xs text-amber-600 mt-1">
                  Este pedido se cancelará automáticamente si no se paga a tiempo.
                </p>
              )}
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
