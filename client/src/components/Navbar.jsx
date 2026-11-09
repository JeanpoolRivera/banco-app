import { Landmark, LogOut, Moon, Sun } from 'lucide-react';
import { enmascarar } from '../utils/formato.js';

/**
 * Barra superior.
 * Props: cuenta (opcional), tema ('light' | 'dark'), onAlternarTema, onCerrarSesion
 */
export default function Navbar({ cuenta, tema, onAlternarTema, onCerrarSesion }) {
  const esOscuro = tema === 'dark';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-indigo-500">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/30">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">BancoSimple</span>
        </a>

        <div className="flex items-center gap-2">
          {cuenta && (
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-100/70 py-1 pl-1 pr-3 text-sm dark:border-slate-800 dark:bg-slate-900 sm:flex">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                {cuenta.titular.charAt(0)}
              </span>
              <span className="font-medium">{cuenta.titular.split(' ')[0]}</span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{enmascarar(cuenta.numeroCuenta)}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onAlternarTema}
            aria-label={esOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {esOscuro ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {cuenta && (
            <button
              type="button"
              onClick={onCerrarSesion}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
