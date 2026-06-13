import { useState, useEffect } from 'react';
import { getCourses } from '../../api/courses.js';
import { createCourse } from '../../api/admin.js';

const empty = { title: '', description: '', price: '', capacity: '', starts_at: '', image_url: '' };

export default function ManageCourses() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(empty);

  const load = () => getCourses().then(setCourses).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createCourse({
      ...form,
      price: Number(form.price),
      capacity: Number(form.capacity),
      starts_at: form.starts_at || null,
    });
    setForm(empty);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Gestionar cursos</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 grid sm:grid-cols-2 gap-3 mb-6">
        <input name="title" placeholder="Título" required className="border rounded p-2 sm:col-span-2" value={form.title} onChange={handleChange} />
        <input name="price" type="number" step="0.01" placeholder="Precio" required className="border rounded p-2" value={form.price} onChange={handleChange} />
        <input name="capacity" type="number" placeholder="Cupos" required className="border rounded p-2" value={form.capacity} onChange={handleChange} />
        <input name="starts_at" type="datetime-local" className="border rounded p-2" value={form.starts_at} onChange={handleChange} />
        <input name="image_url" placeholder="URL imagen" className="border rounded p-2" value={form.image_url} onChange={handleChange} />
        <textarea name="description" placeholder="Descripción" className="border rounded p-2 sm:col-span-2" value={form.description} onChange={handleChange} />
        <button className="bg-brand text-white rounded py-2 sm:col-span-2 hover:bg-brand-dark">Crear curso</button>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-slate-500">${c.price} · {c.capacity} cupos</p>
          </div>
        ))}
      </div>
    </div>
  );
}
