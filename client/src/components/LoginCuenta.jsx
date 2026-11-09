import { useState } from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import Alerta from './Alerta.jsx';
import Loader from './Loader.jsx';
import { formatearNumeroCuenta } from '../utils/formato.js';

const REGEX_CUENTA = /^\d{10}$/;

/**
 * Acceso simple por número de cuenta (sin contraseña, es un ejercicio).
 * Props:
 *  - cuentasDemo: [{ numeroCuenta, titular, tipo }]
 *  - cargandoCuentas: boolean
 *  - onIngresar(numeroCuenta): Promise (lanza Error si la cuenta no existe)
 */
export default function LoginCuenta({ cuentasDemo = [], cargandoCuentas, onIngresar }) {
  const [numero, setNumero] = useState('');
  const [tocado, setTocado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const valido = REGEX_CUENTA.test(numero);
  const mostrarError = tocado && !valido;
  const estado = !tocado ? 'neutro' : valido ? 'ok' : 'error';

  const clases = {
    neutro: 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/15 dark:border-slate-700',
    ok: 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/15 dark:border-emerald-500/60',
    error: 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15 dark:border-rose-500/60',
  };

  const ingresar = async (numeroCuenta) => {
    setError('');
    setCargando(true);
    try {
      await onIngresar(numeroCuenta);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const enviar = (e) => {
    e.preventDefault();
    setTocado(true);
    if (valido && !cargando) ingresar(numero);
  };

  return (
    <main className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 py-10 sm:px-6 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-2 lg:gap-16">
      <div>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Tu dinero, claro y al instante.
        </h1>
        <p className="mt-4 max-w-md text-lg text-slate-600 dark:text-slate-400">
          Entra con tu número de cuenta para ver tu saldo, depositar, retirar y transferir sin recargar la página.
        </p>

        <div className="mt-8">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cuentas de prueba</p>
          {cargandoCuentas && <Loader texto="Buscando cuentas…" tamano="sm" className="mt-3" />}
          {!cargandoCuentas && cuentasDemo.length === 0 && (
            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              No hay cuentas disponibles. Ejecuta <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">npm run seed</code> en
              la carpeta del servidor para crearlas.
            </p>
          )}
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {cuentasDemo.map((c) => (
              <li key={c.numeroCuenta}>
                <button
                  type="button"
                  onClick={() => {
                    setNumero(c.numeroCuenta);
                    setTocado(true);
                    setError('');
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/60 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10"
                >
                  <span className="block truncate font-medium">{c.titular}</span>
                  <span className="block font-mono text-xs tracking-wider text-slate-500 dark:text-slate-400">
                    {formatearNumeroCuenta(c.numeroCuenta)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <form
        onSubmit={enviar}
        noValidate
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70 sm:p-8"
      >
        <h2 className="font-display text-2xl font-semibold tracking-tight">Ingresar a mi cuenta</h2>

        <label htmlFor="numero-cuenta" className="mt-6 block text-sm font-medium">
          Número de cuenta
        </label>
        <div className="relative mt-1.5">
          <input
            id="numero-cuenta"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            placeholder="10 dígitos"
            value={numero}
            onChange={(e) => {
              setNumero(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
            onBlur={() => numero && setTocado(true)}
            aria-invalid={mostrarError}
            aria-describedby="numero-cuenta-ayuda"
            className={`w-full rounded-xl border bg-white px-4 py-3.5 pr-11 font-mono text-lg tracking-widest outline-none transition placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:ring-4 dark:bg-slate-950 ${clases[estado]}`}
          />
          <span className="absolute inset-y-0 right-3 grid place-items-center">
            {estado === 'ok' && <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />}
            {estado === 'error' && <AlertCircle className="h-5 w-5 text-rose-500" aria-hidden="true" />}
          </span>
        </div>
        <p
          id="numero-cuenta-ayuda"
          className={`mt-1.5 min-h-5 text-sm ${mostrarError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          {mostrarError ? 'El número de cuenta debe tener exactamente 10 dígitos' : ''}
        </p>

        {error && (
          <Alerta tipo="error" titulo="No pudimos iniciar sesión" className="mt-3">
            {error}
          </Alerta>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-500 hover:to-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cargando ? (
            <Loader texto="Verificando…" tamano="sm" className="text-white! [&_svg]:text-white!" />
          ) : (
            <>
              Ingresar
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </>
          )}
        </button>

        <p className="mt-5 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Es un proyecto de práctica: el acceso es solo con el número de cuenta, sin contraseña.
        </p>
      </form>
    </main>
  );
}
