import { useContext } from 'react';
import { CartContext } from '../context/CartContext.jsx';

// Hook de acceso al carrito de compras.
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
