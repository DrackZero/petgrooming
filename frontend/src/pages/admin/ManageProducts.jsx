import { useState, useEffect } from 'react';
import { getProducts } from '../../api/orders.js';
import { createProduct, deleteProduct } from '../../api/admin.js';
import { formatCOP } from '../../utils/format.js';

const empty = { name: '', description: '', price: '', stock: '', category: '', image_url: '' };

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);

  const load = () => getProducts().then(setProducts).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createProduct({ ...form, price: Number(form.price), stock: Number(form.stock) });
    setForm(empty);
    load();
  };

  const handleDelete = async (id) => {
    await deleteProduct(id);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Gestionar productos</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 grid sm:grid-cols-2 gap-3 mb-6">
        <input name="name" placeholder="Nombre" required className="border rounded p-2" value={form.name} onChange={handleChange} />
        <input name="category" placeholder="Categoría" className="border rounded p-2" value={form.category} onChange={handleChange} />
        <input name="price" type="number" step="0.01" placeholder="Precio" required className="border rounded p-2" value={form.price} onChange={handleChange} />
        <input name="stock" type="number" placeholder="Stock" required className="border rounded p-2" value={form.stock} onChange={handleChange} />
        <input name="image_url" placeholder="URL imagen" className="border rounded p-2 sm:col-span-2" value={form.image_url} onChange={handleChange} />
        <textarea name="description" placeholder="Descripción" className="border rounded p-2 sm:col-span-2" value={form.description} onChange={handleChange} />
        <button className="bg-brand text-white rounded py-2 sm:col-span-2 hover:bg-brand-dark">Crear producto</button>
      </form>

      <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] bg-white border border-slate-200 rounded-lg overflow-hidden text-sm">
        <thead className="bg-slate-50 text-left">
          <tr><th className="p-3">Nombre</th><th className="p-3">Precio</th><th className="p-3">Stock</th><th className="p-3"></th></tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-3">{p.name}</td>
              <td className="p-3">{formatCOP(p.price)}</td>
              <td className="p-3">{p.stock}</td>
              <td className="p-3 text-right">
                <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">Desactivar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
