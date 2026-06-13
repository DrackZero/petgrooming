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
    <div className="max-w-sm mx-auto mt-10 bg-white p-6 rounded-lg border border-slate-200">
      <h1 className="text-2xl font-bold mb-4">Crear cuenta</h1>
      <Notification type="error" message={error} onClose={() => setError('')} />
      <form onSubmit={handleSubmit} className="space-y-3 mt-3">
        <input name="name" placeholder="Nombre completo" required className="w-full border rounded p-2" value={form.name} onChange={handleChange} />
        <input name="email" type="email" placeholder="Email" required className="w-full border rounded p-2" value={form.email} onChange={handleChange} />
        <input name="phone" placeholder="Teléfono (opcional)" className="w-full border rounded p-2" value={form.phone} onChange={handleChange} />
        <input name="password" type="password" placeholder="Contraseña" required className="w-full border rounded p-2" value={form.password} onChange={handleChange} />
        <button className="w-full bg-brand text-white rounded py-2 hover:bg-brand-dark">Registrarme</button>
      </form>
      <p className="text-sm text-slate-500 mt-3">
        ¿Ya tienes cuenta? <Link to="/login" className="text-brand-dark">Inicia sesión</Link>
      </p>
    </div>
  );
}
