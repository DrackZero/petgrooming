import { useState, useEffect, useMemo } from 'react';
import { getProducts } from '../api/orders.js';
import { useCart } from '../hooks/useCart.js';
import ProductCard from '../components/ProductCard.jsx';
import Notification from '../components/Notification.jsx';

const SORTS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'precio_asc', label: 'Precio: menor a mayor' },
  { value: 'precio_desc', label: 'Precio: mayor a menor' },
  { value: 'nombre', label: 'Nombre A-Z' },
];

// TIENDA completa: búsqueda, filtro por categoría y ordenamiento.
export default function Shop() {
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todas');
  const [sort, setSort] = useState('recientes');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {});
  }, []);

  const handleAdd = (product) => {
    addItem(product);
    setMsg(`"${product.name}" añadido al carrito`);
  };

  // Categorías únicas presentes en el catálogo.
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );

  // Aplica búsqueda + categoría + orden.
  const visible = useMemo(() => {
    let list = products;

    if (category !== 'todas') {
      list = list.filter((p) => p.category === category);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sort === 'precio_asc') sorted.sort((a, b) => a.price - b.price);
    if (sort === 'precio_desc') sorted.sort((a, b) => b.price - a.price);
    if (sort === 'nombre') sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    // 'recientes' conserva el orden del backend (created_at DESC)
    return sorted;
  }, [products, category, search, sort]);

  return (
    <div>
      <h1 className="page-title mb-1">Tienda</h1>
      <p className="text-sm text-slate-500 mb-5">
        Alimento, juguetes, higiene y accesorios para tu mascota.
      </p>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      {/* Barra de búsqueda y orden */}
      <div className="flex flex-col sm:flex-row gap-3 mt-3 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto…"
            className="w-full border border-slate-200 rounded-full py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-slate-200 rounded-full py-2.5 px-4 bg-white text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Chips de categorías */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setCategory('todas')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
              category === 'todas'
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'
            }`}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border capitalize transition ${
                category === c
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Resultados */}
      <p className="text-sm text-slate-400 mb-3">
        {visible.length} resultado{visible.length !== 1 && 's'}
        {search && ` para "${search}"`}
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} onAdd={handleAdd} />
        ))}
        {visible.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            <span className="text-4xl block mb-2">🐾</span>
            {products.length === 0
              ? 'No hay productos disponibles por el momento.'
              : 'Ningún producto coincide con tu búsqueda.'}
          </div>
        )}
      </div>
    </div>
  );
}
