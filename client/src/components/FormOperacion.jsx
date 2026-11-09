import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import Loader from './Loader.jsx';
import { TIPOS, formatearMoneda, simboloMoneda } from '../utils/formato.js';

const REGEX_CUENTA = /^\d{10}$/;
const MONTO_MAX = 1_000_000;
const DESCRIPCION_MAX = 120;
const MONTOS_RAPIDOS = [50, 100, 500];

const PESTANAS = ['deposito', 'retiro', 'transferencia'];
const TEXTO_BOTON = {
  deposito: 'Depositar',
  retiro: 'Retirar',
  transferencia: 'Transferir',
};

const interpretarMonto = (texto) => {
  const limpio = texto.trim().replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(limpio) ? Number(limpio) : NaN;
};

/** Devuelve un objeto { campo: mensaje } con los errores de validación. */
const validar = (tipo, valores, cuenta) => {
  const errores = {};
  const monto = interpretarMonto(valores.monto);

  if (!valores.monto.trim()) errores.monto = 'Ingresa un monto';
  else if (Number.isNaN(monto)) errores.monto = 'Usa solo números, con hasta 2 decimales';
  else if (monto <= 0) errores.monto = 'El monto debe ser mayor que cero';
  else if (monto > MONTO_MAX) errores.monto = `El máximo por operación es ${formatearMoneda(MONTO_MAX)}`;
  else if (tipo !== 'deposito' && monto > cuenta.saldo) {
    errores.monto = `Supera tu saldo disponible (${formatearMoneda(cuenta.saldo)})`;
  }

  if (tipo === 'transferencia') {
    if (!valores.destino.trim()) errores.destino = 'Ingresa la cuenta de destino';
    else if (!REGEX_CUENTA.test(valores.destino.trim())) errores.destino = 'Debe tener exactamente 10 dígitos';
    else if (valores.destino.trim() === cuenta.numeroCuenta) errores.destino = 'No puedes transferir a tu propia cuenta';
  }

  if (valores.descripcion.length > DESCRIPCION_MAX) {
    errores.descripcion = `Máximo ${DESCRIPCION_MAX} caracteres`;
  }

  return errores;
};

const claseCampo = (estado) => {
  const base =
    'w-full rounded-xl border bg-white py-3 text-base outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-900';
  if (estado === 'error') {
    return `${base} border-rose-400 focus:border-rose-500 focus:ring-rose-500/15 dark:border-rose-500/60`;
  }
  if (estado === 'ok') {
    return `${base} border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/15 dark:border-emerald-500/60`;
  }
  return `${base} border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/15 dark:border-slate-700`;
};

function IconoEstado({ estado }) {
  if (estado === 'error') return <AlertCircle className="h-5 w-5 text-rose-500" aria-hidden="true" />;
  if (estado === 'ok') return <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />;
  return null;
}

/**
 * Formulario de operaciones (depósito, retiro y transferencia).
 * Props:
 *  - cuenta: cuenta activa
 *  - operando: true mientras se envía una operación
 *  - onOperar(tipo, { monto, cuentaDestino, descripcion }) => Promise<boolean>
 *  - cuentasConocidas: [{ numeroCuenta, titular }] (sugerencias para transferir)
 */
export default function FormOperacion({ cuenta, operando, onOperar, cuentasConocidas = [] }) {
  const [tipo, setTipo] = useState('deposito');
  const [valores, setValores] = useState({ monto: '', destino: '', descripcion: '' });
  const [tocados, setTocados] = useState({});

  const errores = useMemo(() => validar(tipo, valores, cuenta), [tipo, valores, cuenta]);
  const meta = TIPOS[tipo];

  const destinoConocido = useMemo(
    () => cuentasConocidas.find((c) => c.numeroCuenta === valores.destino.trim()),
    [cuentasConocidas, valores.destino]
  );
  const sugerencias = cuentasConocidas.filter((c) => c.numeroCuenta !== cuenta.numeroCuenta);

  const estadoCampo = (campo) => {
    if (!tocados[campo]) return 'neutro';
    return errores[campo] ? 'error' : 'ok';
  };

  const actualizar = (campo) => (e) => setValores((v) => ({ ...v, [campo]: e.target.value }));
  const tocar = (campo) => () => setTocados((t) => ({ ...t, [campo]: true }));

  const cambiarTipo = (nuevo) => {
    setTipo(nuevo);
    setTocados({});
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (operando) return;

    if (Object.keys(errores).length > 0) {
      setTocados({ monto: true, destino: true, descripcion: true });
      return;
    }

    const exito = await onOperar(tipo, {
      monto: interpretarMonto(valores.monto),
      cuentaDestino: valores.destino.trim(),
      descripcion: valores.descripcion.trim(),
    });

    if (exito) {
      setValores({ monto: '', destino: '', descripcion: '' });
      setTocados({});
    }
  };

  const montoEstado = estadoCampo('monto');
  const destinoEstado = estadoCampo('destino');
  const descripcionEstado = estadoCampo('descripcion');
  const puedeUsarMax = tipo !== 'deposito' && cuenta.saldo > 0;

  return (
    <section
      aria-label="Nueva operación"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-6"
    >
      <h2 className="font-display text-lg font-semibold tracking-tight">Nueva operación</h2>

      {/* Pestañas */}
      <div role="tablist" aria-label="Tipo de operación" className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/70">
        {PESTANAS.map((id) => {
          const { Icono, etiqueta, activo } = TIPOS[id];
          const seleccionada = id === tipo;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={seleccionada}
              onClick={() => cambiarTipo(id)}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                seleccionada
                  ? `bg-white shadow-sm dark:bg-slate-950 ${activo}`
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{etiqueta}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={enviar} noValidate className="mt-5 space-y-4">
        {tipo === 'transferencia' && (
          <div>
            <label htmlFor="destino" className="mb-1.5 block text-sm font-medium">
              Cuenta de destino
            </label>
            <div className="relative">
              <input
                id="destino"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                list="cuentas-conocidas"
                placeholder="10 dígitos"
                value={valores.destino}
                onChange={(e) => setValores((v) => ({ ...v, destino: e.target.value.replace(/\D/g, '') }))}
                onBlur={tocar('destino')}
                aria-invalid={destinoEstado === 'error'}
                aria-describedby="destino-ayuda"
                className={`${claseCampo(destinoEstado)} px-4 pr-11 font-mono tracking-wider`}
              />
              <span className="absolute inset-y-0 right-3 grid place-items-center">
                <IconoEstado estado={destinoEstado} />
              </span>
            </div>
            <datalist id="cuentas-conocidas">
              {sugerencias.map((c) => (
                <option key={c.numeroCuenta} value={c.numeroCuenta}>
                  {c.titular}
                </option>
              ))}
            </datalist>
            <p
              id="destino-ayuda"
              className={`mt-1.5 text-sm ${
                destinoEstado === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {destinoEstado === 'error'
                ? errores.destino
                : destinoConocido
                  ? `Titular: ${destinoConocido.titular}`
                  : 'Escribe el número de la cuenta que recibirá el dinero'}
            </p>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="monto" className="text-sm font-medium">
              Monto
            </label>
            {tipo !== 'deposito' && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Disponible: {formatearMoneda(cuenta.saldo)}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center font-medium text-slate-400">
              {simboloMoneda()}
            </span>
            <input
              id="monto"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={valores.monto}
              onChange={actualizar('monto')}
              onBlur={tocar('monto')}
              aria-invalid={montoEstado === 'error'}
              aria-describedby="monto-ayuda"
              className={`${claseCampo(montoEstado)} pl-12 pr-11 font-display text-xl font-semibold tabular-nums`}
            />
            <span className="absolute inset-y-0 right-3 grid place-items-center">
              <IconoEstado estado={montoEstado} />
            </span>
          </div>
          <p
            id="monto-ayuda"
            className={`mt-1.5 min-h-5 text-sm ${
              montoEstado === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {montoEstado === 'error' ? errores.monto : ''}
          </p>

          <div className="mt-1 flex flex-wrap gap-2">
            {MONTOS_RAPIDOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setValores((v) => ({ ...v, monto: String(m) }));
                  setTocados((t) => ({ ...t, monto: true }));
                }}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
              >
                {simboloMoneda()} {m}
              </button>
            ))}
            {puedeUsarMax && (
              <button
                type="button"
                onClick={() => {
                  setValores((v) => ({ ...v, monto: String(cuenta.saldo) }));
                  setTocados((t) => ({ ...t, monto: true }));
                }}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
              >
                Todo el saldo
              </button>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="descripcion" className="mb-1.5 block text-sm font-medium">
            Concepto <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input
            id="descripcion"
            type="text"
            maxLength={DESCRIPCION_MAX + 20}
            placeholder={tipo === 'transferencia' ? 'Ej. Pago de alquiler' : 'Ej. Sueldo de noviembre'}
            value={valores.descripcion}
            onChange={actualizar('descripcion')}
            onBlur={tocar('descripcion')}
            aria-invalid={descripcionEstado === 'error'}
            className={`${claseCampo(descripcionEstado === 'ok' ? 'neutro' : descripcionEstado)} px-4`}
          />
          {descripcionEstado === 'error' && (
            <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{errores.descripcion}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={operando}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-semibold text-white shadow-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${meta.boton}`}
        >
          {operando ? (
            <Loader texto="Procesando…" tamano="sm" className="text-white! [&_svg]:text-white!" />
          ) : (
            <>
              {TEXTO_BOTON[tipo]}
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </section>
  );
}
