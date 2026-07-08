import { useEffect } from 'react';

// Visor de imagen a pantalla completa (lightbox).
// Cierra con clic en el fondo, la ✕ o la tecla Escape.
export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Cerrar imagen"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-slate-700 text-lg font-bold hover:bg-white transition"
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      {alt && (
        <p className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm px-4">
          {alt}
        </p>
      )}
    </div>
  );
}
