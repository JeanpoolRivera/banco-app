import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ESTILOS = {
  exito: {
    Icono: CheckCircle2,
    caja: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950 dark:text-emerald-100',
    icono: 'text-emerald-500',
  },
  error: {
    Icono: AlertTriangle,
    caja: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-950 dark:text-rose-100',
    icono: 'text-rose-500',
  },
  info: {
    Icono: Info,
    caja: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-950 dark:text-sky-100',
    icono: 'text-sky-500',
  },
};

/**
 * Alerta en línea.
 * Props: tipo ('exito' | 'error' | 'info'), titulo, children, onCerrar, className
 */
export default function Alerta({ tipo = 'info', titulo, children, onCerrar, className = '' }) {
  const estilo = ESTILOS[tipo] ?? ESTILOS.info;
  const { Icono } = estilo;

  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${estilo.caja} ${className}`}
    >
      <Icono className={`mt-0.5 h-5 w-5 shrink-0 ${estilo.icono}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={titulo ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar alerta"
          className="-m-1 rounded-lg p-1 opacity-60 transition hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Contenedor de toasts (esquina superior derecha).
 * Props: toasts [{ id, tipo, titulo, mensaje }], onCerrar(id)
 */
export function ToastContainer({ toasts, onCerrar }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-96"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto animate-toast rounded-2xl shadow-xl shadow-slate-900/10">
          <Alerta tipo={t.tipo} titulo={t.titulo} onCerrar={() => onCerrar(t.id)}>
            {t.mensaje}
          </Alerta>
        </div>
      ))}
    </div>
  );
}
