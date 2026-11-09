# 🏦 BancoSimple · Sistema de Gestión de Cuenta Bancaria Simplificada

Aplicación full stack para consultar saldo, depositar, retirar y transferir dinero entre cuentas, con historial de movimientos en tiempo real.

- **Backend** (`/server`): Node.js, Express, JavaScript ES6+ (ESM), MongoDB local con Mongoose, dotenv, cors.
- **Frontend** (`/client`): React 18 + Vite, JSX, hooks (`useState`, `useEffect`), Tailwind CSS v4 (solo clases utilitarias), lucide-react.

## Características

- Acceso simple por número de cuenta (10 dígitos) o con un clic desde las cuentas de prueba.
- Tarjeta de saldo con gradiente, saldo animado, ocultar/mostrar saldo y copiar número de cuenta.
- Depósito, retiro y transferencia con validación visual (verde/rojo) y mensajes claros.
- Saldo e historial se actualizan al instante tras cada operación, sin recargar la página.
- Historial con iconos y colores por tipo: **verde** depósito, **rojo** retiro, **azul** transferencia, con filtros.
- Modo oscuro (recuerda tu preferencia), 100 % responsive, toasts de éxito/error, estados de carga y error.
- Dinero guardado en **centavos enteros** en la base de datos (sin errores de coma flotante).
- Transferencias atómicas: transacción de MongoDB si hay replica set; si no, actualización condicional atómica con compensación (rollback manual).

## Requisitos

| Herramienta | Versión recomendada |
|---|---|
| Node.js | 18 o superior (probado con 20/22) |
| npm | 9 o superior |
| MongoDB Community Server | 6.0 o superior (local) |

## Estructura

```
banco-app/
├── README.md
├── .gitignore
├── server/
│   ├── .env.example
│   ├── package.json
│   ├── server.js
│   ├── config/db.js
│   ├── models/{Cuenta,Transaccion}.js
│   ├── controllers/cuentaController.js
│   ├── routes/cuentaRoutes.js
│   ├── middleware/{errorHandler,validators}.js
│   ├── utils/AppError.js
│   └── seed/seed.js
└── client/
    ├── .env.example
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx · App.jsx · index.css
        ├── api/cuentaApi.js
        ├── hooks/{useTheme,useToasts}.js
        ├── utils/formato.js
        └── components/{Navbar,LoginCuenta,SaldoCard,FormOperacion,
                        HistorialTransacciones,Alerta,Loader}.jsx
```

## Instalación

```bash
# 1) Backend
cd server
npm install
cp .env.example .env        # Windows (PowerShell): Copy-Item .env.example .env

# 2) Frontend (en otra terminal)
cd client
npm install
cp .env.example .env        # opcional: el valor por defecto ya funciona
```

## Variables de entorno

### `server/.env`

| Variable | Ejemplo | Descripción |
|---|---|---|
| `PORT` | `5000` | Puerto de la API. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/banco_simplificado` | Cadena de conexión. La base de datos se crea sola al insertar datos. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origen(es) permitidos por CORS, separados por coma. |
| `NODE_ENV` | `development` | En `production` no se exponen detalles internos en errores 500. |

### `client/.env`

| Variable | Ejemplo | Descripción |
|---|---|---|
| `VITE_API_URL` | `/api` | Base de la API. Con `/api`, Vite redirige al backend (`http://localhost:5000`) mediante proxy, así que no hay problemas de CORS en desarrollo. |
| `VITE_MONEDA` | `PEN` | Código ISO 4217 de la moneda mostrada (`USD`, `EUR`, `MXN`…). |
| `VITE_LOCALE` | `es-PE` | Formato regional de números y fechas (`es-MX`, `es-ES`, `en-US`…). |

> Si cambias `PORT` en el servidor, actualiza también el `target` del proxy en `client/vite.config.js`.

## Iniciar MongoDB local

Elige **una** opción:

**macOS (Homebrew)**
```bash
brew tap mongodb/brew && brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu / Debian** (tras instalar MongoDB Community desde la documentación oficial)
```bash
sudo systemctl start mongod
sudo systemctl status mongod
```

**Windows**
- Si lo instalaste con el instalador oficial, MongoDB corre como servicio (`Services` → *MongoDB Server*). Si no está iniciado: `net start MongoDB` (terminal como administrador).
- O manualmente: `"C:\Program Files\MongoDB\Server\<versión>\bin\mongod.exe" --dbpath C:\data\db`

**Docker**
```bash
docker run -d --name mongo-banco -p 27017:27017 -v mongo-banco-data:/data/db mongo:7
```

Comprueba que responde: `mongosh --eval "db.runCommand({ ping: 1 })"`.

### (Opcional) Replica set para usar transacciones reales

Por defecto MongoDB local es *standalone* y **no soporta transacciones**; la API lo detecta al arrancar y usa la alternativa segura. Si quieres transacciones de Mongoose:

```bash
mongod --replSet rs0 --dbpath ./data --port 27017
# en otra terminal:
mongosh --eval "rs.initiate()"
```

Y en `server/.env`: `MONGODB_URI=mongodb://127.0.0.1:27017/banco_simplificado?replicaSet=rs0`

Al iniciar el servidor verás `🔒 Transacciones de MongoDB disponibles` o `ℹ️ MongoDB standalone...`.

## Ejecutar el proyecto

```bash
# Terminal 1: datos de prueba (cada ejecución borra y recrea las colecciones)
cd server
npm run seed

# Terminal 1: servidor (http://localhost:5000)
npm run dev        # recarga al guardar (node --watch)  |  npm start para producción

# Terminal 2: cliente (http://localhost:5173)
cd client
npm run dev
```

Abre <http://localhost:5173> y entra con una cuenta de prueba.

### Cuentas de prueba (`npm run seed`)

| N.º de cuenta | Titular | Tipo | Saldo |
|---|---|---|---|
| 1000000001 | Valentina Rojas | ahorros | 8 480.50 |
| 1000000002 | Mateo Fernández | corriente | 12 449.25 |
| 1000000003 | Camila Quispe | ahorros | 2 450.75 |
| 1000000004 | Andrés Salazar | corriente | 22 000.00 |
| 1000000005 | Lucía Paredes | ahorros | 205.40 |

Además se crean 16 transacciones históricas coherentes con esos saldos.

## API REST

Base URL: `http://localhost:5000/api`

Formato de error (siempre):
```json
{ "ok": false, "status": 400, "mensaje": "Saldo insuficiente para realizar la operación", "detalles": { "saldoDisponible": 205.4 } }
```

| Código | Cuándo |
|---|---|
| `200` / `201` | Consulta correcta / operación realizada |
| `400` | Datos inválidos o saldo insuficiente |
| `404` | Cuenta (o ruta) no encontrada |
| `500` | Error interno |

### `GET /api/cuenta` (extra)
Lista básica de cuentas (sin saldos) para el selector de cuentas de prueba.

### `GET /api/cuenta/:id`
Datos y saldo. `:id` es el número de cuenta de 10 dígitos.
```bash
curl http://localhost:5000/api/cuenta/1000000001
```
```json
{ "ok": true, "cuenta": { "id": "…", "numeroCuenta": "1000000001", "titular": "Valentina Rojas", "tipo": "ahorros", "saldo": 8480.5, "creadaEn": "…", "actualizadaEn": "…" } }
```

### `POST /api/cuenta/deposito`
Monto positivo (máx. 2 decimales, máx. 1 000 000). Aumenta el saldo y registra la transacción.
```bash
curl -X POST http://localhost:5000/api/cuenta/deposito \
  -H "Content-Type: application/json" \
  -d '{"numeroCuenta":"1000000001","monto":250.75,"descripcion":"Sueldo"}'
```
```json
{ "ok": true, "mensaje": "Depósito realizado con éxito",
  "cuenta": { "numeroCuenta": "1000000001", "saldo": 8731.25, "…": "…" },
  "transaccion": { "id": "…", "tipo": "deposito", "monto": 250.75, "direccion": "entrada", "cuentaOrigen": null, "cuentaDestino": "1000000001", "descripcion": "Sueldo", "fecha": "…" } }
```

### `POST /api/cuenta/retiro`
Falla con `400` si el monto supera el saldo (nunca queda negativo).
```bash
curl -X POST http://localhost:5000/api/cuenta/retiro \
  -H "Content-Type: application/json" \
  -d '{"numeroCuenta":"1000000005","monto":9999}'
# => 400 {"ok":false,"status":400,"mensaje":"Saldo insuficiente para realizar la operación","detalles":{"saldoDisponible":205.4}}
```

### `POST /api/cuenta/transferencia`
Valida que origen y destino existan y sean distintos, y que haya fondos. Actualiza ambos saldos de forma atómica. Devuelve la cuenta de origen actualizada.
```bash
curl -X POST http://localhost:5000/api/cuenta/transferencia \
  -H "Content-Type: application/json" \
  -d '{"cuentaOrigen":"1000000001","cuentaDestino":"1000000002","monto":100,"descripcion":"Cena"}'
```

### `GET /api/cuenta/:id/historial?limite=20`
Últimas transacciones (más recientes primero). `limite`: 1–100 (por defecto 20). Cada elemento incluye `tipo`, `monto`, `fecha`, `cuentaOrigen`, `cuentaDestino` y `direccion` (`entrada`/`salida` según la cuenta consultada).
```bash
curl "http://localhost:5000/api/cuenta/1000000001/historial?limite=5"
```

## Cómo se garantiza la atomicidad

1. **Replica set**: cada operación corre dentro de `session.withTransaction()`; si algo falla, se revierte todo.
2. **MongoDB standalone** (por defecto en local):
   - El débito usa `findOneAndUpdate({ saldoCentavos: { $gte: monto } }, { $inc: ... })`: la comprobación de fondos y el descuento son **una sola operación atómica**, por lo que dos retiros simultáneos no pueden dejar el saldo negativo.
   - Cada paso registra una *compensación*; si un paso posterior falla (p. ej. el crédito o el registro de la transacción), se deshacen los anteriores en orden inverso.
   - Limitación: si el proceso se cayera justo entre dos escrituras, no habría tiempo de compensar. Para producción, usa replica set.

## Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| `❌ No se pudo iniciar el servidor` | MongoDB no está corriendo o `MONGODB_URI` es incorrecta. |
| El login muestra «No se pudo conectar con el servidor» | La API no está en ejecución en el puerto 5000. |
| «No hay cuentas disponibles» en el login | Ejecuta `npm run seed` en `/server`. |
| «Cuenta no encontrada» tras volver a ejecutar el seed | Las cuentas se recrean; vuelve a ingresar. |
| Puerto 5173/5000 ocupado | Cambia `PORT` (server) o `server.port` (vite) y el `target` del proxy. |
| Fuentes no cargan | Se usan desde Google Fonts; sin internet se aplican fuentes del sistema. |

## Scripts

| Carpeta | Comando | Acción |
|---|---|---|
| server | `npm run dev` | API con recarga automática |
| server | `npm start` | API en modo normal |
| server | `npm run seed` | Borra y crea datos de prueba |
| client | `npm run dev` | Servidor de desarrollo de Vite |
| client | `npm run build` | Build de producción en `client/dist` |
| client | `npm run preview` | Sirve el build localmente |
