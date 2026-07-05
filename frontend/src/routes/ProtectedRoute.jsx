import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

// Bloquea rutas según sesión y rol.
// Uso: <ProtectedRoute roles={['veterinario']}><VetAgenda/></ProtectedRoute>
// Sin "roles" solo exige sesión activa.
export default function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
