import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

// Hook de acceso al contexto de autenticación.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
