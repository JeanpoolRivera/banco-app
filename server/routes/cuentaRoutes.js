import { Router } from 'express';

import {
  listarCuentas,
  obtenerCuenta,
  depositar,
  retirar,
  transferir,
  obtenerHistorial,
} from '../controllers/cuentaController.js';
import {
  validarIdParam,
  validarHistorialQuery,
  validarDepositoRetiro,
  validarTransferencia,
} from '../middleware/validators.js';

const router = Router();

// Las rutas estáticas van antes que las paramétricas (/:id)
router.get('/', listarCuentas);
router.post('/deposito', validarDepositoRetiro, depositar);
router.post('/retiro', validarDepositoRetiro, retirar);
router.post('/transferencia', validarTransferencia, transferir);

router.get('/:id/historial', validarIdParam, validarHistorialQuery, obtenerHistorial);
router.get('/:id', validarIdParam, obtenerCuenta);

export default router;
