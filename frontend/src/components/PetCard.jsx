export default function PetCard({ pet, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{pet.name}</h3>
          <p className="text-sm text-slate-500">
            {pet.species}
            {pet.breed ? ` · ${pet.breed}` : ''}
            {pet.size ? ` · ${pet.size}` : ''}
          </p>
        </div>
        <span className="text-2xl">{pet.species?.toLowerCase() === 'gato' ? '🐱' : '🐶'}</span>
      </div>

      {pet.notes && <p className="mt-2 text-sm text-slate-600">{pet.notes}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onEdit?.(pet)}
          className="text-sm px-3 py-1 rounded bg-slate-100 hover:bg-slate-200"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete?.(pet)}
          className="text-sm px-3 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
