# PetGrooming

SaaS multi-clínica por suscripción para veterinarias y peluquerías de mascotas. Cada veterinaria se suscribe a un plan (Básico o Pro), su gerente la administra, sus veterinarios atienden, y los clientes agendan citas, compran en la tienda y usan el chat de urgencias.

- **Frontend:** React + Vite + Tailwind CSS, desplegado en Vercel
- **Backend:** Node.js + Express (API REST + WebSocket), desplegado en Render
- **Base de datos:** PostgreSQL (Neon, serverless)
- **Pagos:** Wompi (Web Checkout + webhook de eventos) para las suscripciones
- **Correos:** Resend (recuperación de contraseña, citas y pedidos)

## Roles del sistema

| Rol | Capacidades |
|-----|-------------|
| Cliente | Registra su primera mascota (para más, solicita aprobación del veterinario), consulta y descarga en PDF la historia clínica de su mascota, agenda citas eligiendo veterinario, compra en la tienda, se inscribe en cursos, chat de urgencias |
| Veterinario | Registra mascotas sin límite, aprueba solicitudes de mascota adicional, registra consultas clínicas (motivo, síntomas, diagnóstico, tratamiento, medicamentos) y vacunas, descarga la historia clínica en PDF, define su jornada laboral, gestiona sus citas en el calendario mensual, atiende el chat |
| Gerente | Dirige UNA clínica (no atiende): aprueba a sus veterinarios, edita la clínica, ve sus reportes, gestiona su tienda y cursos (solo plan Pro), paga o cambia su suscripción |
| Administrador | Plataforma: activa/suspende clínicas, asigna planes, consulta ingresos por suscripción. No ve datos operativos de las clínicas |

## Modelo de suscripción

1. El gerente se registra con su veterinaria → nace `pendiente` en plan Básico.
2. Paga la suscripción (Básico $60.000 / Pro $150.000 COP/mes) y la clínica se activa con una vigencia de 30 días.
3. Cada pago queda en `subscription_payments`; renovar antes de vencer **suma** días al periodo restante.
4. Al vencer, la clínica se suspende sola: sus veterinarios no pueden operar, sus horarios no se ofrecen y su tienda se oculta. Renovar la reactiva al instante.
5. El plan Pro habilita tienda y cursos propios; bajar a Básico es inmediato y los desactiva.

El cobro admite dos modos: **Wompi real** (Web Checkout, la clínica se activa desde el webhook) o **simulado** (`SUBSCRIPTION_MOCK=true`, el gerente confirma el pago sin pasarela). Las tiendas de las clínicas operan siempre en modo simulado — cada clínica integrará su propia pasarela a futuro.

El admin ve el **recaudo real del mes** frente al **proyectado**, los vencimientos próximos, y dispone de "vencer ahora" y "extender vigencia" para gestionar casos puntuales.

## Estructura

```
petgrooming/
├── frontend/          SPA React (cliente, veterinario, gerente y admin)
└── backend/           API REST Express + WebSocket (/ws)
    ├── sql/           schema.sql y migraciones incrementales
    └── tests/         suites de pruebas de integración (~185 casos)
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
node tests/history.test.mjs           # historial clínico portable
node tests/slots-bulk.test.mjs        # jornada laboral del veterinario
node tests/order-expiry.test.mjs      # expiración de pedidos sin pagar
node tests/wompi-webhook.test.mjs     # webhook de pagos
node tests/vets-flow.test.mjs         # solicitud de rol y citas por vet
node tests/chat.test.mjs              # chat de urgencias (WebSocket)
node tests/multiclinic.test.mjs       # multi-clínica y auditoría break-glass
node tests/gerente-flow.test.mjs      # rol gerente y candado de suscripción
node tests/gerente-manage.test.mjs    # gestión de veterinarios por el gerente
node tests/store-clinic.test.mjs      # tienda y cursos por clínica (plan Pro)
node tests/subscription-pay.test.mjs  # pago de suscripción por Wompi
node tests/pets-limit.test.mjs        # límite de mascotas y solicitudes
node tests/calendar-summary.test.mjs  # calendario mensual del veterinario
node tests/password-reset.test.mjs    # recuperación de contraseña
node tests/subscription-cycle.test.mjs # ciclo de vida de la suscripción
node tests/consultations-pdf.test.mjs # consultas clínicas y PDF del historial
```

## API principal

| Módulo | Base | Notas |
|--------|------|-------|
| Autenticación | `/api/auth` | register, login, refresh, logout, me, forgot, reset. Access token (15 min) + refresh token (7 días) con rotación, en cookies httpOnly |
| Mascotas | `/api/pets` | El cliente registra 1; las adicionales vía solicitud que aprueba un veterinario. Vacunas y consultas clínicas, solo veterinario |
| Historia clínica | `/api/pets/:id/history` · `/consultations` · `/history.pdf` | Consultas con motivo, síntomas, diagnóstico, tratamiento y medicamentos; descarga en PDF para el veterinario y el dueño |
| Citas | `/api/appointments` | Horarios por veterinario, reserva, reagenda, agenda del día, resumen del calendario mensual, jornada masiva |
| Clínicas | `/api/clinics` | Listado público de clínicas activas |
| Gerente | `/api/gerente` | Su clínica, sus veterinarios, reportes, suscripción, tienda y cursos (Pro) |
| Cursos | `/api/courses` | Catálogo (solo clínicas Pro con tienda activa) e inscripciones |
| Tienda | `/api/orders` | Productos por clínica, pedidos, reintento de pago y webhook de Wompi |
| Chat | `/api/chat` + `/ws` | Chat de urgencias cliente↔veterinario en vivo (WebSocket con auth por cookie) |
| Administración | `/api/admin` | Clínicas, planes, ingresos por suscripción, clientes, reportes |

## Seguridad

- Contraseñas con bcrypt; sesiones en cookies httpOnly con rotación de refresh tokens.
- Recuperación de contraseña con token de un solo uso (hash SHA-256 en BD, vence en 1 hora); al usarse revoca todas las sesiones. La respuesta de `/auth/forgot` es genérica para no revelar cuentas.
- Historial clínico portable entre clínicas con bitácora de acceso "break-glass" (`emergency_access_log`); descargar la historia clínica en PDF también queda auditado.
- El PDF de la historia clínica solo lo obtienen el dueño de la mascota y los veterinarios; cualquier otro usuario recibe 404.
- Webhook de Wompi validado con el secreto de eventos (checksum SHA-256).

## Pagos (Wompi)

Las suscripciones se cobran en COP mediante el Web Checkout de Wompi (referencia `SUB-<clinicId>-<plan>`); el webhook (`POST /api/orders/webhook`) activa la clínica al aprobarse el pago. Sin llaves configuradas, todo opera en modo simulado.

Los pedidos de tienda pendientes expiran automáticamente (`ORDER_PENDING_TTL_MIN`, 30 minutos por defecto) y devuelven su stock.

## Variables de entorno (backend)

Ver `backend/.env.example`. Resumen:

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` o `PG*` | Conexión a PostgreSQL |
| `JWT_SECRET` | Firma de los access tokens |
| `CLIENT_URL` | Origen del frontend (CORS, cookies y enlaces de correo) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Correos transaccionales |
| `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` | Pasarela de pagos |
| `ORDER_PENDING_TTL_MIN` | Minutos antes de expirar un pedido sin pagar |
| `SUBSCRIPTION_MOCK` | `true` = el gerente paga la suscripción en modo simulado (sin Wompi) |
| `SUBSCRIPTION_DAYS` | Días que cubre cada pago de suscripción (30 por defecto) |

## Despliegue

- **Render (backend):** Web Service sobre `backend/`, comando `npm start`, con las variables de entorno anteriores.
- **Vercel (frontend):** proyecto sobre `frontend/`, framework Vite, variable `VITE_API_URL` apuntando a la URL pública del backend.
- **Neon (base de datos):** ejecutar `schema.sql` y las migraciones de `backend/sql/` en el SQL Editor.
- En el panel de Wompi, registrar la URL de eventos: `https://<backend>/api/orders/webhook`.
