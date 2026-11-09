import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

const MONEDA = import.meta.env.VITE_MONEDA || 'PEN';
const LOCALE = import.meta.env.VITE_LOCALE || 'es-PE';

const formateadorMoneda = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: MONEDA });
const formateadorFecha = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatearMoneda = (valor) => formateadorMoneda.format(valor ?? 0);

export const formatearFecha = (iso) => (iso ? formateadorFecha.format(new Date(iso)) : '');

/** Símbolo de la moneda (S/, $, €...) para prefijos de inputs. */
export const simboloMoneda = () =>
  formateadorMoneda.formatToParts(0).find((p) => p.type === 'currency')?.value ?? '';

/** 1000000001 -> "1000 0000 01" */
export const formatearNumeroCuenta = (numero = '') => numero.replace(/^(\d{4})(\d{4})(\d{2})$/, '$1 $2 $3');

/** Muestra solo los últimos 4 dígitos. */
export const enmascarar = (numero = '') => `•••• ${numero.slice(-4)}`;

/**
 * Metadatos visuales por tipo de transacción.
 * Las clases se escriben completas para que Tailwind las detecte.
 */
export const TIPOS = {
  deposito: {
    etiqueta: 'Depósito',
    Icono: ArrowDownLeft,
    fondo: 'bg-emerald-100 dark:bg-emerald-500/15',
    texto: 'text-emerald-600 dark:text-emerald-400',
    boton:
      'bg-emerald-600 hover:bg-emerald-500 focus-visible:outline-emerald-500 shadow-emerald-600/30',
    activo: 'text-emerald-700 dark:text-emerald-300',
  },
  retiro: {
    etiqueta: 'Retiro',
    Icono: ArrowUpRight,
    fondo: 'bg-rose-100 dark:bg-rose-500/15',
    texto: 'text-rose-600 dark:text-rose-400',
    boton: 'bg-rose-600 hover:bg-rose-500 focus-visible:outline-rose-500 shadow-rose-600/30',
    activo: 'text-rose-700 dark:text-rose-300',
  },
  transferencia: {
    etiqueta: 'Transferencia',
    Icono: ArrowLeftRight,
    fondo: 'bg-sky-100 dark:bg-sky-500/15',
    texto: 'text-sky-600 dark:text-sky-400',
    boton: 'bg-sky-600 hover:bg-sky-500 focus-visible:outline-sky-500 shadow-sky-600/30',
    activo: 'text-sky-700 dark:text-sky-300',
  },
};
