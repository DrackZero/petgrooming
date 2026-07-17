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
    <div className="max-w-4xl mx-auto mt-8 grid md:grid-cols-2 gap-6 items-stretch">
      {/* Formulario de inicio de sesión */}
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-md flex flex-col justify-center">
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
          <button className="w-full bg-brand text-white rounded-full py-2.5 font-semibold hover:bg-brand-dark transition">
            Entrar
          </button>
        </form>
      </div>

      {/* Anuncio: invitación a registrarse */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 text-white p-8 flex flex-col justify-center">
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-white/10" aria-hidden="true" />
        <span className="absolute bottom-3 right-4 text-6xl opacity-30 select-none" aria-hidden="true">🐶</span>

        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-200">
            ¿No estás registrado?
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight mt-1">
            Crea tu cuenta gratis y consiente a tu mascota
          </h2>
          <ul className="mt-4 space-y-1.5 text-sm text-brand-100">
            <li>✓ Agenda citas con el veterinario que prefieras</li>
            <li>✓ Consulta el historial clínico y las vacunas</li>
            <li>✓ Compra en la tienda y accede a cursos</li>
          </ul>
          <Link
            to="/register"
            className="mt-6 inline-block bg-white text-brand-dark text-lg font-extrabold px-8 py-3 rounded-full shadow-lg hover:bg-brand-50 hover:scale-105 transition"
          >
            Regístrate ahora
          </Link>
          <p className="mt-3 text-xs text-brand-200">Solo te toma un minuto.</p>
        </div>
      </div>
    </div>
  );
}
