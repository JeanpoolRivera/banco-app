import { Loader2 } from 'lucide-react';

const TAMANOS = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
};

/**
 * Indicador de carga.
 * Props: texto, tamano ('sm' | 'md' | 'lg'), centrado, className
 */
export default function Loader({ texto = 'Cargando…', tamano = 'md', centrado = false, className = '' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-3 text-slate-500 dark:text-slate-400 ${
        centrado ? 'flex w-full justify-center py-10' : ''
      } ${className}`}
    >
      <Loader2 className={`${TAMANOS[tamano] ?? TAMANOS.md} animate-spin text-indigo-500`} aria-hidden="true" />
      {texto && <span className="text-sm font-medium">{texto}</span>}
    </div>
  );
}

/** Bloque "esqueleto" para estados de carga. */
export function Esqueleto({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800 ${className}`} />;
}
