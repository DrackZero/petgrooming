import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Diálogo de confirmación propio, en reemplazo del confirm() del navegador.
// Se renderiza con un Portal en <body> por la misma razón que el lightbox:
// dentro de una tarjeta con transform, el position:fixed se rompería.
//
// Cancela con Escape, con clic en el fondo o con el botón Cancelar.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    // Evita que el fondo se desplace mientras el diálogo está abierto.
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previo;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-titulo"
        aria-describedby={message ? 'confirm-mensaje' : undefined}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className={`inline-flex w-11 h-11 shrink-0 rounded-full items-center justify-center text-xl ${
              danger ? 'bg-red-50' : 'bg-brand-50'
            }`}
          >
            {danger ? '⚠️' : '❓'}
          </span>
          <div className="min-w-0">
            <h2 id="confirm-titulo" className="font-bold text-slate-800 text-lg">
              {title}
            </h2>
            {message && (
              <p id="confirm-mensaje" className="text-sm text-slate-500 mt-1">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-5 py-2 rounded-full text-sm font-bold text-white transition ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
