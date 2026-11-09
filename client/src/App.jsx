import { useCallback, useEffect, useState } from 'react';

import Navbar from './components/Navbar.jsx';
import LoginCuenta from './components/LoginCuenta.jsx';
import SaldoCard from './components/SaldoCard.jsx';
import FormOperacion from './components/FormOperacion.jsx';
import HistorialTransacciones from './components/HistorialTransacciones.jsx';
import { ToastContainer } from './components/Alerta.jsx';

import useTheme from './hooks/useTheme.js';
import useToasts from './hooks/useToasts.js';
import {
  depositar,
  listarCuentas,
  obtenerCuenta,
  obtenerHistorial,
  retirar,
  transferir,
} from './api/cuentaApi.js';

const CLAVE_SESION = 'cuentaActiva';

const leerSesion = () => {
  try {
    return localStorage.getItem(CLAVE_SESION);
  } catch {
    return null;
  }
};

const guardarSesion = (numero) => {
  try {
    if (numero) localStorage.setItem(CLAVE_SESION, numero);
    else localStorage.removeItem(CLAVE_SESION);
  } catch {
    /* ignorar */
  }
};

const TITULOS_EXITO = {
  deposito: 'Depósito realizado',
  retiro: 'Retiro realizado',
  transferencia: 'Transferencia realizada',
};

export default function App() {
  const { tema, alternar } = useTheme();
  const { toasts, mostrar, cerrar } = useToasts();

  // Sesión y datos de la cuenta
  const [cuentaId, setCuentaId] = useState(leerSesion);
  const [cuenta, setCuenta] = useState(null);
  const [errorCuenta, setErrorCuenta] = useState('');
  const [cargandoCuenta, setCargandoCuenta] = useState(false);

  const [historial, setHistorial] = useState([]);
  const [errorHistorial, setErrorHistorial] = useState('');
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [operando, setOperando] = useState(false);
  const [resaltarId, setResaltarId] = useState(null);
  const [reintento, setReintento] = useState(0);

  // Cuentas de prueba (selector / sugerencias)
  const [cuentasConocidas, setCuentasConocidas] = useState([]);
  const [cargandoConocidas, setCargandoConocidas] = useState(true);

  const cerrarSesion = useCallback(() => {
    guardarSesion(null);
    setCuentaId(null);
    setCuenta(null);
    setHistorial([]);
    setErrorCuenta('');
    setErrorHistorial('');
    setResaltarId(null);
  }, []);

  // Carga de cuentas conocidas
  useEffect(() => {
    let cancelado = false;
    listarCuentas()
      .then((lista) => !cancelado && setCuentasConocidas(lista))
      .catch(() => !cancelado && setCuentasConocidas([]))
      .finally(() => !cancelado && setCargandoConocidas(false));
    return () => {
      cancelado = true;
    };
  }, []);

  // Carga de cuenta e historial cuando hay sesión (o al reintentar)
  useEffect(() => {
    if (!cuentaId) return undefined;

    let cancelado = false;
    setCargandoCuenta(true);
    setCargandoHistorial(true);
    setErrorCuenta('');
    setErrorHistorial('');

    obtenerCuenta(cuentaId)
      .then((datos) => {
        if (!cancelado) setCuenta(datos);
      })
      .catch((error) => {
        if (cancelado) return;
        if (error.status === 404) {
          cerrarSesion();
          mostrar('error', 'Cuenta no encontrada', 'La cuenta guardada ya no existe. Ingresa de nuevo.');
        } else {
          setErrorCuenta(error.message);
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoCuenta(false);
      });

    obtenerHistorial(cuentaId)
      .then((datos) => {
        if (!cancelado) setHistorial(datos);
      })
      .catch((error) => {
        if (!cancelado && error.status !== 404) setErrorHistorial(error.message);
      })
      .finally(() => {
        if (!cancelado) setCargandoHistorial(false);
      });

    return () => {
      cancelado = true;
    };
  }, [cuentaId, reintento, cerrarSesion, mostrar]);

  // Login: valida que la cuenta exista antes de entrar
  const iniciarSesion = useCallback(async (numero) => {
    await obtenerCuenta(numero); // lanza ApiError (404/400/red) si falla
    guardarSesion(numero);
    setCuenta(null);
    setHistorial([]);
    setCuentaId(numero);
  }, []);

  // Operaciones: actualizan saldo e historial al instante con la respuesta del servidor
  const operar = useCallback(
    async (tipo, datos) => {
      if (!cuenta) return false;
      setOperando(true);

      try {
        let respuesta;
        if (tipo === 'deposito') {
          respuesta = await depositar({
            numeroCuenta: cuenta.numeroCuenta,
            monto: datos.monto,
            descripcion: datos.descripcion,
          });
        } else if (tipo === 'retiro') {
          respuesta = await retirar({
            numeroCuenta: cuenta.numeroCuenta,
            monto: datos.monto,
            descripcion: datos.descripcion,
          });
        } else {
          respuesta = await transferir({
            cuentaOrigen: cuenta.numeroCuenta,
            cuentaDestino: datos.cuentaDestino,
            monto: datos.monto,
            descripcion: datos.descripcion,
          });
        }

        setCuenta(respuesta.cuenta);
        setHistorial((previo) => [
          respuesta.transaccion,
          ...previo.filter((t) => t.id !== respuesta.transaccion.id),
        ]);
        setResaltarId(respuesta.transaccion.id);
        mostrar('exito', TITULOS_EXITO[tipo], respuesta.mensaje);
        return true;
      } catch (error) {
        mostrar('error', 'No se pudo completar la operación', error.message);
        return false;
      } finally {
        setOperando(false);
      }
    },
    [cuenta, mostrar]
  );

  const reintentar = useCallback(() => setReintento((n) => n + 1), []);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* Resplandor de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-linear-to-b from-indigo-100/70 via-violet-50/40 to-transparent dark:from-indigo-950/50 dark:via-violet-950/20 dark:to-transparent"
      />

      <Navbar
        cuenta={cuentaId ? cuenta : null}
        tema={tema}
        onAlternarTema={alternar}
        onCerrarSesion={cerrarSesion}
      />

      <ToastContainer toasts={toasts} onCerrar={cerrar} />

      {!cuentaId ? (
        <LoginCuenta
          cuentasDemo={cuentasConocidas}
          cargandoCuentas={cargandoConocidas}
          onIngresar={iniciarSesion}
        />
      ) : (
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {cuenta ? `Hola, ${cuenta.titular.split(' ')[0]}` : 'Tu cuenta'}
          </h1>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <SaldoCard
                cuenta={cuenta}
                cargando={cargandoCuenta}
                error={errorCuenta}
                onReintentar={reintentar}
              />
              {cuenta && (
                <FormOperacion
                  cuenta={cuenta}
                  operando={operando}
                  onOperar={operar}
                  cuentasConocidas={cuentasConocidas}
                />
              )}
            </div>

            <div className="lg:sticky lg:top-24 lg:col-span-5">
              <HistorialTransacciones
                transacciones={historial}
                cargando={cargandoHistorial}
                error={errorHistorial}
                onReintentar={reintentar}
                resaltarId={resaltarId}
              />
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
