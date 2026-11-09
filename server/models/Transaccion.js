import mongoose from 'mongoose';

export const TIPOS_TRANSACCION = ['deposito', 'retiro', 'transferencia'];

/**
 * Registro inmutable de cada movimiento.
 *  - deposito:      solo cuentaDestino
 *  - retiro:        solo cuentaOrigen
 *  - transferencia: cuentaOrigen y cuentaDestino (distintas)
 * Se guarda también el número de cuenta (desnormalizado) para consultar el
 * historial sin necesidad de populate.
 */
const transaccionSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      required: [true, 'El tipo de transacción es obligatorio'],
      enum: { values: TIPOS_TRANSACCION, message: 'Tipo de transacción inválido' },
    },
    montoCentavos: {
      type: Number,
      required: [true, 'El monto es obligatorio'],
      min: [1, 'El monto debe ser mayor que cero'],
      validate: {
        validator: Number.isInteger,
        message: 'El monto debe expresarse en centavos enteros',
      },
    },
    cuentaOrigen: { type: mongoose.Schema.Types.ObjectId, ref: 'Cuenta', default: null },
    cuentaDestino: { type: mongoose.Schema.Types.ObjectId, ref: 'Cuenta', default: null },
    numeroCuentaOrigen: { type: String, default: null },
    numeroCuentaDestino: { type: String, default: null },
    descripcion: { type: String, trim: true, maxlength: 120, default: '' },
  },
  { timestamps: true, versionKey: false }
);

// Coherencia entre el tipo y las cuentas implicadas
transaccionSchema.pre('validate', function validarCoherencia() {
  const { tipo, numeroCuentaOrigen: origen, numeroCuentaDestino: destino } = this;

  if (tipo === 'deposito' && (!destino || origen)) {
    this.invalidate('tipo', 'Un depósito requiere solo cuenta de destino');
  }
  if (tipo === 'retiro' && (!origen || destino)) {
    this.invalidate('tipo', 'Un retiro requiere solo cuenta de origen');
  }
  if (tipo === 'transferencia' && (!origen || !destino || origen === destino)) {
    this.invalidate('tipo', 'Una transferencia requiere cuentas de origen y destino distintas');
  }
});

// Índices para el historial (más reciente primero)
transaccionSchema.index({ numeroCuentaOrigen: 1, createdAt: -1 });
transaccionSchema.index({ numeroCuentaDestino: 1, createdAt: -1 });

const Transaccion = mongoose.model('Transaccion', transaccionSchema);

export default Transaccion;
