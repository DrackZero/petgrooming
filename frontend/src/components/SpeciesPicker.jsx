import { useState } from 'react';

// Selector visual de especie: tarjetas con Perro y Gato, más "Otro"
// que revela un campo de texto. value/onChange manejan la especie final.
const OPTIONS = [
  { value: 'perro', label: 'Perro', emoji: '🐶' },
  { value: 'gato', label: 'Gato', emoji: '🐱' },
];

export default function SpeciesPicker({ value, onChange }) {
  // "Otro" está activo si hay un valor que no es perro/gato, o si el
  // usuario lo eligió explícitamente (aunque el texto siga vacío).
  const isPreset = value === 'perro' || value === 'gato';
  const [otherActive, setOtherActive] = useState(Boolean(value) && !isPreset);

  const pick = (v) => { setOtherActive(false); onChange(v); };
  const pickOther = () => { setOtherActive(true); onChange(''); };

  const cardClass = (active) =>
    `flex-1 flex flex-col items-center gap-1 rounded-xl border-2 py-3 transition ${
      active ? 'border-brand bg-brand-50' : 'border-slate-200 hover:border-brand-300'
    }`;

  return (
    <div>
      <div className="flex gap-2">
        {OPTIONS.map((o) => (
          <button key={o.value} type="button" onClick={() => pick(o.value)} className={cardClass(value === o.value)}>
            <span className="text-3xl">{o.emoji}</span>
            <span className="text-sm font-semibold">{o.label}</span>
          </button>
        ))}
        <button type="button" onClick={pickOther} className={cardClass(otherActive)}>
          <span className="text-3xl">✏️</span>
          <span className="text-sm font-semibold">Otro</span>
        </button>
      </div>

      {otherActive && (
        <input
          autoFocus
          placeholder="¿Qué especie es? (conejo, ave, hámster…)"
          className="mt-2 w-full border rounded p-2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
