import { useState, useEffect, useMemo } from 'react';
import { getProducts } from '../api/orders.js';
import { useCart } from '../hooks/useCart.js';
import { formatCOP } from '../utils/format.js';
import ProductCard from '../components/ProductCard.jsx';
import Notification from '../components/Notification.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonCards } from '../components/Skeleton.jsx';

const SORTS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'precio_asc', label: 'Menor precio' },
  { value: 'precio_desc', label: 'Mayor precio' },
  { value: 'nombre', label: 'Nombre A-Z' },
];

const sinFiltros = { category: 'todas', clinic: 'todas', min: '', max: '', soloDisponibles: false };

// TIENDA: panel lateral de filtros + resultados, al estilo de un marketplace.
export default function Shop() {
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recientes');
  const [filtros, setFiltros] = useState(sinFiltros);
  const [verFiltros, setVerFiltros] = useState(false); // panel en móvil
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = (product) => {
    addItem(product);
    setMsg(`"${product.name}" añadido al carrito`);
  };

  // Categorías y clínicas presentes, con su conteo.
  const { categorias, clinicas, precioMax } = useMemo(() => {
    const cuenta = (campo) =>
      Object.entries(
        products.reduce((acc, p) => {
          const k = p[campo];
          if (k) acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1]);
    return {
      categorias: cuenta('category'),
      clinicas: cuenta('clinic_name'),
      precioMax: Math.max(0, ...products.map((p) => Number(p.price))),
    };
  }, [products]);

  // Búsqueda + filtros + orden.
  const visible = useMemo(() => {
    let list = products;

    if (filtros.category !== 'todas') list = list.filter((p) => p.category === filtros.category);
    if (filtros.clinic !== 'todas') list = list.filter((p) => p.clinic_name === filtros.clinic);
    if (filtros.soloDisponibles) list = list.filter((p) => p.stock > 0);
    if (filtros.min !== '') list = list.filter((p) => Number(p.price) >= Number(filtros.min));
    if (filtros.max !== '') list = list.filter((p) => Number(p.price) <= Number(filtros.max));

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sort === 'precio_asc') sorted.sort((a, b) => a.price - b.price);
    if (sort === 'precio_desc') sorted.sort((a, b) => b.price - a.price);
    if (sort === 'nombre') sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return sorted;
  }, [products, filtros, search, sort]);

  const activos =
    (filtros.category !== 'todas' ? 1 : 0) +
    (filtros.clinic !== 'todas' ? 1 : 0) +
    (filtros.soloDisponibles ? 1 : 0) +
    (filtros.min !== '' || filtros.max !== '' ? 1 : 0);

  const limpiar = () => { setFiltros(sinFiltros); setSearch(''); };

  // Panel de filtros (se reutiliza en escritorio y móvil).
  const Filtros = () => (
    <div className="space-y-6">
      <Grupo titulo="Categoría">
        <Opcion
          activo={filtros.category === 'todas'}
          onClick={() => setFiltros({ ...filtros, category: 'todas' })}
          label="Todas" cuenta={products.length}
        />
        {categorias.map(([c, n]) => (
          <Opcion
            key={c} activo={filtros.category === c}
            onClick={() => setFiltros({ ...filtros, category: c })}
            label={c} cuenta={n}
          />
        ))}
      </Grupo>

      {clinicas.length > 1 && (
        <Grupo titulo="Veterinaria">
          <Opcion
            activo={filtros.clinic === 'todas'}
            onClick={() => setFiltros({ ...filtros, clinic: 'todas' })}
            label="Todas" cuenta={products.length}
          />
          {clinicas.map(([c, n]) => (
            <Opcion
              key={c} activo={filtros.clinic === c}
              onClick={() => setFiltros({ ...filtros, clinic: c })}
              label={c} cuenta={n}
            />
          ))}
        </Grupo>
      )}

      <Grupo titulo="Precio">
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" placeholder="Mínimo"
            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
            value={filtros.min} onChange={(e) => setFiltros({ ...filtros, min: e.target.value })}
          />
          <span className="text-slate-300">–</span>
          <input
            type="number" min="0" placeholder="Máximo"
            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
            value={filtros.max} onChange={(e) => setFiltros({ ...filtros, max: e.target.value })}
          />
        </div>
        {precioMax > 0 && (
          <p className="text-xs text-slate-400 mt-1.5">
            El más caro del catálogo: {formatCOP(precioMax)}
          </p>
        )}
      </Grupo>

      <Grupo titulo="Disponibilidad">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox" className="rounded border-slate-300"
            checked={filtros.soloDisponibles}
            onChange={(e) => setFiltros({ ...filtros, soloDisponibles: e.target.checked })}
          />
          Solo productos en stock
        </label>
      </Grupo>

      {activos > 0 && (
        <button onClick={limpiar} className="text-sm text-brand-dark font-semibold hover:underline">
          Limpiar filtros ({activos})
        </button>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="page-title mb-1">Tienda</h1>
      <p className="text-sm text-slate-500 mb-5">
        Alimento, juguetes, higiene y accesorios para tu mascota.
      </p>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      {/* Búsqueda y orden */}
      <div className="flex flex-col sm:flex-row gap-3 mt-3 mb-5">
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
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button
          onClick={() => setVerFiltros((v) => !v)}
          className="lg:hidden border border-slate-200 rounded-full py-2.5 px-4 text-sm font-semibold text-slate-600"
        >
          ⚙️ Filtros{activos > 0 && ` (${activos})`}
        </button>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6 items-start">
        {/* Panel lateral */}
        <aside className={`bg-white border border-slate-200 rounded-2xl p-5 ${verFiltros ? '' : 'hidden lg:block'}`}>
          <Filtros />
        </aside>

        {/* Resultados */}
        <div>
          {loading ? (
            <SkeletonCards count={6} />
          ) : visible.length === 0 ? (
            products.length === 0 ? (
              <EmptyState
                icon="🛍️"
                title="La tienda está vacía por ahora"
                description="Todavía no hay veterinarias con tienda en línea activa. Vuelve pronto: aquí aparecerán alimento, juguetes y accesorios."
                action={{ to: '/', label: 'Volver al inicio' }}
              />
            ) : (
              <EmptyState
                icon="🔍"
                title="Ningún producto coincide"
                description="Prueba con otra palabra o quita algunos filtros para ver más resultados."
                action={{ onClick: limpiar, label: 'Limpiar todo' }}
              />
            )
          ) : (
            <>
              <p className="text-sm text-slate-400 mb-3">
                {visible.length} resultado{visible.length !== 1 && 's'}
                {search && ` para "${search}"`}
              </p>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {visible.map((p) => (
                  <ProductCard key={p.id} product={p} onAdd={handleAdd} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Grupo({ titulo, children }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{titulo}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Opcion({ activo, onClick, label, cuenta }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 text-left text-sm rounded-lg px-2 py-1.5 transition ${
        activo ? 'bg-brand-50 text-brand-dark font-semibold' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <span className="capitalize truncate">{label}</span>
      <span className="text-xs text-slate-400 tabular-nums shrink-0">{cuenta}</span>
    </button>
  );
}
