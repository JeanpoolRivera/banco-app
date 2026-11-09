import { useMemo, useState } from 'react';
import { Inbox, RefreshCw } from 'lucide-react';
import Alerta from './Alerta.jsx';
import { Esqueleto } from './Loader.jsx';
import { TIPOS, enmascarar, formatearFecha, formatearMoneda } from '../utils/formato.js';

const FILTROS = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'deposito', etiqueta: 'Depósitos' },
  { id: 'retiro', etiqueta: 'Retiros' },
  { id: 'transferencia', etiqueta: 'Transferencias' },
];

/** Texto principal y secundario de cada movimiento, según el punto de vista de la cuenta. */
const describir = (t) => {
  if (t.tipo === 'deposito') {
    return { titulo: 'Depósito', detalle: t.descripcion || 'Ingreso a tu cuenta' };
  }
  if (t.tipo === 'retiro') {
    return { titulo: 'Retiro', detalle: t.descripcion || 'Salida de efectivo' };
  }
  if (t.direccion === 'salida') {
    return {
      titulo: 'Transferencia enviada',
      detalle: `A la cuenta ${enmascarar(t.cuentaDestino)}${t.descripcion ? ` · ${t.descripcion}` : ''}`,
    };
  }
  return {
    titulo: 'Transferencia recibida',
    detalle: `De la cuenta ${enmascarar(t.cuentaOrigen)}${t.descripcion ? ` · ${t.descripcion}` : ''}`,
  };
};

function Fila({ transaccion, resaltada }) {
  const meta = TIPOS[transaccion.tipo];
  const { Icono } = meta;
  const { titulo, detalle } = describir(transaccion);
  const signo = transaccion.direccion === 'salida' ? '−' : '+';

  return (
    <li
      className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${resaltada ? 'animate-destello' : ''}`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${meta.fondo} ${meta.texto}`}>
        <Icono className="h-5 w-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{titulo}</p>
        <p className="truncate text-sm text-slate-500 dark:text-slate-400">{detalle}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{formatearFecha(transaccion.fecha)}</p>
      </div>

      <p className={`shrink-0 font-display font-semibold tabular-nums ${meta.texto}`}>
        {signo} {formatearMoneda(transaccion.monto)}
      </p>
    </li>
  );
}

/**
 * Lista de movimientos con filtro por tipo.
 * Props: transacciones, cargando, error, onReintentar, resaltarId
 */
export default function HistorialTransacciones({ transacciones, cargando, error, onReintentar, resaltarId }) {
  const [filtro, setFiltro] = useState('todos');

  const visibles = useMemo(
    () => (filtro === 'todos' ? transacciones : transacciones.filter((t) => t.tipo === filtro)),
    [transacciones, filtro]
  );

  return (
    <section
      aria-label="Historial de transacciones"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Movimientos</h2>
        {!cargando && !error && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {transacciones.length} {transacciones.length === 1 ? 'registro' : 'registros'}
          </span>
        )}
      </div>

      <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar por tipo">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            aria-pressed={filtro === f.id}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-indigo-500 ${
              filtro === f.id
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {cargando && transacciones.length === 0 && (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando movimientos">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <Esqueleto className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Esqueleto className="h-3.5 w-2/3" />
                  <Esqueleto className="h-3 w-1/2" />
                </div>
                <Esqueleto className="h-4 w-20" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <Alerta tipo="error" titulo="No pudimos cargar tus movimientos">
            <p>{error}</p>
            <button
              type="button"
              onClick={onReintentar}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Reintentar
            </button>
          </Alerta>
        )}

        {!cargando && !error && visibles.length === 0 && (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Inbox className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="mt-3 font-medium">
              {transacciones.length === 0 ? 'Aún no hay movimientos' : 'No hay movimientos de este tipo'}
            </p>
            <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              {transacciones.length === 0
                ? 'Haz tu primer depósito, retiro o transferencia y aparecerá aquí al instante.'
                : 'Prueba con otro filtro para ver el resto de tu actividad.'}
            </p>
          </div>
        )}

        {!error && visibles.length > 0 && (
          <ul className="max-h-[34rem] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800/70 lg:max-h-[calc(100vh-13rem)]">
            {visibles.map((t) => (
              <Fila key={t.id} transaccion={t} resaltada={t.id === resaltarId} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
