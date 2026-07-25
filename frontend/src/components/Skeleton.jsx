// Esqueletos de carga: ocupan el sitio del contenido mientras llega,
// en vez de un "Cargando…" que hace saltar el diseño.

export function Skeleton({ className = '' }) {
  return <div className={`bg-slate-100 rounded-lg animate-pulse ${className}`} />;
}

// Varias líneas de texto simuladas.
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

// Tarjetas en rejilla (tienda, cursos, accesos).
export function SkeletonCards({ count = 3, className = '' }) {
  return (
    <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
          <Skeleton className="h-32 w-full mb-3" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

// Filas de tabla.
export function SkeletonRows({ rows = 4, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default Skeleton;
