const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(mensaje, status = 0, detalles = null) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.detalles = detalles;
  }
}

/** Wrapper de fetch con manejo uniforme de errores. */
const solicitar = async (ruta, opciones = {}) => {
  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opciones,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Comprueba que la API esté en ejecución.', 0);
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    /* respuesta sin JSON */
  }

  if (!respuesta.ok) {
    throw new ApiError(datos?.mensaje || `Error inesperado (${respuesta.status})`, respuesta.status, datos?.detalles);
  }
  return datos;
};

const post = (ruta, cuerpo) => solicitar(ruta, { method: 'POST', body: JSON.stringify(cuerpo) });

export const listarCuentas = () => solicitar('/cuenta').then((d) => d.cuentas);

export const obtenerCuenta = (numeroCuenta) =>
  solicitar(`/cuenta/${encodeURIComponent(numeroCuenta)}`).then((d) => d.cuenta);

export const obtenerHistorial = (numeroCuenta, limite = 30) =>
  solicitar(`/cuenta/${encodeURIComponent(numeroCuenta)}/historial?limite=${limite}`).then((d) => d.transacciones);

/** Cada operación devuelve { mensaje, cuenta, transaccion } */
export const depositar = ({ numeroCuenta, monto, descripcion }) =>
  post('/cuenta/deposito', { numeroCuenta, monto, descripcion });

export const retirar = ({ numeroCuenta, monto, descripcion }) =>
  post('/cuenta/retiro', { numeroCuenta, monto, descripcion });

export const transferir = ({ cuentaOrigen, cuentaDestino, monto, descripcion }) =>
  post('/cuenta/transferencia', { cuentaOrigen, cuentaDestino, monto, descripcion });
