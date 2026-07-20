import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordReq } from '../api/auth.js';
import Notification from '../components/Notification.jsx';

// El usuario escribe su email y recibe un enlace de restablecimiento.
// La respuesta es siempre la misma, exista o no la cuenta.
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPasswordReq(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'No fue posible enviar el correo. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl border border-slate-100 shadow-md">
      <div className="text-center mb-5">
        <span className="inline-flex w-14 h-14 rounded-full bg-brand-50 items-center justify-center text-3xl">🔑</span>
        <h1 className="text-2xl font-extrabold text-brand-dark mt-2">¿Olvidaste tu contraseña?</h1>
        <p className="text-sm text-slate-400 mt-1">
          Escribe tu email y te enviaremos un enlace para crear una nueva.
        </p>
      </div>

      <Notification type="error" message={error} onClose={() => setError('')} />

      {sent ? (
        <div className="text-center">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm">
            📬 Si el correo <strong>{email}</strong> está registrado, te enviamos un enlace
            para restablecer tu contraseña. Revisa tu bandeja de entrada (y el spam).
            El enlace vence en 1 hora.
          </div>
          <Link to="/login" className="inline-block mt-5 text-brand-dark font-semibold hover:underline">
            ← Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email" placeholder="Tu email" required autoFocus
              className="w-full border rounded p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              disabled={loading}
              className="w-full bg-brand text-white rounded-full py-2.5 font-semibold hover:bg-brand-dark disabled:bg-slate-300 transition"
            >
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
          </form>
          <Link to="/login" className="block text-center text-sm text-slate-500 hover:underline mt-4">
            ← Volver a iniciar sesión
          </Link>
        </>
      )}
    </div>
  );
}
