import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordReq } from '../api/auth.js';
import Notification from '../components/Notification.jsx';

// Llega desde el enlace del correo (/reset-password?token=...).
// Pide la nueva contraseña dos veces y la cambia.
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      return setError('Las contraseñas no coinciden');
    }
    setLoading(true);
    try {
      await resetPasswordReq(token, password);
      setOk(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'No fue posible cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  // Sin token en la URL no hay nada que hacer.
  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl border border-slate-100 shadow-md text-center">
        <span className="text-5xl">⚠️</span>
        <h1 className="text-xl font-extrabold text-brand-dark mt-3">Enlace incompleto</h1>
        <p className="text-sm text-slate-500 mt-2">
          Este enlace no es válido. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".
        </p>
        <Link to="/forgot-password" className="inline-block mt-5 text-brand-dark font-semibold hover:underline">
          Solicitar un enlace nuevo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl border border-slate-100 shadow-md">
      <div className="text-center mb-5">
        <span className="inline-flex w-14 h-14 rounded-full bg-brand-50 items-center justify-center text-3xl">🔒</span>
        <h1 className="text-2xl font-extrabold text-brand-dark mt-2">Nueva contraseña</h1>
        <p className="text-sm text-slate-400 mt-1">Crea tu nueva contraseña (mínimo 6 caracteres).</p>
      </div>

      <Notification type="error" message={error} onClose={() => setError('')} />

      {ok ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm text-center">
          ✅ ¡Contraseña actualizada! Te llevamos a iniciar sesión…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password" placeholder="Nueva contraseña" required minLength={6} autoFocus
            className="w-full border rounded p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password" placeholder="Repite la contraseña" required minLength={6}
            className="w-full border rounded p-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            disabled={loading}
            className="w-full bg-brand text-white rounded-full py-2.5 font-semibold hover:bg-brand-dark disabled:bg-slate-300 transition"
          >
            {loading ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      )}
    </div>
  );
}
