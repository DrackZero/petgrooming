// Barras verticales para una sola serie a lo largo del tiempo (ej. ingresos
// por mes). Una sola serie = un solo color, sin leyenda: el título la nombra.
// La rejilla es una línea fina que no compite con los datos, y el último
// valor va etiquetado directamente en vez de poner un número en cada barra.

export default function TrendBars({ data = [], formatValue = (v) => v, emptyText = 'Sin datos todavía.' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const hasData = data.some((d) => d.value > 0);

  if (!data.length) return <p className="text-sm text-slate-400 py-4">{emptyText}</p>;

  return (
    <div>
      <div className="relative h-36">
        {/* Rejilla: hairline sólido, un tono sobre el fondo */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2].map((i) => <div key={i} className="border-t border-slate-100" />)}
        </div>

        <div className="relative h-full flex items-end gap-2">
          {data.map((d, i) => {
            const h = hasData ? Math.max((d.value / max) * 100, 2) : 2;
            const isLast = i === data.length - 1;
            return (
              <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full group">
                {/* Etiqueta directa solo en el último periodo */}
                {isLast && d.value > 0 && (
                  <span className="text-[11px] font-bold text-brand-dark mb-1 whitespace-nowrap">
                    {formatValue(d.value)}
                  </span>
                )}
                <div
                  className="w-full rounded-t transition-all duration-500 ease-out group-hover:brightness-110"
                  style={{
                    height: `${h}%`,
                    backgroundColor: isLast ? '#2563eb' : '#93c5fd',
                  }}
                  title={`${d.label}: ${formatValue(d.value)}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Eje X */}
      <div className="flex gap-2 mt-2">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[11px] text-slate-400 capitalize truncate">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
