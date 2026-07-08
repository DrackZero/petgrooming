import { useState } from 'react';
import { formatCOP } from '../utils/format.js';
import ImageLightbox from './ImageLightbox.jsx';

export default function CourseCard({ course, onEnroll, enrolled }) {
  const [showFull, setShowFull] = useState(false);

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition flex flex-col">
      <div
        className={`h-44 bg-brand-50 flex items-center justify-center overflow-hidden ${course.image_url ? 'cursor-zoom-in' : ''}`}
        onClick={() => course.image_url && setShowFull(true)}
        title={course.image_url ? 'Ver imagen completa' : undefined}
      >
        {course.image_url ? (
          <img
            src={course.image_url}
            alt={course.title}
            className="h-full w-full object-cover group-hover:scale-105 transition"
          />
        ) : (
          <span className="text-5xl">🎓</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-800">{course.title}</h3>
        <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
          {course.duration && <span className="bg-slate-50 rounded-full px-2 py-0.5">⏱ {course.duration}</span>}
          {course.starts_at && (
            <span className="bg-slate-50 rounded-full px-2 py-0.5">
              📅 {new Date(course.starts_at).toLocaleDateString('es-ES')}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-2 flex-1 line-clamp-2">{course.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-extrabold text-brand-dark">{formatCOP(course.price)}</span>
          <button
            onClick={() => onEnroll?.(course)}
            disabled={enrolled}
            className="text-sm font-semibold px-4 py-1.5 rounded-full bg-brand text-white hover:bg-brand-dark disabled:bg-emerald-500 transition"
          >
            {enrolled ? 'Inscrito ✓' : 'Inscribirme'}
          </button>
        </div>
      </div>

      {showFull && (
        <ImageLightbox src={course.image_url} alt={course.title} onClose={() => setShowFull(false)} />
      )}
    </div>
  );
}
