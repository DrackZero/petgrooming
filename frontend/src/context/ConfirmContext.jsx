import { createContext, useCallback, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export const ConfirmContext = createContext(null);

// Provee un confirm() propio que devuelve una promesa, de modo que las
// llamadas se leen igual que el confirm() nativo al que reemplaza:
//
//   if (!(await confirmar({ title: '…', danger: true }))) return;
//
// Hay un único diálogo montado en toda la aplicación; el provider guarda
// la función que resuelve la promesa mientras el usuario decide.
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { opciones, resolver }

  const confirmar = useCallback(
    (opciones) =>
      new Promise((resolve) => {
        setState({
          opciones: typeof opciones === 'string' ? { title: opciones } : opciones,
          resolver: resolve,
        });
      }),
    []
  );

  const cerrar = (respuesta) => {
    state?.resolver(respuesta);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <ConfirmDialog
        open={Boolean(state)}
        {...(state?.opciones || {})}
        onConfirm={() => cerrar(true)}
        onCancel={() => cerrar(false)}
      />
    </ConfirmContext.Provider>
  );
}
