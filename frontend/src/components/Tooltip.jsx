// Ayuda contextual: muestra una burbuja informativa al pasar el mouse
// (o al enfocar con teclado) sobre el elemento envuelto.
// Uso: <Tooltip tip="Explicación corta"><button>…</button></Tooltip>
export default function Tooltip({ tip, side = 'bottom', className = '', children }) {
  if (!tip) return children;
  const pos = side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
  return (
    <span className={`relative inline-flex group/tt ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${pos} left-1/2 -translate-x-1/2 z-40 w-max max-w-[220px]
          rounded-lg bg-slate-800 px-2.5 py-1.5 text-center text-xs leading-snug text-white shadow-lg
          opacity-0 invisible transition-opacity duration-150 delay-300
          group-hover/tt:opacity-100 group-hover/tt:visible
          group-focus-within/tt:opacity-100 group-focus-within/tt:visible`}
      >
        {tip}
      </span>
    </span>
  );
}
