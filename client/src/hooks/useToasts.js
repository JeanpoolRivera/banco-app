import { useCallback, useEffect, useRef, useState } from 'react';

/** Cola de notificaciones tipo toast con cierre automático. */
export default function useToasts() {
  const [toasts, setToasts] = useState([]);
  const contador = useRef(0);
  const temporizadores = useRef(new Map());

  const cerrar = useCallback((id) => {
    clearTimeout(temporizadores.current.get(id));
    temporizadores.current.delete(id);
    setToasts((actuales) => actuales.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (tipo, titulo, mensaje = '', duracion = 5000) => {
      contador.current += 1;
      const id = contador.current;
      setToasts((actuales) => [...actuales.slice(-3), { id, tipo, titulo, mensaje }]);
      temporizadores.current.set(id, setTimeout(() => cerrar(id), duracion));
      return id;
    },
    [cerrar]
  );

  useEffect(() => {
    const mapa = temporizadores.current;
    return () => mapa.forEach((t) => clearTimeout(t));
  }, []);

  return { toasts, mostrar, cerrar };
}
