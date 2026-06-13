import { useState, useEffect } from 'react';
import { getCourses, getMyEnrollments, enrollCourse } from '../api/courses.js';
import { useAuth } from '../hooks/useAuth.js';
import CourseCard from '../components/CourseCard.jsx';
import Notification from '../components/Notification.jsx';

export default function Courses() {
  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getCourses().then(setCourses).catch(() => {});
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
      <h1 className="text-2xl font-bold mb-4">Cursos</h1>
      <Notification type="info" message={msg} onClose={() => setMsg('')} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} enrolled={enrolledIds.includes(c.id)} onEnroll={handleEnroll} />
        ))}
        {courses.length === 0 && <p className="text-slate-500">No hay cursos disponibles.</p>}
      </div>
    </div>
  );
}
