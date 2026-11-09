import 'dotenv/config';

import { connectDB, disconnectDB } from '../config/db.js';
import Cuenta from '../models/Cuenta.js';
import Transaccion from '../models/Transaccion.js';

const DIA = 24 * 60 * 60 * 1000;

const CUENTAS = [
  { numeroCuenta: '1000000001', titular: 'Valentina Rojas', tipo: 'ahorros' },
  { numeroCuenta: '1000000002', titular: 'Mateo Fernández', tipo: 'corriente' },
  { numeroCuenta: '1000000003', titular: 'Camila Quispe', tipo: 'ahorros' },
  { numeroCuenta: '1000000004', titular: 'Andrés Salazar', tipo: 'corriente' },
  { numeroCuenta: '1000000005', titular: 'Lucía Paredes', tipo: 'ahorros' },
];

// [díasAtrás, tipo, origen, destino, monto, descripción]
const OPERACIONES = [
  [30, 'deposito', null, '1000000001', 5000, 'Depósito inicial'],
  [30, 'deposito', null, '1000000002', 12000, 'Depósito inicial'],
  [29, 'deposito', null, '1000000003', 800, 'Depósito inicial'],
  [28, 'deposito', null, '1000000004', 25000, 'Depósito inicial'],
  [28, 'deposito', null, '1000000005', 50, 'Depósito inicial'],
  [20, 'retiro', '1000000001', null, 300, 'Retiro en cajero'],
  [18, 'transferencia', '1000000002', '1000000001', 1500.5, 'Pago de alquiler'],
  [15, 'deposito', null, '1000000003', 1200.75, 'Sueldo'],
  [12, 'transferencia', '1000000004', '1000000002', 3200, 'Reembolso de gastos'],
  [10, 'retiro', '1000000002', null, 450.25, 'Compra en supermercado'],
  [8, 'transferencia', '1000000004', '1000000003', 600, 'Regalo de cumpleaños'],
  [6, 'deposito', null, '1000000001', 2400, 'Sueldo'],
  [5, 'retiro', '1000000003', null, 150, ''],
  [3, 'transferencia', '1000000001', '1000000005', 120, 'Compras compartidas'],
  [2, 'deposito', null, '1000000005', 35.4, 'Venta de libros'],
  [1, 'transferencia', '1000000002', '1000000004', 800, 'Cena en grupo'],
];

const aCentavos = (monto) => Math.round(monto * 100);

const sembrar = async () => {
  await connectDB();

  console.log('🧹 Limpiando colecciones...');
  await Promise.all([Cuenta.deleteMany({}), Transaccion.deleteMany({})]);

  // Se simulan las operaciones en memoria para que saldos e historial sean coherentes
  const saldos = new Map(CUENTAS.map((c) => [c.numeroCuenta, 0]));
  const cuentasCreadas = await Cuenta.insertMany(CUENTAS.map((c) => ({ ...c, saldoCentavos: 0 })));
  const idPorNumero = new Map(cuentasCreadas.map((c) => [c.numeroCuenta, c._id]));

  const ahora = Date.now();
  const transacciones = [];

  OPERACIONES.forEach(([dias, tipo, origen, destino, monto, descripcion], indice) => {
    const centavos = aCentavos(monto);

    if (origen) {
      if (saldos.get(origen) < centavos) {
        throw new Error(`Seed inconsistente: saldo insuficiente en ${origen} (operación #${indice + 1})`);
      }
      saldos.set(origen, saldos.get(origen) - centavos);
    }
    if (destino) saldos.set(destino, saldos.get(destino) + centavos);

    const fecha = new Date(ahora - dias * DIA + indice * 17 * 60 * 1000);
    transacciones.push({
      tipo,
      montoCentavos: centavos,
      cuentaOrigen: origen ? idPorNumero.get(origen) : null,
      cuentaDestino: destino ? idPorNumero.get(destino) : null,
      numeroCuentaOrigen: origen,
      numeroCuentaDestino: destino,
      descripcion,
      createdAt: fecha,
      updatedAt: fecha,
    });
  });

  await Transaccion.create(transacciones);

  await Cuenta.bulkWrite(
    [...saldos.entries()].map(([numeroCuenta, saldoCentavos]) => ({
      updateOne: { filter: { numeroCuenta }, update: { $set: { saldoCentavos } } },
    }))
  );

  console.log('\n✅ Datos de prueba creados:\n');
  console.table(
    CUENTAS.map((c) => ({
      'N.º de cuenta': c.numeroCuenta,
      Titular: c.titular,
      Tipo: c.tipo,
      Saldo: (saldos.get(c.numeroCuenta) / 100).toFixed(2),
    }))
  );
  console.log(`📒 ${transacciones.length} transacciones registradas.\n`);
};

sembrar()
  .catch((error) => {
    console.error('❌ Error en el seed:', error.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
