import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Notification from '../components/Notification.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(form);
      const home = { admin: '/admin', veterinario: '/vet/agenda' };
      navigate(home[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10 bg-white p-8 rounded-2xl border border-slate-100 shadow-md">
      <div className="text-center mb-5">
        <span className="inline-flex w-14 h-14 rounded-full bg-brand-50 items-center justify-center text-3xl">🐾</span>
        <h1 className="text-2xl font-extrabold text-brand-dark mt-2">Iniciar sesión</h1>
        <p className="text-sm text-slate-400">¡Qué bueno verte de nuevo!</p>
      </div>
      <Notification type="error" message={error} onClose={() => setError('')} />
      <form onSubmit={handleSubmit} className="space-y-3 mt-3">
        <input
          type="email" placeholder="Email" required
          className="w-full border rounded p-2"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password" placeholder="Contraseña" required
          className="w-full border rounded p-2"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button className="w-full bg-brand text-white rounded-full py-2.5 font-semibold hover:bg-brand-dark transition">Entrar</button>
      </form>
      <p className="text-sm text-slate-500 mt-3">
        ¿No tienes cuenta? <Link to="/register" className="text-brand-dark">Regístrate</Link>
      </p>
    </div>
  );
}
