import { useContext } from 'react';
import { ConfirmContext } from '../context/ConfirmContext.jsx';

// Hook de confirmación. Devuelve una función que abre el diálogo y resuelve
// a true o false, en reemplazo del confirm() del navegador.
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
