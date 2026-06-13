import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // menú móvil

  const close = () => setOpen(false);

  const handleLogout = async () => {
    close();
    await logout();
    navigate('/login');
  };

  // Enlaces compartidos entre escritorio y móvil.
  const links = (
    <>
      <NavLink to="/" className={linkClass} end onClick={close}>Inicio</NavLink>
      <NavLink to="/courses" className={linkClass} onClick={close}>Cursos</NavLink>
      <NavLink to="/shop" className={linkClass} onClick={close}>Tienda</NavLink>

      {isAuthenticated && (
        <>
          <NavLink to="/pets" className={linkClass} onClick={close}>Mascotas</NavLink>
          <NavLink to="/appointments" className={linkClass} onClick={close}>Citas</NavLink>
          <NavLink to="/history" className={linkClass} onClick={close}>Historial</NavLink>
        </>
      )}

      {isAdmin && <NavLink to="/admin" className={linkClass} onClick={close}>Admin</NavLink>}

      <NavLink to="/cart" className={linkClass} onClick={close}>
        🛒{count > 0 && <span className="ml-1 text-xs bg-brand text-white rounded-full px-1.5">{count}</span>}
      </NavLink>

      {isAuthenticated ? (
        <>
          <NavLink to="/profile" className={linkClass} onClick={close}>
            {user?.name?.split(' ')[0] || 'Perfil'}
          </NavLink>
          <button onClick={handleLogout} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md text-left">
            Salir
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={linkClass} onClick={close}>Entrar</NavLink>
          <NavLink to="/register" className={linkClass} onClick={close}>Registro</NavLink>
        </>
      )}
    </>
  );

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="text-xl font-bold text-brand-dark" onClick={close}>
          🐾 PetGrooming
        </Link>

        {/* Menú de escritorio (oculto en móvil) */}
        <div className="hidden md:flex items-center gap-1">{links}</div>

        {/* Botón hamburguesa (solo móvil) */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
          aria-label="Abrir menú"
          aria-expanded={open}
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Menú desplegable móvil */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-1">
          {links}
        </div>
      )}
    </nav>
  );
}
