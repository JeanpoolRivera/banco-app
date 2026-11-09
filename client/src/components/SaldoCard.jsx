import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import Alerta from './Alerta.jsx';
import { Esqueleto } from './Loader.jsx';
import { formatearMoneda, formatearNumeroCuenta } from '../utils/formato.js';

/** Anima el saldo de un valor a otro (cuenta hacia arriba/abajo). */
function useSaldoAnimado(objetivo) {
  const [valor, setValor] = useState(objetivo ?? 0);
  const actual = useRef(objetivo ?? 0);

  useEffect(() => {
    if (objetivo === undefined || objetivo === null) return undefined;

    const desde = actual.current;
    if (desde === objetivo) {
      setValor(objetivo);
      return undefined;
    }

    const inicio = performance.now();
    const duracion = 800;
    let frame;

    const paso = (ahora) => {
      const progreso = Math.min((ahora - inicio) / duracion, 1);
      const suavizado = 1 - Math.pow(1 - progreso, 3);
      const nuevo = progreso < 1 ? desde + (objetivo - desde) * suavizado : objetivo;
      actual.current = nuevo;
      setValor(nuevo);
      if (progreso < 1) frame = requestAnimationFrame(paso);
    };

    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [objetivo]);

  return valor;
}

/**
 * Tarjeta bancaria con el saldo.
 * Props: cuenta, cargando, error, onReintentar
 */
export default function SaldoCard({ cuenta, cargando, error, onReintentar }) {
  const [oculto, setOculto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const saldoAnimado = useSaldoAnimado(cuenta?.saldo);

  const copiarNumero = async () => {
    try {
      await navigator.clipboard.writeText(cuenta.numeroCuenta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* el portapapeles puede no estar disponible */
    }
  };

  if (error && !cuenta) {
    return (
      <Alerta tipo="error" titulo="No pudimos cargar tu cuenta">
        <p>{error}</p>
        <button
          type="button"
          onClick={onReintentar}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Reintentar
        </button>
      </Alerta>
    );
  }

  if (cargando && !cuenta) {
    return (
      <div className="rounded-3xl bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 sm:p-8" aria-busy="true">
        <Esqueleto className="h-4 w-28 bg-white/25! dark:bg-white/20!" />
        <Esqueleto className="mt-6 h-12 w-64 bg-white/25! dark:bg-white/20!" />
        <Esqueleto className="mt-10 h-4 w-48 bg-white/25! dark:bg-white/20!" />
      </div>
    );
  }

  if (!cuenta) return null;

  return (
    <section
      aria-label="Saldo de la cuenta"
      className="relative animate-entrada overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-2xl shadow-indigo-600/30 sm:p-8 dark:shadow-indigo-500/20"
    >
      {/* Decoración: círculos y destello */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-fuchsia-300/15" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-brillo bg-white/10 blur-md" aria-hidden="true" />

      <div className="relative flex items-start justify-between">
        {/* Chip */}
        <div className="grid h-9 w-12 place-items-center rounded-md bg-linear-to-br from-amber-200 to-amber-400 shadow-inner" aria-hidden="true">
          <div className="grid h-5 w-8 grid-cols-3 gap-px rounded-sm opacity-60">
            <span className="border border-amber-700/60" />
            <span className="border border-amber-700/60" />
            <span className="border border-amber-700/60" />
          </div>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
          Cuenta de {cuenta.tipo}
        </span>
      </div>

      <div className="relative mt-8">
        <p className="text-sm text-white/75">Saldo disponible</p>
        <div className="mt-1 flex items-center gap-3">
          <p
            className="font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl"
            aria-live="polite"
          >
            {oculto ? '••••••' : formatearMoneda(saldoAnimado)}
          </p>
          <button
            type="button"
            onClick={() => setOculto((v) => !v)}
            aria-label={oculto ? 'Mostrar saldo' : 'Ocultar saldo'}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/15 transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"
          >
            {oculto ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="relative mt-8 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-base font-medium">{cuenta.titular}</p>
          <button
            type="button"
            onClick={copiarNumero}
            aria-label="Copiar número de cuenta"
            className="mt-1 inline-flex items-center gap-2 rounded-md font-mono text-sm tracking-widest text-white/85 transition hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            {formatearNumeroCuenta(cuenta.numeroCuenta)}
            {copiado ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <span className="font-display text-lg font-semibold italic tracking-tight text-white/90">BancoSimple</span>
      </div>
    </section>
  );
}
