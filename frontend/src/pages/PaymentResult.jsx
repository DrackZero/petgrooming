import { useSearchParams, Link } from 'react-router-dom';

// Página de retorno del checkout de Wompi.
// El estado definitivo del pedido lo fija el WEBHOOK (nunca el navegador):
// aquí solo informamos al cliente y lo enviamos a su historial.
export default function PaymentResult() {
  const [params] = useSearchParams();
  const txId = params.get('id');

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl border border-slate-100 shadow-md text-center">
      <span className="inline-flex w-16 h-16 rounded-full bg-brand-50 items-center justify-center text-4xl">🧾</span>
      <h1 className="text-2xl font-extrabold text-brand-dark mt-3">¡Gracias por tu compra!</h1>
      <p className="text-slate-500 mt-2">
        Tu pago está siendo procesado por Wompi. En cuanto la entidad financiera lo confirme,
        verás tu pedido como <strong>pagado</strong> y recibirás un correo de confirmación.
      </p>
      {txId && (
        <p className="text-xs text-slate-400 mt-3 break-all">
          Referencia de transacción: {txId}
        </p>
      )}
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/history" className="px-5 py-2.5 rounded-full bg-brand text-white font-semibold hover:bg-brand-dark transition">
          Ver mi historial
        </Link>
        <Link to="/shop" className="px-5 py-2.5 rounded-full bg-white text-brand-dark font-semibold border border-brand-200 hover:bg-brand-50 transition">
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
