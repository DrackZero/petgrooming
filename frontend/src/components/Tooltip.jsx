import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Ayuda contextual al pasar el mouse (o enfocar con teclado).
// La burbuja se renderiza con un portal en <body> y posición fija:
// así no la recortan los contenedores con overflow (tablas) ni los
// transforms de las tarjetas, y se ajusta a los bordes de la pantalla.
// Uso: <Tooltip tip="Explicación corta"><button>…</button></Tooltip>
export default function Tooltip({ tip, side = 'bottom', className = '', children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const bubbleRef = useRef(null);
  const timer = useRef(null);

  const show = () => { timer.current = setTimeout(() => setOpen(true), 250); };
  const hide = () => { clearTimeout(timer.current); setOpen(false); setPos(null); };

  // Posiciona la burbuja junto al elemento, sin salirse del viewport.
  useLayoutEffect(() => {
    if (!open || !wrapRef.current || !bubbleRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const b = bubbleRef.current.getBoundingClientRect();

    let left = r.left + r.width / 2 - b.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - b.width - 8));

    let top = side === 'top' ? r.top - b.height - 8 : r.bottom + 8;
    if (top < 8) top = r.bottom + 8; // no cabe arriba → abajo
    if (top + b.height > window.innerHeight - 8) top = r.top - b.height - 8; // no cabe abajo → arriba

    setPos({ left, top });
  }, [open, side]);

  // Al hacer scroll o redimensionar, ocultar (la posición fija quedaría desfasada).
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!tip) return children;

  return (
    <span
      ref={wrapRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && createPortal(
        <span
          ref={bubbleRef}
          role="tooltip"
          style={{ position: 'fixed', left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
          className="pointer-events-none z-50 w-max max-w-[220px] rounded-lg bg-slate-800 px-2.5 py-1.5 text-center text-xs leading-snug text-white shadow-lg"
        >
          {tip}
        </span>,
        document.body
      )}
    </span>
  );
}
