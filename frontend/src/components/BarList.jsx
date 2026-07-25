// Barras horizontales con etiqueta y valor visibles.
// Se usa para categorías (estados de cita, planes). Cada barra lleva su
// etiqueta de texto: el color nunca es el único indicador, porque ámbar y
// verde quedan demasiado cerca para quien tiene daltonismo protan.

export default function BarList({ data = [], emptyText = 'Sin datos todavía.', formatValue }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data.length || total === 0) {
    return <p className="text-sm text-slate-400 py-4">{emptyText}</p>;
  }

  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        const shown = formatValue ? formatValue(d.value) : d.value;
        return (
          <li key={d.label}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-sm text-slate-600 capitalize">{d.label}</span>
              <span className="text-sm font-bold text-slate-800 tabular-nums">{shown}</span>
            </div>
            {/* Riel de fondo + barra fina con extremo redondeado */}
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: d.color || '#2563eb' }}
                title={`${d.label}: ${shown}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
