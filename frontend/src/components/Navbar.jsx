import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';
import Tooltip from './Tooltip.jsx';

const linkClass = ({ isActive }) =>
  `max-md:w-full px-3 py-2 rounded-full text-sm font-semibold transition ${
    isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-dark'
  }`;

// Envuelve un enlace del menú con su ayuda contextual.
const NavTip = ({ tip, children }) => (
  <Tooltip tip={tip} className="max-md:w-full">{children}</Tooltip>
);

export default function Navbar() {
  const { isAuthenticated, isAdmin, isVet, isClient, isManager, user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // menú móvil

  const close = () => setOpen(false);

  const handleLogout = async () => {
    close();
    await logout();
    navigate('/login');
  };

  // Enlaces según el rol del usuario.
  const links = (
    <>
      {/* Público / cliente */}
      {(!isAuthenticated || isClient) && (
        <>
          <NavTip tip="Página principal y productos destacados">
            <NavLink to="/" className={linkClass} end onClick={close}>Inicio</NavLink>
          </NavTip>
          <NavTip tip="Cursos sobre el cuidado de tu mascota">
            <NavLink to="/courses" className={linkClass} onClick={close}>Cursos</NavLink>
          </NavTip>
          <NavTip tip="Alimento, juguetes, higiene y accesorios">
            <NavLink to="/shop" className={linkClass} onClick={close}>Tienda</NavLink>
          </NavTip>
        </>
      )}

      {isClient && (
        <>
          <NavTip tip="Consulta tus mascotas y su historial clínico">
            <NavLink to="/pets" className={linkClass} onClick={close}>Mis mascotas</NavLink>
          </NavTip>
          <NavTip tip="Agenda una cita con el veterinario que prefieras">
            <NavLink to="/appointments" className={linkClass} onClick={close}>Citas</NavLink>
          </NavTip>
          <NavTip tip="Tus pedidos e inscripciones a cursos">
            <NavLink to="/history" className={linkClass} onClick={close}>Historial</NavLink>
          </NavTip>
          <NavTip tip="Chat de emergencia en vivo con un veterinario">
            <NavLink to="/chat" className={linkClass} onClick={close}>🚨 Urgencias</NavLink>
          </NavTip>
        </>
      )}

      {/* Veterinario */}
      {isVet && (
        <>
          <NavTip tip="Calendario mensual y citas del día">
            <NavLink to="/vet/agenda" className={linkClass} onClick={close}>Agenda</NavLink>
          </NavTip>
          <NavTip tip="Registra mascotas, vacunas e historial clínico">
            <NavLink to="/vet/pets" className={linkClass} onClick={close}>Mascotas</NavLink>
          </NavTip>
          <NavTip tip="Define tu jornada laboral y franjas de atención">
            <NavLink to="/vet/slots" className={linkClass} onClick={close}>Horarios</NavLink>
          </NavTip>
          <NavTip tip="Emergencias de tus clientes en tiempo real">
            <NavLink to="/chat" className={linkClass} onClick={close}>🚨 Urgencias</NavLink>
          </NavTip>
        </>
      )}

      {/* Gerente de clínica */}
      {isManager && (
        <>
          <NavTip tip="Estado y suscripción de tu veterinaria">
            <NavLink to="/gerente" className={linkClass} onClick={close} end>Mi veterinaria</NavLink>
          </NavTip>
          <NavTip tip="Aprueba y gestiona a tus veterinarios">
            <NavLink to="/gerente/vets" className={linkClass} onClick={close}>Veterinarios</NavLink>
          </NavTip>
          <NavTip tip="Citas y actividad de tu clínica">
            <NavLink to="/gerente/reports" className={linkClass} onClick={close}>Reportes</NavLink>
          </NavTip>
        </>
      )}

      {/* Administrador de plataforma */}
      {isAdmin && (
        <NavTip tip="Panel de administración de la plataforma">
          <NavLink to="/admin" className={linkClass} onClick={close}>Admin</NavLink>
        </NavTip>
      )}

      {(!isAuthenticated || isClient) && (
        <NavTip tip="Carrito de compras">
          <NavLink to="/cart" className={linkClass} onClick={close}>
            🛒{count > 0 && <span className="ml-1 text-xs bg-brand text-white rounded-full px-1.5">{count}</span>}
          </NavLink>
        </NavTip>
      )}

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
    <nav className="bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold text-brand-dark" onClick={close}>
          <span className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center text-lg shadow-sm">🐾</span>
          PetGrooming
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
