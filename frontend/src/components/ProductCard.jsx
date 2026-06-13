export default function ProductCard({ product, onAdd }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="h-40 bg-slate-100 flex items-center justify-center">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl">📦</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold">{product.name}</h3>
        {product.category && <p className="text-xs text-slate-400">{product.category}</p>}
        <p className="text-sm text-slate-600 mt-1 flex-1">{product.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-bold text-brand-dark">${product.price}</span>
          <button
            onClick={() => onAdd?.(product)}
            disabled={product.stock <= 0}
            className="text-sm px-3 py-1 rounded bg-brand text-white hover:bg-brand-dark disabled:bg-slate-300"
          >
            {product.stock > 0 ? 'Añadir' : 'Sin stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
