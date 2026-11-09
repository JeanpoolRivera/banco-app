import mongoose from 'mongoose';

/**
 * El saldo se guarda en CENTAVOS (entero) para evitar errores de coma flotante
 * (0.1 + 0.2 !== 0.3). La API siempre expone el saldo en unidades decimales.
 */
const cuentaSchema = new mongoose.Schema(
  {
    numeroCuenta: {
      type: String,
      required: [true, 'El número de cuenta es obligatorio'],
      unique: true,
      trim: true,
      match: [/^\d{10}$/, 'El número de cuenta debe tener 10 dígitos'],
    },
    titular: {
      type: String,
      required: [true, 'El titular es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre del titular es demasiado corto'],
      maxlength: [80, 'El nombre del titular es demasiado largo'],
    },
    tipo: {
      type: String,
      enum: { values: ['ahorros', 'corriente'], message: 'Tipo de cuenta inválido' },
      default: 'ahorros',
    },
    saldoCentavos: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'El saldo no puede ser negativo'],
      validate: {
        validator: Number.isInteger,
        message: 'El saldo debe expresarse en centavos enteros',
      },
    },
  },
  { timestamps: true, versionKey: false }
);

const Cuenta = mongoose.model('Cuenta', cuentaSchema);

export default Cuenta;
