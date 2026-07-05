import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-100 bg-brand-50/50">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-3 text-sm">
        <div>
          <p className="flex items-center gap-2 font-extrabold text-brand-dark text-lg">
            <span className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center">🐾</span>
            PetGrooming
          </p>
          <p className="mt-2 text-slate-500">
            Cuidamos a tu mejor amigo: peluquería, veterinaria, cursos y tienda.
          </p>
        </div>

        <div>
          <p className="font-bold text-slate-700 mb-2">Servicios</p>
          <ul className="space-y-1 text-slate-500">
            <li><Link to="/appointments" className="hover:text-brand-dark">Citas veterinarias</Link></li>
            <li><Link to="/courses" className="hover:text-brand-dark">Cursos</Link></li>
            <li><Link to="/shop" className="hover:text-brand-dark">Tienda</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-bold text-slate-700 mb-2">Contacto</p>
          <ul className="space-y-1 text-slate-500">
            <li>📍 Yopal, Casanare</li>
            <li>✉️ contacto@petgrooming.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} PetGrooming · Hecho con 💙 para las mascotas
      </div>
    </footer>
  );
}
