import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getMyClinic, toggleStore,
  getMyProducts, createMyProduct, deleteMyProduct,
  getMyCourses, createMyCourse,
} from '../../api/gerente.js';
import { formatCOP } from '../../utils/format.js';
import Notification from '../../components/Notification.jsx';
import Tooltip from '../../components/Tooltip.jsx';

const emptyProduct = { name: '', description: '', price: '', stock: '', category: '', image_url: '' };
const emptyCourse = { title: '', description: '', price: '', duration: '', capacity: '', image_url: '' };

// Panel del GERENTE: su tienda y cursos (solo plan Pro).
export default function GerenteStore() {
  const [clinic, setClinic] = useState(null);
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [pForm, setPForm] = useState(emptyProduct);
  const [cForm, setCForm] = useState(emptyCourse);
  const [msg, setMsg] = useState('');

  const load = () => {
    getMyClinic().then(setClinic).catch(() => {});
    getMyProducts().then(setProducts).catch(() => {});
    getMyCourses().then(setCourses).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const isPro = clinic?.plan === 'pro';

  const flipStore = async () => {
    try {
      const r = await toggleStore(!clinic.store_enabled);
      setClinic({ ...clinic, store_enabled: r.store_enabled });
      setMsg(r.store_enabled ? 'Tienda activada ✓' : 'Tienda desactivada');
    } catch (err) {
      setMsg(err.response?.data?.message || 'No fue posible cambiar la tienda');
    }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    try {
      await createMyProduct({ ...pForm, price: Number(pForm.price), stock: Number(pForm.stock) });
      setPForm(emptyProduct);
      setMsg('Producto creado ✓');
      load();
    } catch (err) { setMsg(err.response?.data?.message || 'Error al crear el producto'); }
  };

  const removeProduct = async (id) => { await deleteMyProduct(id).catch(() => {}); load(); };

  const addCourse = async (e) => {
    e.preventDefault();
    try {
      await createMyCourse({ ...cForm, price: Number(cForm.price), capacity: Number(cForm.capacity) });
      setCForm(emptyCourse);
      setMsg('Curso creado ✓');
      load();
    } catch (err) { setMsg(err.response?.data?.message || 'Error al crear el curso'); }
  };

  if (!clinic) return <p className="text-slate-500">Cargando…</p>;

  // Plan Básico: no hay tienda, se ofrece mejorar.
  if (!isPro) {
    return (
      <div className="max-w-lg mx-auto text-center mt-10 bg-white border border-slate-200 rounded-2xl p-8">
        <span className="text-5xl">🔒</span>
        <h1 className="text-2xl font-extrabold text-brand-dark mt-3">Tienda y cursos — Plan Pro</h1>
        <p className="text-slate-500 mt-2">
          Tu veterinaria está en el plan <strong className="capitalize">{clinic.plan}</strong>. La tienda en línea
          y los cursos están disponibles al mejorar al <strong>plan Pro</strong>.
        </p>
        <p className="text-sm text-slate-400 mt-4">
          Contacta al administrador de la plataforma para cambiar tu plan.
        </p>
        <Link to="/gerente" className="inline-block mt-5 text-brand-dark font-semibold hover:underline">← Volver a mi veterinaria</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title mb-1">Mi tienda y cursos</h1>
      <p className="text-sm text-slate-500 mb-4">Gestiona el catálogo que ofreces a los clientes.</p>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />

      {/* Interruptor de tienda */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 my-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-slate-800">Tienda en línea</p>
          <p className="text-sm text-slate-500">
            {clinic.store_enabled
              ? 'Tu tienda está visible para los clientes.'
              : 'Tu tienda está oculta. Actívala para que los clientes vean tu catálogo.'}
          </p>
        </div>
        <Tooltip tip={clinic.store_enabled ? 'Toca para ocultar tu tienda a los clientes' : 'Toca para mostrar tu catálogo a los clientes'} side="top">
          <button
            onClick={flipStore}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              clinic.store_enabled ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            {clinic.store_enabled ? 'Activada' : 'Desactivada'}
          </button>
        </Tooltip>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => setTab('products')} className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${tab === 'products' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-500 border-slate-200'}`}>
          Productos ({products.length})
        </button>
        <button onClick={() => setTab('courses')} className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${tab === 'courses' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-500 border-slate-200'}`}>
          Cursos ({courses.length})
        </button>
      </div>

      {tab === 'products' && (
        <>
          <form onSubmit={addProduct} className="bg-white border border-slate-200 rounded-2xl p-4 grid sm:grid-cols-2 gap-3 mb-4">
            <input placeholder="Nombre" required className="border rounded p-2" value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} />
            <input placeholder="Categoría" className="border rounded p-2" value={pForm.category} onChange={(e) => setPForm({ ...pForm, category: e.target.value })} />
            <input type="number" step="0.01" placeholder="Precio (COP)" required className="border rounded p-2" value={pForm.price} onChange={(e) => setPForm({ ...pForm, price: e.target.value })} />
            <input type="number" placeholder="Stock" required className="border rounded p-2" value={pForm.stock} onChange={(e) => setPForm({ ...pForm, stock: e.target.value })} />
            <input placeholder="URL de imagen" className="border rounded p-2 sm:col-span-2" value={pForm.image_url} onChange={(e) => setPForm({ ...pForm, image_url: e.target.value })} />
            <textarea placeholder="Descripción" className="border rounded p-2 sm:col-span-2" value={pForm.description} onChange={(e) => setPForm({ ...pForm, description: e.target.value })} />
            <button className="bg-brand text-white rounded-full py-2 sm:col-span-2 font-semibold hover:bg-brand-dark">Agregar producto</button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
              <thead className="bg-slate-50 text-left"><tr><th className="p-3">Producto</th><th className="p-3">Precio</th><th className="p-3">Stock</th><th className="p-3"></th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{p.name}</td>
                    <td className="p-3">{formatCOP(p.price)}</td>
                    <td className="p-3">{p.stock}</td>
                    <td className="p-3 text-right"><button onClick={() => removeProduct(p.id)} className="text-red-600 hover:underline">Desactivar</button></td>
                  </tr>
                ))}
                {products.length === 0 && <tr><td colSpan="4" className="p-3 text-slate-500">Sin productos.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'courses' && (
        <>
          <form onSubmit={addCourse} className="bg-white border border-slate-200 rounded-2xl p-4 grid sm:grid-cols-2 gap-3 mb-4">
            <input placeholder="Título" required className="border rounded p-2 sm:col-span-2" value={cForm.title} onChange={(e) => setCForm({ ...cForm, title: e.target.value })} />
            <input type="number" step="0.01" placeholder="Precio (COP)" required className="border rounded p-2" value={cForm.price} onChange={(e) => setCForm({ ...cForm, price: e.target.value })} />
            <input placeholder="Duración (ej. 8 semanas)" className="border rounded p-2" value={cForm.duration} onChange={(e) => setCForm({ ...cForm, duration: e.target.value })} />
            <input type="number" placeholder="Cupos" required className="border rounded p-2" value={cForm.capacity} onChange={(e) => setCForm({ ...cForm, capacity: e.target.value })} />
            <input placeholder="URL de imagen" className="border rounded p-2" value={cForm.image_url} onChange={(e) => setCForm({ ...cForm, image_url: e.target.value })} />
            <textarea placeholder="Descripción" className="border rounded p-2 sm:col-span-2" value={cForm.description} onChange={(e) => setCForm({ ...cForm, description: e.target.value })} />
            <button className="bg-brand text-white rounded-full py-2 sm:col-span-2 font-semibold hover:bg-brand-dark">Agregar curso</button>
          </form>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-sm text-slate-500">{formatCOP(c.price)} · {c.capacity} cupos</p>
              </div>
            ))}
            {courses.length === 0 && <p className="text-slate-500">Sin cursos.</p>}
          </div>
        </>
      )}
    </div>
  );
}
