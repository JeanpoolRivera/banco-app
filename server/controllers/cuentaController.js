import mongoose from 'mongoose';

import Cuenta from '../models/Cuenta.js';
import Transaccion from '../models/Transaccion.js';
import { soportaTransacciones } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Serialización (centavos -> decimales)
// ---------------------------------------------------------------------------

const aDecimal = (centavos) => centavos / 100;

const serializarCuenta = (cuenta) => ({
  id: cuenta._id,
  numeroCuenta: cuenta.numeroCuenta,
  titular: cuenta.titular,
  tipo: cuenta.tipo,
  saldo: aDecimal(cuenta.saldoCentavos),
  creadaEn: cuenta.createdAt,
  actualizadaEn: cuenta.updatedAt,
});

/**
 * Serializa una transacción desde el punto de vista de una cuenta:
 * direccion = 'entrada' (suma al saldo) | 'salida' (resta del saldo).
 */
const serializarTransaccion = (t, numeroCuenta = null) => {
  let direccion = null;
  if (t.tipo === 'deposito') direccion = 'entrada';
  else if (t.tipo === 'retiro') direccion = 'salida';
  else if (numeroCuenta) direccion = t.numeroCuentaOrigen === numeroCuenta ? 'salida' : 'entrada';

  return {
    id: t._id,
    tipo: t.tipo,
    monto: aDecimal(t.montoCentavos),
    direccion,
    cuentaOrigen: t.numeroCuentaOrigen,
    cuentaDestino: t.numeroCuentaDestino,
    descripcion: t.descripcion || '',
    fecha: t.createdAt,
  };
};

// ---------------------------------------------------------------------------
// Atomicidad: transacción de Mongoose (replica set) o alternativa segura
// ---------------------------------------------------------------------------

/**
 * Ejecuta `operacion(ctx)` de forma atómica.
 *
 * - Replica set / sharded: usa session.withTransaction (todo o nada, con
 *   reintentos automáticos ante errores transitorios).
 * - MongoDB standalone (típico en local): las transacciones no existen, así que
 *   cada escritura es una actualización condicional atómica (por ejemplo
 *   `saldoCentavos >= monto`) y, si un paso posterior falla, se ejecutan las
 *   compensaciones registradas en orden inverso (rollback manual).
 *
 * ctx = { session, compensar(fn) }
 */
const ejecutarAtomico = async (operacion) => {
  if (soportaTransacciones()) {
    const session = await mongoose.startSession();
    try {
      let resultado;
      await session.withTransaction(async () => {
        resultado = await operacion({ session, compensar: () => {} });
      });
      return resultado;
    } finally {
      await session.endSession();
    }
  }

  const compensaciones = [];
  try {
    return await operacion({
      session: null,
      compensar: (fn) => compensaciones.push(fn),
    });
  } catch (error) {
    for (const deshacer of compensaciones.reverse()) {
      try {
        await deshacer();
      } catch (errorCompensacion) {
        console.error('⚠️  Falló una compensación (revisar manualmente):', errorCompensacion.message);
      }
    }
    throw error;
  }
};

/** Opciones de Mongoose según haya sesión o no. */
const opciones = (ctx, extra = {}) => (ctx.session ? { ...extra, session: ctx.session } : extra);

const buscarCuenta = (numeroCuenta, ctx) => {
  const consulta = Cuenta.findOne({ numeroCuenta });
  return ctx.session ? consulta.session(ctx.session) : consulta;
};

const saldoInsuficiente = (saldoCentavos) =>
  new AppError('Saldo insuficiente para realizar la operación', 400, {
    saldoDisponible: aDecimal(saldoCentavos),
  });

// ---------------------------------------------------------------------------
// Controladores
// ---------------------------------------------------------------------------

/** GET /api/cuenta  -> listado básico (para el selector de cuentas de prueba) */
export const listarCuentas = asyncHandler(async (_req, res) => {
  const cuentas = await Cuenta.find({}, 'numeroCuenta titular tipo').sort({ numeroCuenta: 1 }).limit(50).lean();
  res.json({
    ok: true,
    cuentas: cuentas.map((c) => ({ numeroCuenta: c.numeroCuenta, titular: c.titular, tipo: c.tipo })),
  });
});

/** GET /api/cuenta/:id -> datos y saldo */
export const obtenerCuenta = asyncHandler(async (req, res) => {
  const cuenta = await Cuenta.findOne({ numeroCuenta: req.params.id });
  if (!cuenta) throw new AppError('Cuenta no encontrada', 404);

  res.json({ ok: true, cuenta: serializarCuenta(cuenta) });
});

/** POST /api/cuenta/deposito */
export const depositar = asyncHandler(async (req, res) => {
  const { numeroCuenta, montoCentavos, descripcion } = req.datos;

  const { cuenta, transaccion } = await ejecutarAtomico(async (ctx) => {
    const cuentaActualizada = await Cuenta.findOneAndUpdate(
      { numeroCuenta },
      { $inc: { saldoCentavos: montoCentavos } },
      opciones(ctx, { new: true })
    );
    if (!cuentaActualizada) throw new AppError('Cuenta no encontrada', 404);

    ctx.compensar(() =>
      Cuenta.updateOne({ numeroCuenta }, { $inc: { saldoCentavos: -montoCentavos } })
    );

    const nueva = await new Transaccion({
      tipo: 'deposito',
      montoCentavos,
      cuentaDestino: cuentaActualizada._id,
      numeroCuentaDestino: numeroCuenta,
      descripcion,
    }).save(opciones(ctx));

    return { cuenta: cuentaActualizada, transaccion: nueva };
  });

  res.status(201).json({
    ok: true,
    mensaje: 'Depósito realizado con éxito',
    cuenta: serializarCuenta(cuenta),
    transaccion: serializarTransaccion(transaccion, numeroCuenta),
  });
});

/** POST /api/cuenta/retiro */
export const retirar = asyncHandler(async (req, res) => {
  const { numeroCuenta, montoCentavos, descripcion } = req.datos;

  const { cuenta, transaccion } = await ejecutarAtomico(async (ctx) => {
    // Condición atómica: solo descuenta si el saldo alcanza (nunca queda negativo)
    const cuentaActualizada = await Cuenta.findOneAndUpdate(
      { numeroCuenta, saldoCentavos: { $gte: montoCentavos } },
      { $inc: { saldoCentavos: -montoCentavos } },
      opciones(ctx, { new: true })
    );

    if (!cuentaActualizada) {
      const existente = await buscarCuenta(numeroCuenta, ctx);
      if (!existente) throw new AppError('Cuenta no encontrada', 404);
      throw saldoInsuficiente(existente.saldoCentavos);
    }

    ctx.compensar(() =>
      Cuenta.updateOne({ numeroCuenta }, { $inc: { saldoCentavos: montoCentavos } })
    );

    const nueva = await new Transaccion({
      tipo: 'retiro',
      montoCentavos,
      cuentaOrigen: cuentaActualizada._id,
      numeroCuentaOrigen: numeroCuenta,
      descripcion,
    }).save(opciones(ctx));

    return { cuenta: cuentaActualizada, transaccion: nueva };
  });

  res.status(201).json({
    ok: true,
    mensaje: 'Retiro realizado con éxito',
    cuenta: serializarCuenta(cuenta),
    transaccion: serializarTransaccion(transaccion, numeroCuenta),
  });
});

/** POST /api/cuenta/transferencia */
export const transferir = asyncHandler(async (req, res) => {
  const { cuentaOrigen, cuentaDestino, montoCentavos, descripcion } = req.datos;

  const { origen, transaccion } = await ejecutarAtomico(async (ctx) => {
    // 1) Ambas cuentas deben existir
    const origenActual = await buscarCuenta(cuentaOrigen, ctx);
    if (!origenActual) throw new AppError('Cuenta de origen no encontrada', 404);

    const destinoActual = await buscarCuenta(cuentaDestino, ctx);
    if (!destinoActual) throw new AppError('Cuenta de destino no encontrada', 404);

    // 2) Débito condicional atómico en origen
    const origenActualizado = await Cuenta.findOneAndUpdate(
      { numeroCuenta: cuentaOrigen, saldoCentavos: { $gte: montoCentavos } },
      { $inc: { saldoCentavos: -montoCentavos } },
      opciones(ctx, { new: true })
    );
    if (!origenActualizado) throw saldoInsuficiente(origenActual.saldoCentavos);

    ctx.compensar(() =>
      Cuenta.updateOne({ numeroCuenta: cuentaOrigen }, { $inc: { saldoCentavos: montoCentavos } })
    );

    // 3) Crédito en destino
    const destinoActualizado = await Cuenta.findOneAndUpdate(
      { numeroCuenta: cuentaDestino },
      { $inc: { saldoCentavos: montoCentavos } },
      opciones(ctx, { new: true })
    );
    if (!destinoActualizado) throw new AppError('Cuenta de destino no encontrada', 404);

    ctx.compensar(() =>
      Cuenta.updateOne({ numeroCuenta: cuentaDestino }, { $inc: { saldoCentavos: -montoCentavos } })
    );

    // 4) Registro de la transacción
    const nueva = await new Transaccion({
      tipo: 'transferencia',
      montoCentavos,
      cuentaOrigen: origenActualizado._id,
      cuentaDestino: destinoActualizado._id,
      numeroCuentaOrigen: cuentaOrigen,
      numeroCuentaDestino: cuentaDestino,
      descripcion,
    }).save(opciones(ctx));

    return { origen: origenActualizado, transaccion: nueva };
  });

  res.status(201).json({
    ok: true,
    mensaje: 'Transferencia realizada con éxito',
    cuenta: serializarCuenta(origen),
    transaccion: serializarTransaccion(transaccion, cuentaOrigen),
  });
});

/** GET /api/cuenta/:id/historial?limite=20 */
export const obtenerHistorial = asyncHandler(async (req, res) => {
  const numeroCuenta = req.params.id;
  const { limite } = req.datos;

  const existe = await Cuenta.exists({ numeroCuenta });
  if (!existe) throw new AppError('Cuenta no encontrada', 404);

  const filtro = { $or: [{ numeroCuentaOrigen: numeroCuenta }, { numeroCuentaDestino: numeroCuenta }] };

  const [transacciones, total] = await Promise.all([
    Transaccion.find(filtro).sort({ createdAt: -1, _id: -1 }).limit(limite).lean(),
    Transaccion.countDocuments(filtro),
  ]);

  res.json({
    ok: true,
    numeroCuenta,
    total,
    transacciones: transacciones.map((t) => serializarTransaccion(t, numeroCuenta)),
  });
});
