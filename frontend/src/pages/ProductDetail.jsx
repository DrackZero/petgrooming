import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProduct } from '../api/orders.js';
import { useCart } from '../hooks/useCart.js';
import { formatCOP } from '../utils/format.js';
import ProductCard from '../components/ProductCard.jsx';
import ImageLightbox from '../components/ImageLightbox.jsx';
import Notification from '../components/Notification.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Skeleton, SkeletonText } from '../components/Skeleton.jsx';

// Ficha de producto: imagen ampliable, descripción completa, selector de
// cantidad, datos de la veterinaria que lo vende y otros productos suyos.
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [data, setData] = useState(null);
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [msg, setMsg] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setQty(1);
    window.scrollTo(0, 0);
    getProduct(id)
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="h-80 rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-10 w-1/2" />
          <SkeletonText lines={4} />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <EmptyState
        icon="🔍"
        title="Este producto ya no está disponible"
        description="Puede que la veterinaria lo haya retirado o que su tienda ya no esté activa."
        action={{ to: '/shop', label: 'Volver a la tienda' }}
      />
    );
  }

  const { product: p, related } = data;
  const agotado = p.stock <= 0;
  const ultimos = !agotado && p.stock <= 5;

  const añadir = () => {
    addItem(p, qty);
    setMsg(`${qty} × "${p.name}" en tu carrito`);
  };

  const comprarYa = () => {
    addItem(p, qty);
    navigate('/cart');
  };

  return (
    <div>
      {/* Migas de pan */}
      <nav className="text-sm text-slate-400 mb-4">
        <Link to="/shop" className="hover:text-brand-dark hover:underline">Tienda</Link>
        {p.category && <> · <span className="capitalize">{p.category}</span></>}
        <> · <span className="text-slate-600">{p.name}</span></>
      </nav>

      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      <div className="grid md:grid-cols-2 gap-8 mt-3">
        {/* Imagen */}
        <div
          className={`bg-brand-50 rounded-2xl h-80 sm:h-96 flex items-center justify-center overflow-hidden ${p.image_url ? 'cursor-zoom-in' : ''}`}
          onClick={() => p.image_url && setZoom(true)}
          title={p.image_url ? 'Ver imagen completa' : undefined}
        >
          {p.image_url
            ? <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
            : <span className="text-8xl">🦴</span>}
        </div>

        {/* Datos y compra */}
        <div>
          {p.category && (
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-brand-dark bg-brand-50 rounded-full px-2.5 py-0.5">
              {p.category}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-2">{p.name}</h1>

          <p className="text-4xl font-extrabold text-brand-dark mt-4">{formatCOP(p.price)}</p>

          {/* Disponibilidad */}
          <p className="mt-2 text-sm">
            {agotado ? (
              <span className="text-red-600 font-semibold">Sin stock por ahora</span>
            ) : ultimos ? (
              <span className="text-amber-600 font-semibold">
                ¡Últimas {p.stock} unidades!
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold">
                Disponible · {p.stock} unidades
              </span>
            )}
          </p>

          {/* Cantidad y acciones */}
          {!agotado && (
            <div className="mt-5">
              <label className="text-sm text-slate-600">Cantidad</label>
              <div className="flex items-center gap-3 mt-1">
                <div className="inline-flex items-center border border-slate-200 rounded-full">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Disminuir cantidad"
                    className="w-10 h-10 rounded-full text-slate-500 hover:bg-slate-100 transition text-lg"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-bold tabular-nums">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(p.stock, q + 1))}
                    aria-label="Aumentar cantidad"
                    className="w-10 h-10 rounded-full text-slate-500 hover:bg-slate-100 transition text-lg"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-slate-400">
                  Subtotal <strong className="text-slate-600">{formatCOP(p.price * qty)}</strong>
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  onClick={comprarYa}
                  className="flex-1 bg-brand text-white rounded-full py-3 font-bold hover:bg-brand-dark transition"
                >
                  Comprar ahora
                </button>
                <button
                  onClick={añadir}
                  className="flex-1 border-2 border-brand text-brand-dark rounded-full py-3 font-bold hover:bg-brand-50 transition"
                >
                  Agregar al carrito
                </button>
              </div>
            </div>
          )}

          {/* Vendedor */}
          <div className="mt-6 border border-slate-200 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase">Vendido por</p>
            <p className="font-bold text-slate-800 mt-0.5">🏥 {p.clinic_name}</p>
            {p.clinic_address && <p className="text-sm text-slate-500">{p.clinic_address}</p>}
            {p.clinic_phone && <p className="text-sm text-slate-500">📞 {p.clinic_phone}</p>}
          </div>
        </div>
      </div>

      {/* Descripción */}
      {p.description && (
        <section className="mt-10 max-w-3xl">
          <h2 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2">
            Descripción
          </h2>
          <p className="text-slate-600 mt-3 whitespace-pre-line leading-relaxed">{p.description}</p>
        </section>
      )}

      {/* Más de la misma veterinaria */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="font-bold text-slate-800 text-lg mb-4">
            Más productos de {p.clinic_name}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} onAdd={(prod) => { addItem(prod); setMsg(`"${prod.name}" añadido al carrito`); }} />
            ))}
          </div>
        </section>
      )}

      {zoom && <ImageLightbox src={p.image_url} alt={p.name} onClose={() => setZoom(false)} />}
    </div>
  );
}
