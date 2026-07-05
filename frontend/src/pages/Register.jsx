import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Notification from '../components/Notification.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse');
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10 bg-white p-8 rounded-2xl border border-slate-100 shadow-md">
      <div className="text-center mb-5">
        <span className="inline-flex w-14 h-14 rounded-full bg-brand-50 items-center justify-center text-3xl">🐶</span>
        <h1 className="text-2xl font-extrabold text-brand-dark mt-2">Crear cuenta</h1>
        <p className="text-sm text-slate-400">Únete a la familia PetGrooming</p>
      </div>
      <Notification type="error" message={error} onClose={() => setError('')} />
      <form onSubmit={handleSubmit} className="space-y-3 mt-3">
        <input name="name" placeholder="Nombre completo" required className="w-full border rounded p-2" value={form.name} onChange={handleChange} />
        <input name="email" type="email" placeholder="Email" required className="w-full border rounded p-2" value={form.email} onChange={handleChange} />
        <input name="phone" placeholder="Teléfono (opcional)" className="w-full border rounded p-2" value={form.phone} onChange={handleChange} />
        <input name="password" type="password" placeholder="Contraseña" required className="w-full border rounded p-2" value={form.password} onChange={handleChange} />
        <button className="w-full bg-brand text-white rounded-full py-2.5 font-semibold hover:bg-brand-dark transition">Registrarme</button>
      </form>
      <p className="text-sm text-slate-500 mt-3">
        ¿Ya tienes cuenta? <Link to="/login" className="text-brand-dark">Inicia sesión</Link>
      </p>
    </div>
  );
}
