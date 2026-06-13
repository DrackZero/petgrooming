export default function CourseCard({ course, onEnroll, enrolled }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="h-40 bg-slate-100 flex items-center justify-center">
        {course.image_url ? (
          <img src={course.image_url} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl">🎓</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold">{course.title}</h3>
        {course.starts_at && (
          <p className="text-xs text-slate-400">
            Inicio: {new Date(course.starts_at).toLocaleDateString('es-ES')}
          </p>
        )}
        <p className="text-sm text-slate-600 mt-1 flex-1">{course.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-bold text-brand-dark">${course.price}</span>
          <button
            onClick={() => onEnroll?.(course)}
            disabled={enrolled}
            className="text-sm px-3 py-1 rounded bg-brand text-white hover:bg-brand-dark disabled:bg-emerald-500"
          >
            {enrolled ? 'Inscrito ✓' : 'Inscribirme'}
          </button>
        </div>
      </div>
    </div>
  );
}
