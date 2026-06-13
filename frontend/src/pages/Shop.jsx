import { useState, useEffect } from 'react';
import { getProducts } from '../api/orders.js';
import { useCart } from '../hooks/useCart.js';
import ProductCard from '../components/ProductCard.jsx';
import Notification from '../components/Notification.jsx';

export default function Shop() {
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {});
  }, []);

  const handleAdd = (product) => {
    addItem(product);
    setMsg(`"${product.name}" añadido al carrito`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Tienda</h1>
      <Notification type="success" message={msg} onClose={() => setMsg('')} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onAdd={handleAdd} />
        ))}
        {products.length === 0 && <p className="text-slate-500">No hay productos disponibles.</p>}
      </div>
    </div>
  );
}
