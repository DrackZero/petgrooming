import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getActiveClinics } from '../api/clinics.js';
import Notification from '../components/Notification.jsx';

// Tipo de cuenta al registrarse.
const ACCOUNTS = [
  { value: 'cliente', label: '🐾 Cliente', desc: 'Dueño de mascota' },
  { value: 'veterinario', label: '🩺 Veterinario', desc: 'Quiero atender' },
  { value: 'gerente', label: '🏥 Veterinaria', desc: 'Registrar mi clínica' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState('cliente');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [clinic, setClinic] = useState({ name: '', address: '', phone: '' });
  const [vetClinicId, setVetClinicId] = useState('');
  const [activeClinics, setActiveClinics] = useState([]);
  const [error, setError] = useState('');

  // Al elegir "Veterinario" cargamos las clínicas activas para escoger una.
  useEffect(() => {
    if (account === 'veterinario' && activeClinics.length === 0) {
      getActiveClinics().then(setActiveClinics).catch(() => {});
    }
  }, [account, activeClinics.length]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      if (account === 'veterinario') { payload.wants_vet = true; payload.clinic_id = vetClinicId || null; }
      if (account === 'gerente') { payload.manage_clinic = true; payload.clinic = clinic; }
      const user = await register(payload);
      const home = { gerente: '/gerente', admin: '/admin', veterinario: '/vet/agenda' };
      navigate(home[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl border border-slate-100 shadow-md">
      <div className="text-center mb-5">
        <span className="inline-flex w-14 h-14 rounded-full bg-brand-50 items-center justify-center text-3xl">🐶</span>
        <h1 className="text-2xl font-extrabold text-brand-dark mt-2">Crear cuenta</h1>
        <p className="text-sm text-slate-400">Únete a la familia PetGrooming</p>
      </div>
      <Notification type="error" message={error} onClose={() => setError('')} />

      {/* Tipo de cuenta */}
      <div className="grid grid-cols-3 gap-2 my-4">
        {ACCOUNTS.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setAccount(a.value)}
            className={`rounded-xl border p-2 text-center transition ${
              account === a.value ? 'border-brand bg-brand-50' : 'border-slate-200 hover:border-brand-300'
            }`}
          >
            <span className="block text-sm font-semibold">{a.label}</span>
            <span className="block text-[11px] text-slate-400">{a.desc}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="name" placeholder="Nombre completo" required className="w-full border rounded p-2" value={form.name} onChange={handleChange} />
        <input name="email" type="email" placeholder="Email" required className="w-full border rounded p-2" value={form.email} onChange={handleChange} />
        <input name="phone" placeholder="Teléfono (opcional)" className="w-full border rounded p-2" value={form.phone} onChange={handleChange} />
        <input name="password" type="password" placeholder="Contraseña" required className="w-full border rounded p-2" value={form.password} onChange={handleChange} />

        {account === 'veterinario' && (
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <p className="text-sm font-semibold text-slate-700">¿En qué veterinaria atenderás?</p>
            <select value={vetClinicId} onChange={(e) => setVetClinicId(e.target.value)} required className="w-full border rounded p-2">
              <option value="">Selecciona una veterinaria…</option>
              {activeClinics.map((c) => (
                <option key={c.id} value={c.id}>🏥 {c.name}</option>
              ))}
            </select>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
              El gerente de esa veterinaria aprobará tu solicitud. Mientras tanto tendrás una cuenta de cliente.
            </p>
          </div>
        )}

        {account === 'gerente' && (
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <p className="text-sm font-semibold text-slate-700">Datos de tu veterinaria</p>
            <input placeholder="Nombre de la veterinaria" required className="w-full border rounded p-2"
              value={clinic.name} onChange={(e) => setClinic({ ...clinic, name: e.target.value })} />
            <input placeholder="Dirección (opcional)" className="w-full border rounded p-2"
              value={clinic.address} onChange={(e) => setClinic({ ...clinic, address: e.target.value })} />
            <input placeholder="Teléfono de la clínica (opcional)" className="w-full border rounded p-2"
              value={clinic.phone} onChange={(e) => setClinic({ ...clinic, phone: e.target.value })} />
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
              Tu veterinaria quedará pendiente de activación hasta confirmar la suscripción con la plataforma.
            </p>
          </div>
        )}

        <button className="w-full bg-brand text-white rounded-full py-2.5 font-semibold hover:bg-brand-dark transition">
          Registrarme
        </button>
      </form>
      <p className="text-sm text-slate-500 mt-3">
        ¿Ya tienes cuenta? <Link to="/login" className="text-brand-dark">Inicia sesión</Link>
      </p>
    </div>
  );
}
