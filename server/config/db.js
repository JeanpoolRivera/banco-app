import mongoose from 'mongoose';

/**
 * Indica si la instancia de MongoDB conectada soporta transacciones
 * (solo replica set o cluster sharded). En un MongoDB local "standalone"
 * será false y el controlador usará la estrategia alternativa segura.
 */
let transaccionesSoportadas = false;

export const soportaTransacciones = () => transaccionesSoportadas;

/**
 * Detecta si el servidor es un replica set o un mongos (sharded).
 */
const detectarSoporteTransacciones = async () => {
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    const esReplicaSet = Boolean(info.setName);
    const esMongos = info.msg === 'isdbgrid';
    transaccionesSoportadas = esReplicaSet || esMongos;
  } catch {
    transaccionesSoportadas = false;
  }
};

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'La variable de entorno MONGODB_URI no está definida. Copia .env.example a .env y configúrala.'
    );
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  await detectarSoporteTransacciones();

  console.log(`✅ MongoDB conectado: ${mongoose.connection.host}/${mongoose.connection.name}`);
  console.log(
    transaccionesSoportadas
      ? '🔒 Transacciones de MongoDB disponibles (replica set).'
      : 'ℹ️  MongoDB standalone: se usará actualización condicional atómica con compensación.'
  );

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB desconectado.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ Error de MongoDB:', err.message);
  });
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
};
