import { AppError } from '../utils/AppError.js';

/**
 * Envuelve un controlador async para que cualquier error llegue al middleware
 * de errores (Express 4 no captura promesas rechazadas por sí mismo).
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** 404 para rutas inexistentes. */
export const notFound = (req, _res, next) => {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
};

/**
 * Middleware central de errores.
 * Formato de respuesta: { ok: false, status, mensaje, detalles }
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = 500;
  let mensaje = 'Error interno del servidor';
  let detalles = null;

  if (err instanceof AppError) {
    status = err.statusCode;
    mensaje = err.message;
    detalles = err.detalles;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    mensaje = 'El cuerpo de la petición no es un JSON válido';
  } else if (err.type === 'entity.too.large') {
    status = 400;
    mensaje = 'El cuerpo de la petición es demasiado grande';
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    detalles = Object.values(err.errors).map((e) => ({ campo: e.path, mensaje: e.message }));
    mensaje = detalles[0]?.mensaje || 'Datos inválidos';
  } else if (err.name === 'CastError') {
    status = 400;
    mensaje = `Valor inválido para el campo "${err.path}"`;
  } else if (err.code === 11000) {
    status = 400;
    mensaje = 'Ya existe un registro con esos datos';
  }

  if (status >= 500) {
    console.error('❌ Error interno:', err);
    if (process.env.NODE_ENV !== 'production') {
      detalles = { causa: err.message };
    }
  }

  res.status(status).json({ ok: false, status, mensaje, detalles });
};
