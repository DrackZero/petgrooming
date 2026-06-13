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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="text-xl font-bold text-brand-dark">
          🐾 PetGrooming
        </Link>

        <div className="flex items-center gap-1">
          <NavLink to="/" className={linkClass} end>Inicio</NavLink>
          <NavLink to="/courses" className={linkClass}>Cursos</NavLink>
          <NavLink to="/shop" className={linkClass}>Tienda</NavLink>

          {isAuthenticated && (
            <>
              <NavLink to="/pets" className={linkClass}>Mascotas</NavLink>
              <NavLink to="/appointments" className={linkClass}>Citas</NavLink>
              <NavLink to="/history" className={linkClass}>Historial</NavLink>
            </>
          )}

          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>Admin</NavLink>
          )}

          <NavLink to="/cart" className={linkClass}>
            🛒{count > 0 && <span className="ml-1 text-xs bg-brand text-white rounded-full px-1.5">{count}</span>}
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink to="/profile" className={linkClass}>{user?.name?.split(' ')[0] || 'Perfil'}</NavLink>
              <button onClick={handleLogout} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">
                Salir
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>Entrar</NavLink>
              <NavLink to="/register" className={linkClass}>Registro</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
