import { Link } from 'react-router-dom';
import { formatCOP } from '../utils/format.js';

// Tarjeta del catálogo. Toda la tarjeta lleva a la ficha del producto;
// el botón "Añadir" es un atajo que no navega.
export default function ProductCard({ product, onAdd }) {
  const agotado = product.stock <= 0;
  const ultimos = !agotado && product.stock <= 5;

  return (
    <Link
      to={`/shop/${product.id}`}
      className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition flex flex-col"
    >
      <div className="relative h-44 bg-brand-50 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition"
          />
        ) : (
          <span className="text-5xl">🦴</span>
        )}
        {agotado && (
          <span className="absolute top-2 left-2 text-[11px] font-bold bg-slate-700 text-white rounded-full px-2 py-0.5">
            Agotado
          </span>
        )}
        {ultimos && (
          <span className="absolute top-2 left-2 text-[11px] font-bold bg-amber-500 text-white rounded-full px-2 py-0.5">
            ¡Últimas {product.stock}!
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {product.category && (
          <span className="self-start text-[11px] font-semibold uppercase tracking-wide text-brand-dark bg-brand-50 rounded-full px-2 py-0.5 mb-1">
            {product.category}
          </span>
        )}
        <h3 className="font-bold text-slate-800 group-hover:text-brand-dark transition">{product.name}</h3>
        {product.clinic_name && <p className="text-[11px] text-slate-400">🏥 {product.clinic_name}</p>}
        <p className="text-sm text-slate-500 mt-1 flex-1 line-clamp-2">{product.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-extrabold text-brand-dark">{formatCOP(product.price)}</span>
          <button
            onClick={(e) => { e.preventDefault(); onAdd?.(product); }}
            disabled={agotado}
            className="text-sm font-semibold px-4 py-1.5 rounded-full bg-brand text-white hover:bg-brand-dark disabled:bg-slate-200 disabled:text-slate-400 transition"
          >
            {agotado ? 'Agotado' : 'Añadir'}
          </button>
        </div>
      </div>
    </Link>
  );
}
