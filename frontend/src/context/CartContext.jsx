import { createContext, useState, useEffect, useCallback } from 'react';

export const CartContext = createContext(null);

const STORAGE_KEY = 'petgrooming_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  // Persiste el carrito en localStorage.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.product_id === product.id);
      if (found) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        { product_id: product.id, name: product.name, price: product.price, quantity },
      ];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    setItems((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i)).filter((i) => i.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  const value = { items, addItem, removeItem, updateQuantity, clearCart, total, count };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
