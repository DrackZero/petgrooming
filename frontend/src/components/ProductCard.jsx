import { useState } from 'react';
import { formatCOP } from '../utils/format.js';
import ImageLightbox from './ImageLightbox.jsx';

export default function ProductCard({ product, onAdd }) {
  const [showFull, setShowFull] = useState(false);

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition flex flex-col">
      <div
        className={`h-44 bg-brand-50 flex items-center justify-center overflow-hidden ${product.image_url ? 'cursor-zoom-in' : ''}`}
        onClick={() => product.image_url && setShowFull(true)}
        title={product.image_url ? 'Ver imagen completa' : undefined}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition"
          />
        ) : (
          <span className="text-5xl">🦴</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        {product.category && (
          <span className="self-start text-[11px] font-semibold uppercase tracking-wide text-brand-dark bg-brand-50 rounded-full px-2 py-0.5 mb-1">
            {product.category}
          </span>
        )}
        <h3 className="font-bold text-slate-800">{product.name}</h3>
        <p className="text-sm text-slate-500 mt-1 flex-1 line-clamp-2">{product.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-extrabold text-brand-dark">{formatCOP(product.price)}</span>
          <button
            onClick={() => onAdd?.(product)}
            disabled={product.stock <= 0}
            className="text-sm font-semibold px-4 py-1.5 rounded-full bg-brand text-white hover:bg-brand-dark disabled:bg-slate-200 disabled:text-slate-400 transition"
          >
            {product.stock > 0 ? 'Añadir' : 'Agotado'}
          </button>
        </div>
      </div>

      {showFull && (
        <ImageLightbox src={product.image_url} alt={product.name} onClose={() => setShowFull(false)} />
      )}
    </div>
  );
}
