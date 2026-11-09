/**
 * Error operacional con código HTTP.
 * Se lanza desde validadores y controladores; el middleware de errores
 * lo convierte en una respuesta JSON uniforme.
 */
export class AppError extends Error {
  /**
   * @param {string} mensaje   Mensaje legible para el usuario.
   * @param {number} statusCode Código HTTP (400, 404, 500...).
   * @param {Array|Object|null} detalles Información adicional (p. ej. errores por campo).
   */
  constructor(mensaje, statusCode = 500, detalles = null) {
    super(mensaje);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.detalles = detalles;
    this.esOperacional = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
