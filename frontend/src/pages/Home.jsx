import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../api/orders.js';
import { useCart } from '../hooks/useCart.js';
import { useAuth } from '../hooks/useAuth.js';
import ProductCard from '../components/ProductCard.jsx';
import Notification from '../components/Notification.jsx';

const services = [
  {
    icon: '📅',
    title: 'Citas veterinarias',
    text: 'Reserva el horario que prefieras y nosotros cuidamos a tu mascota.',
    to: '/appointments',
    cta: 'Agendar',
  },
  {
    icon: '🎓',
    title: 'Cursos',
    text: 'Aprende sobre el cuidado, adiestramiento y bienestar de tu compañero.',
    to: '/courses',
    cta: 'Ver cursos',
  },
  {
    icon: '🛍️',
    title: 'Tienda',
    text: 'Alimento, juguetes y accesorios seleccionados para consentirlos.',
    to: '/shop',
    cta: 'Ir a la tienda',
  },
];

// Página de INICIO: bienvenida, servicios y productos destacados.
export default function Home() {
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

  const featured = products.slice(0, 4);

  return (
    <div>
      {/* Hero de bienvenida */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-50 via-brand-100 to-brand-50 border border-brand-100 px-6 py-10 sm:px-10 sm:py-14 mb-10">
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
            {(isClient || !isAuthenticated) && (
              <>
                <Link
                  to={isAuthenticated ? '/appointments' : '/login'}
                  className="px-5 py-2.5 rounded-full bg-brand text-white font-semibold shadow-sm hover:bg-brand-dark transition"
                >
                  Agendar cita
                </Link>
                <Link
                  to="/shop"
                  className="px-5 py-2.5 rounded-full bg-white text-brand-dark font-semibold border border-brand-200 hover:bg-brand-50 transition"
                >
                  Explorar la tienda
                </Link>
              </>
            )}
          </div>
        </div>

        <span className="absolute bottom-4 right-6 text-7xl sm:text-8xl select-none" aria-hidden="true">🐕</span>
      </section>

      {/* Qué ofrecemos */}
      <section className="mb-10">
        <h2 className="page-title mb-4">¿Qué ofrecemos?</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {services.map((s) => (
            <div key={s.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-lg transition">
              <span className="text-4xl">{s.icon}</span>
              <h3 className="font-bold text-slate-800 mt-3">{s.title}</h3>
              <p className="text-sm text-slate-500 mt-1 flex-1">{s.text}</p>
              <Link to={s.to} className="mt-4 self-start text-sm font-semibold text-brand-dark hover:underline">
                {s.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Productos destacados */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="page-title">Productos destacados</h2>
          <Link to="/shop" className="text-sm font-semibold text-brand-dark hover:underline">
            Ver toda la tienda →
          </Link>
        </div>
        <Notification type="success" message={msg} onClose={() => setMsg('')} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={handleAdd} />
          ))}
          {featured.length === 0 && (
            <p className="text-slate-500 col-span-full">Pronto tendremos productos disponibles. 🐾</p>
          )}
        </div>
      </section>
    </div>
  );
}
