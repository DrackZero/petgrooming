# PetGrooming

Plataforma web para una veterinaria y peluquería de mascotas: gestión de mascotas e historial clínico, citas por veterinario, cursos y tienda con pagos en línea.

- **Frontend:** React + Vite + Tailwind CSS, desplegado en Vercel
- **Backend:** Node.js + Express (API REST), desplegado en Render
- **Base de datos:** PostgreSQL (Neon, serverless)
- **Pagos:** Wompi (Web Checkout + webhook de eventos)
- **Correos:** Resend

## Roles del sistema

| Rol | Capacidades |
|-----|-------------|
| Cliente | Ve sus mascotas e historial (solo lectura), agenda citas eligiendo veterinario, se inscribe en cursos, compra en la tienda |
| Veterinario | Registra mascotas de los clientes, gestiona vacunas e historial clínico, define sus horarios de atención (jornada laboral), confirma/completa citas |
| Administrador | Aprueba solicitudes de rol veterinario, gestiona productos, cursos y clientes, consulta reportes y alertas de pedidos |

Un usuario puede solicitar el rol de veterinario al registrarse; el administrador aprueba o rechaza la solicitud desde su panel.

## Estructura

```
petgrooming/
├── frontend/          SPA React (cliente, panel veterinario, panel admin)
└── backend/           API REST Express
    ├── sql/           schema.sql (13 tablas) y migraciones
    └── tests/         suites de pruebas de integración
```

## Puesta en marcha local

Requisitos: Node.js 18+, PostgreSQL.

1. Base de datos:

```bash
psql -U postgres -c "CREATE DATABASE petgrooming"
psql -U postgres -d petgrooming -f backend/sql/schema.sql
```

2. Backend:

```bash
cd backend
cp .env.example .env        # completar credenciales
npm install
npm run dev                 # http://localhost:4000
```

3. Frontend:

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                 # http://localhost:5173
```

Usuarios sembrados por el esquema (solo para desarrollo, cambiar en producción):

- Administrador: `admin@petgrooming.com` / `admin123`
- Veterinario: `vet@petgrooming.com` / `vet123`

## Pruebas

Con la API corriendo en local:

```bash
cd backend
node tests/history.test.mjs        # historial clínico (19 casos)
node tests/slots-bulk.test.mjs     # jornada laboral del veterinario (9)
node tests/order-expiry.test.mjs   # expiración de pedidos sin pagar (8)
node tests/wompi-webhook.test.mjs  # webhook de pagos (7)
node tests/vets-flow.test.mjs      # solicitud de rol y citas por vet (15)
```

## API principal

| Módulo | Base | Notas |
|--------|------|-------|
| Autenticación | `/api/auth` | register, login, refresh, logout, me. Access token (15 min) + refresh token (7 días) con rotación, en cookies httpOnly |
| Mascotas | `/api/pets` | Lectura para el dueño; escritura y vacunas solo veterinario |
| Citas | `/api/appointments` | Horarios por veterinario, reserva, reagenda, agenda del día, generación masiva de jornada |
| Cursos | `/api/courses` | Catálogo e inscripciones |
| Tienda | `/api/orders` | Productos, pedidos, reintento de pago y webhook de Wompi |
| Administración | `/api/admin` | Solicitudes de veterinario, productos, cursos, clientes, reportes |

## Pagos (Wompi)

La tienda cobra en pesos colombianos (COP) mediante el Web Checkout de Wompi. El estado del pedido lo define exclusivamente el webhook (`POST /api/orders/webhook`), validado con el secreto de eventos. Sin llaves configuradas, la tienda opera en modo simulado.

Los pedidos pendientes de pago expiran automáticamente (`ORDER_PENDING_TTL_MIN`, 30 minutos por defecto) y devuelven su stock.

## Variables de entorno (backend)

Ver `backend/.env.example`. Resumen:

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` o `PG*` | Conexión a PostgreSQL |
| `JWT_SECRET` | Firma de los access tokens |
| `CLIENT_URL` | Origen del frontend (CORS y cookies) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Correos transaccionales |
| `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` | Pasarela de pagos |
| `ORDER_PENDING_TTL_MIN` | Minutos antes de expirar un pedido sin pagar |

## Despliegue

- **Render (backend):** Web Service sobre `backend/`, comando `npm start`, con las variables de entorno anteriores.
- **Vercel (frontend):** proyecto sobre `frontend/`, framework Vite, variable `VITE_API_URL` apuntando a la URL pública del backend.
- **Neon (base de datos):** ejecutar `schema.sql` y las migraciones de `backend/sql/` en el SQL Editor.
- En el panel de Wompi, registrar la URL de eventos: `https://<backend>/api/orders/webhook`.
