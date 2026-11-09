import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { connectDB, disconnectDB } from './config/db.js';
import cuentaRoutes from './routes/cuentaRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middlewares globales ----------
const origenesPermitidos = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origenesPermitidos,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);
app.use(express.json({ limit: '10kb' }));

// ---------- Rutas ----------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, servicio: 'banco-server', fecha: new Date().toISOString() });
});

app.use('/api/cuenta', cuentaRoutes);

// ---------- Manejo de errores (siempre al final) ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Arranque ----------
let server;

const iniciar = async () => {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      console.log(`🚀 API lista en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ No se pudo iniciar el servidor:', error.message);
    console.error('   ¿Está MongoDB en ejecución? Revisa el README (sección "Iniciar MongoDB").');
    process.exit(1);
  }
};

const apagar = async (senal) => {
  console.log(`\n${senal} recibido. Cerrando servidor...`);
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));

iniciar();
