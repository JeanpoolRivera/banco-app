import { AppError } from '../utils/AppError.js';

const REGEX_CUENTA = /^\d{10}$/;
const REGEX_MONTO = /^\d+(\.\d{1,2})?$/;
const MONTO_MAX = 1_000_000;
const DESCRIPCION_MAX = 120;
const LIMITE_DEFECTO = 20;
const LIMITE_MAX = 100;

const esObjetoPlano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Valida un número de cuenta (10 dígitos). Devuelve el valor limpio o null. */
const validarNumeroCuenta = (valor, campo, errores) => {
  if (typeof valor !== 'string' || !REGEX_CUENTA.test(valor.trim())) {
    errores.push({ campo, mensaje: `El campo "${campo}" debe ser un número de cuenta de 10 dígitos` });
    return null;
  }
  return valor.trim();
};

/**
 * Valida el monto y lo devuelve en CENTAVOS (entero) para evitar errores de
 * punto flotante. Acepta number o string numérico con máximo 2 decimales.
 */
const validarMonto = (valor, errores) => {
  let numero = NaN;

  if (typeof valor === 'number') {
    numero = valor;
  } else if (typeof valor === 'string' && REGEX_MONTO.test(valor.trim())) {
    numero = Number(valor.trim());
  }

  if (!Number.isFinite(numero)) {
    errores.push({ campo: 'monto', mensaje: 'El monto debe ser un número válido' });
    return null;
  }
  if (numero <= 0) {
    errores.push({ campo: 'monto', mensaje: 'El monto debe ser mayor que cero' });
    return null;
  }
  if (numero > MONTO_MAX) {
    errores.push({ campo: 'monto', mensaje: `El monto máximo por operación es ${MONTO_MAX}` });
    return null;
  }

  const centavos = Math.round(numero * 100);
  if (Math.abs(numero * 100 - centavos) > 1e-6) {
    errores.push({ campo: 'monto', mensaje: 'El monto admite como máximo 2 decimales' });
    return null;
  }
  if (centavos < 1) {
    errores.push({ campo: 'monto', mensaje: 'El monto mínimo es 0.01' });
    return null;
  }
  return centavos;
};

const validarDescripcion = (valor, errores) => {
  if (valor === undefined || valor === null || valor === '') return '';
  if (typeof valor !== 'string') {
    errores.push({ campo: 'descripcion', mensaje: 'La descripción debe ser texto' });
    return '';
  }
  const limpia = valor.trim();
  if (limpia.length > DESCRIPCION_MAX) {
    errores.push({
      campo: 'descripcion',
      mensaje: `La descripción no puede superar ${DESCRIPCION_MAX} caracteres`,
    });
  }
  return limpia;
};

const exigirCuerpo = (req, errores) => {
  if (!esObjetoPlano(req.body)) {
    errores.push({ campo: 'body', mensaje: 'Se esperaba un cuerpo JSON con los datos de la operación' });
    return false;
  }
  return true;
};

const finalizar = (errores, next) => {
  if (errores.length > 0) {
    return next(new AppError(errores[0].mensaje, 400, errores));
  }
  return next();
};

// ---------- Middlewares exportados ----------

/** Valida :id (número de cuenta) en la URL. */
export const validarIdParam = (req, _res, next) => {
  const errores = [];
  const id = validarNumeroCuenta(req.params.id, 'id', errores);
  if (id) req.params.id = id;
  finalizar(errores, next);
};

/** Valida ?limite= en el historial. */
export const validarHistorialQuery = (req, _res, next) => {
  const errores = [];
  let limite = LIMITE_DEFECTO;

  if (req.query.limite !== undefined) {
    const crudo = req.query.limite;
    if (typeof crudo !== 'string' || !/^\d+$/.test(crudo) || Number(crudo) < 1 || Number(crudo) > LIMITE_MAX) {
      errores.push({ campo: 'limite', mensaje: `"limite" debe ser un entero entre 1 y ${LIMITE_MAX}` });
    } else {
      limite = Number(crudo);
    }
  }

  req.datos = { limite };
  finalizar(errores, next);
};

/** Valida el cuerpo de depósito y retiro: { numeroCuenta, monto, descripcion? } */
export const validarDepositoRetiro = (req, _res, next) => {
  const errores = [];
  if (!exigirCuerpo(req, errores)) return finalizar(errores, next);

  const numeroCuenta = validarNumeroCuenta(req.body.numeroCuenta, 'numeroCuenta', errores);
  const montoCentavos = validarMonto(req.body.monto, errores);
  const descripcion = validarDescripcion(req.body.descripcion, errores);

  req.datos = { numeroCuenta, montoCentavos, descripcion };
  return finalizar(errores, next);
};

/** Valida el cuerpo de transferencia: { cuentaOrigen, cuentaDestino, monto, descripcion? } */
export const validarTransferencia = (req, _res, next) => {
  const errores = [];
  if (!exigirCuerpo(req, errores)) return finalizar(errores, next);

  const cuentaOrigen = validarNumeroCuenta(req.body.cuentaOrigen, 'cuentaOrigen', errores);
  const cuentaDestino = validarNumeroCuenta(req.body.cuentaDestino, 'cuentaDestino', errores);
  const montoCentavos = validarMonto(req.body.monto, errores);
  const descripcion = validarDescripcion(req.body.descripcion, errores);

  if (cuentaOrigen && cuentaDestino && cuentaOrigen === cuentaDestino) {
    errores.push({
      campo: 'cuentaDestino',
      mensaje: 'La cuenta de destino debe ser distinta a la cuenta de origen',
    });
  }

  req.datos = { cuentaOrigen, cuentaDestino, montoCentavos, descripcion };
  return finalizar(errores, next);
};
