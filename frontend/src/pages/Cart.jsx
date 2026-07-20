import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart.js';
import { useAuth } from '../hooks/useAuth.js';
import { createOrder } from '../api/orders.js';
import Notification from '../components/Notification.jsx';
import Tooltip from '../components/Tooltip.jsx';
import { formatCOP } from '../utils/format.js';
import { wompiCheckoutUrl } from '../utils/wompi.js';

export default function Cart() {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const [checkout, setCheckout] = useState({ payment_method: 'tarjeta', shipping_address: '' });

  const handleCheckout = async () => {
    if (!isAuthenticated) return navigate('/login');
    if (!checkout.shipping_address.trim()) {
      return setMsg('Ingresa la dirección de envío para continuar');
    }
    try {
      const res = await createOrder({
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        ...checkout,
      });

      // Con Wompi configurado: redirige al checkout seguro de la pasarela.
      if (res.payment?.provider === 'wompi') {
        clearCart();
        window.location.href = wompiCheckoutUrl(res.payment);
        return;
      }

      // Modo simulado (sin llaves de Wompi).
      clearCart();
      setMsg('¡Pedido registrado! (pago en modo simulado — pendiente de confirmación)');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error al procesar el pedido');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Carrito</h1>
      <Notification type="info" message={msg} onClose={() => setMsg('')} />

      {items.length === 0 ? (
        <p className="text-slate-500 mt-3">Tu carrito está vacío.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y mt-3">
          {items.map((i) => (
            <div key={i.product_id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{i.name}</p>
                <p className="text-sm text-slate-500">{formatCOP(i.price)} c/u</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number" min="1" value={i.quantity}
                  onChange={(e) => updateQuantity(i.product_id, Number(e.target.value))}
                  className="w-16 border rounded p-1 text-center"
                />
                <button onClick={() => removeItem(i.product_id)} className="text-red-600 text-sm hover:underline">
                  Quitar
                </button>
              </div>
            </div>
          ))}

          {/* Datos de pago y envío */}
          <div className="p-4 grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              Método de pago
              <select
                value={checkout.payment_method}
                onChange={(e) => setCheckout({ ...checkout, payment_method: e.target.value })}
                className="border rounded p-2 w-full mt-1"
              >
                <option value="tarjeta">Tarjeta</option>
                <option value="pse">PSE</option>
                <option value="nequi">Nequi</option>
              </select>
            </label>
            <label className="text-sm">
              Dirección de envío
              <input
                value={checkout.shipping_address}
                onChange={(e) => setCheckout({ ...checkout, shipping_address: e.target.value })}
                placeholder="Calle 123 #45-67, Yopal"
                className="border rounded p-2 w-full mt-1"
              />
            </label>
          </div>

          <div className="p-4 flex items-center justify-between">
            <span className="font-bold text-lg">Total: {formatCOP(total)}</span>
            <Tooltip tip="Confirma tu pedido y procede al pago" side="top">
              <button onClick={handleCheckout} className="bg-brand text-white px-4 py-2 rounded hover:bg-brand-dark">
                Finalizar compra
              </button>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
