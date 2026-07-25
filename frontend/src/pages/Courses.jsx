import { useState, useEffect } from 'react';
import { getCourses, getMyEnrollments, enrollCourse } from '../api/courses.js';
import { useAuth } from '../hooks/useAuth.js';
import CourseCard from '../components/CourseCard.jsx';
import Notification from '../components/Notification.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonCards } from '../components/Skeleton.jsx';

export default function Courses() {
  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCourses().then(setCourses).catch(() => {}).finally(() => setLoading(false));
    if (isAuthenticated) {
      getMyEnrollments()
        .then((rows) => setEnrolledIds(rows.map((e) => e.course_id)))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleEnroll = async (course) => {
    try {
      await enrollCourse(course.id);
      setEnrolledIds((prev) => [...prev, course.id]);
      setMsg(`Te inscribiste en "${course.title}"`);
    } catch (err) {
      setMsg(err.response?.data?.message || 'No fue posible inscribirte');
    }
  };

  return (
    <div>
      <h1 className="page-title mb-1">Cursos</h1>
      <p className="text-sm text-slate-500 mb-4">
        Aprende sobre el cuidado, adiestramiento y bienestar de tu compañero.
      </p>
      <Notification type="info" message={msg} onClose={() => setMsg('')} />

      {loading ? (
        <SkeletonCards count={3} className="mt-4" />
      ) : courses.length === 0 ? (
        <EmptyState
          icon="🎓"
          title="Todavía no hay cursos disponibles"
          description="Las veterinarias con plan Pro publican aquí sus cursos de cuidado y adiestramiento. Vuelve pronto."
          action={{ to: '/', label: 'Volver al inicio' }}
          className="mt-4"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} enrolled={enrolledIds.includes(c.id)} onEnroll={handleEnroll} />
          ))}
        </div>
      )}
    </div>
  );
}
