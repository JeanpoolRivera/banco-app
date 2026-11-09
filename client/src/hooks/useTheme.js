import { useCallback, useEffect, useState } from 'react';

const leerTemaInicial = () => {
  try {
    const guardado = localStorage.getItem('tema');
    if (guardado === 'dark' || guardado === 'light') return guardado;
  } catch {
    /* almacenamiento no disponible */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/** Gestiona el modo oscuro/claro y lo persiste en localStorage. */
export default function useTheme() {
  const [tema, setTema] = useState(leerTemaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark');
    try {
      localStorage.setItem('tema', tema);
    } catch {
      /* ignorar */
    }
  }, [tema]);

  const alternar = useCallback(() => setTema((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return { tema, alternar };
}
