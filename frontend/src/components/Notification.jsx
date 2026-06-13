// Aviso simple reutilizable (success | error | info).
export default function Notification({ type = 'info', message, onClose }) {
  if (!message) return null;

  const styles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return (
    <div className={`border rounded-md px-4 py-3 flex items-center justify-between ${styles[type]}`}>
      <span className="text-sm">{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-4 text-lg leading-none opacity-60 hover:opacity-100">
          ×
        </button>
      )}
    </div>
  );
}
