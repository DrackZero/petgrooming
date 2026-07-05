import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../api/orders.js';
import { useCart } from '../hooks/useCart.js';
import { useAuth } from '../hooks/useAuth.js';
import ProductCard from '../components/ProductCard.jsx';
import Notification from '../components/Notification.jsx';

export default function Shop() {
  const { addItem } = useCart();
  const { isClient, isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {});
  }, []);

  const handleAdd = (product) => {
    addItem(product);
    setMsg(`"${product.name}" añadido al carrito`);
  };

  return (
    <div>
      {/* Hero de bienvenida */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-50 via-brand-100 to-brand-50 border border-brand-100 px-6 py-10 sm:px-10 sm:py-14 mb-8">
        {/* Blobs decorativos */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-brand-200/50" aria-hidden="true" />
        <div className="absolute -bottom-10 right-24 w-24 h-24 rounded-full bg-accent/30" aria-hidden="true" />
        <div className="absolute top-6 right-40 w-4 h-4 rounded-full bg-brand-300/60 hidden sm:block" aria-hidden="true" />

        <div className="relative max-w-xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-900 leading-tight">
            Todo para tu mejor amigo 🐶🐱
          </h1>
          <p className="mt-3 text-slate-600">
            Peluquería, cuidado veterinario, cursos y los mejores productos para tu mascota — en un solo lugar.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {isClient || !isAuthenticated ? (
              <>
                <Link
                  to={isAuthenticated ? '/appointments' : '/login'}
                  className="px-5 py-2.5 rounded-full bg-brand text-white font-semibold shadow-sm hover:bg-brand-dark transition"
                >
                  Agendar cita
                </Link>
                <Link
                  to="/courses"
                  className="px-5 py-2.5 rounded-full bg-white text-brand-dark font-semibold border border-brand-200 hover:bg-brand-50 transition"
                >
                  Ver cursos
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <span className="absolute bottom-4 right-6 text-7xl sm:text-8xl select-none" aria-hidden="true">🐕</span>
      </section>

      <div className="flex items-center justify-between mb-4">
        <h2 className="page-title">Tienda</h2>
        <span className="text-sm text-slate-400">{products.length} producto{products.length !== 1 && 's'}</span>
      </div>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onAdd={handleAdd} />
        ))}
        {products.length === 0 && (
          <p className="text-slate-500 col-span-full">No hay productos disponibles por el momento.</p>
        )}
      </div>
    </div>
  );
}
