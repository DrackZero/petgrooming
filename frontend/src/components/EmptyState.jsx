import { Link } from 'react-router-dom';

// Estado vacío: en vez de "Sin datos", explica qué pasa y qué hacer.
// action puede ser un enlace ({ to, label }) o un botón ({ onClick, label }).
export default function EmptyState({ icon = '🐾', title, description, action, className = '' }) {
  return (
    <div className={`text-center py-10 px-6 bg-white border border-dashed border-slate-200 rounded-2xl ${className}`}>
      <span className="inline-flex w-16 h-16 rounded-full bg-brand-50 items-center justify-center text-3xl">
        {icon}
      </span>
      <h3 className="mt-3 font-bold text-slate-800">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{description}</p>}

      {action?.to && (
        <Link
          to={action.to}
          className="inline-block mt-4 bg-brand text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-brand-dark transition"
        >
          {action.label}
        </Link>
      )}
      {action?.onClick && (
        <button
          onClick={action.onClick}
          className="mt-4 bg-brand text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-brand-dark transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
