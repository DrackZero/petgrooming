import { createContext, useState, useEffect, useCallback } from 'react';
import { loginReq, logoutReq, registerReq, meReq } from '../api/auth.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al cargar, intenta recuperar la sesión vía cookie httpOnly.
  useEffect(() => {
    meReq()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await loginReq(credentials);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await registerReq(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await logoutReq();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
