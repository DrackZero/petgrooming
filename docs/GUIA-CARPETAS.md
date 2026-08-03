# Guía de carpetas — PetGrooming

Para qué existe cada parte del proyecto. Si te preguntas *"¿dónde toco esto?"*,
empieza aquí.

---

## Panorama general

```
petgrooming/
├── backend/        API REST + WebSocket (Node + Express)
├── frontend/       Aplicación web (React + Vite)
├── docs/           Documentación y generadores de documentos
└── README.md       Resumen del proyecto y puesta en marcha
```

La regla que ordena todo: **el frontend nunca toca la base de datos**. Pide datos
al backend por HTTP y el backend es el único que habla con PostgreSQL. Por eso
las validaciones importantes viven en el backend: el frontend se puede saltar
(basta abrir la consola del navegador), el backend no.

---

## `backend/` — la API

```
backend/
├── .env                Credenciales reales (NO se sube a Git)
├── .env.example        Plantilla de las variables, sí versionada
├── package.json        Dependencias y scripts (npm run dev / start)
├── sql/                Esquema de la base de datos y migraciones
├── src/                Código de la API
└── tests/              Pruebas de integración
```

### `backend/sql/` — la base de datos

| Archivo | Para qué |
|---|---|
| `schema.sql` | Esquema completo desde cero: las 21 tablas con sus restricciones y los usuarios semilla. Se ejecuta una sola vez al crear la base. |
| `migration-0XX-*.sql` | Cambios incrementales aplicados **después** de que la base ya existía. Cada uno es idempotente (se puede correr varias veces sin romper nada). |

**Por qué existen las dos cosas.** `schema.sql` es la foto final; las migraciones
son la película. Producción ya tiene datos, así que nunca se recrea desde cero: se
le aplican migraciones. Cuando agregues una columna, va en **los dos sitios** —
en `schema.sql` para quien instale de cero, y en una migración nueva para
producción.

### `backend/src/` — el código de la API

```
src/
├── index.js          Punto de entrada: levanta Express, monta las rutas y el WebSocket
├── ws.js             Servidor WebSocket del chat de urgencias
├── config/db.js      Conexión a PostgreSQL (pool) y el helper query()
├── routes/           Qué URL responde a qué función
├── controllers/      La lógica de cada operación
├── middlewares/      Código que se ejecuta ANTES del controlador
├── services/         Trabajo especializado reutilizable
└── utils/hash.js     Cifrado y comparación de contraseñas (bcrypt)
```

**`routes/`** — Solo mapea URLs a funciones y declara qué middlewares pasan antes.
No tiene lógica. Un archivo por módulo: `pets.routes.js` responde a `/api/pets`.

**`controllers/`** — Aquí está el "qué hace" cada endpoint: recibe la petición,
valida, consulta la base de datos y responde. Es donde más vas a trabajar.

**`middlewares/`** — Filtros que corren antes del controlador:
- `auth.middleware.js` — verifica que haya sesión válida (`authRequired`)
- `role.middleware.js` — verifica el rol (`vetOnly`, `managerOnly`, `adminOnly`,
  `clientOnly`) y el candado de suscripción (`requireActiveClinic`)
- `error.middleware.js` — captura cualquier error y devuelve una respuesta JSON
  uniforme en vez de que se caiga el servidor

**`services/`** — Trabajo especializado que varios controladores reutilizan:

| Servicio | Responsabilidad |
|---|---|
| `subscription.service.js` | Precios de los planes, registrar un pago, extender la vigencia y suspender clínicas vencidas |
| `payment.service.js` | Firma de integridad de Wompi y verificación del webhook |
| `email.service.js` | Envío de correos por Resend y todas las plantillas |
| `pdf.service.js` | Construcción del PDF de la historia clínica |

**Por qué separarlos de los controladores:** `registerSubscriptionPayment()` la usan
tanto el webhook de Wompi como el pago simulado. Si viviera en un controlador,
el otro tendría que duplicar la lógica y tarde o temprano se desincronizan.

### `backend/tests/` — las pruebas

Un archivo por área (`clinic-hours.test.mjs`, `subscription-cycle.test.mjs`, …).
Se ejecutan con `node tests/<archivo>` con la API local levantada.

No usan framework: son scripts que llaman a la API real contra la base de datos
real y cuentan aciertos y fallos. Cada prueba crea sus propios datos y los borra
al final, así que se pueden repetir sin ensuciar la base.

---

## `frontend/` — la aplicación web

```
frontend/
├── index.html            Página raíz donde React se monta
├── vite.config.js        Configuración del empaquetador
├── tailwind.config.js    Paleta de colores y tipografía de la marca
├── vercel.json           Reescritura de rutas (evita el 404 al recargar)
└── src/                  Todo el código de la interfaz
```

### `frontend/src/`

```
src/
├── main.jsx        Arranque: monta App y envuelve todo en los proveedores
├── App.jsx         Mapa de rutas: qué URL muestra qué página
├── index.css       Estilos base, animaciones y clases reutilizables
├── api/            Funciones que llaman al backend
├── pages/          Una pantalla completa cada una
├── components/     Piezas reutilizables entre pantallas
├── context/        Estado compartido por toda la aplicación
├── hooks/          Atajos para consumir ese estado compartido
├── routes/         Protección de rutas por rol
└── utils/          Funciones auxiliares pequeñas
```

**`api/`** — Un archivo por módulo del backend. Ninguna pantalla llama a `fetch`
directamente: llama a estas funciones. Así, si cambia una URL, se corrige en un
solo sitio.

`client.js` es el más importante: configura la dirección del backend, envía las
cookies de sesión y contiene el **interceptor** que renueva el token cuando expira
y reintenta la petición, todo sin que el usuario lo note.

**`pages/`** — Una pantalla por archivo. Están agrupadas por rol:

| Carpeta | Quién la usa |
|---|---|
| `pages/*.jsx` | Público y cliente (inicio, tienda, ficha de producto, citas, mascotas, chat) |
| `pages/vet/` | Veterinario (agenda, mascotas, horarios) |
| `pages/gerente/` | Gerente (su clínica, sus veterinarios, reportes, tienda) |
| `pages/admin/` | Administrador de la plataforma (clínicas, clientes, reportes) |

**`components/`** — Lo que se repite en varias pantallas. Algunos que conviene
conocer:

| Componente | Qué resuelve |
|---|---|
| `WeekSchedule.jsx` | La rejilla semanal de horas × días del veterinario |
| `MonthCalendar.jsx` | El calendario mensual con puntos por estado |
| `ConfirmDialog.jsx` | El diálogo de confirmación propio |
| `Skeleton.jsx` | Los esqueletos de carga |
| `EmptyState.jsx` | Los estados vacíos con explicación y acción |
| `BarList.jsx` / `TrendBars.jsx` | Las gráficas, sin librerías externas |

**`context/` y `hooks/`** — Van en pareja. El *context* guarda el estado y el
*hook* es el atajo para leerlo:

| Context | Hook | Qué guarda |
|---|---|---|
| `AuthContext` | `useAuth()` | Usuario con sesión iniciada y su rol |
| `CartContext` | `useCart()` | Carrito de compras (se persiste en el navegador) |
| `ConfirmContext` | `useConfirm()` | El diálogo de confirmación compartido |

**`routes/ProtectedRoute.jsx`** — Envuelve las rutas que exigen sesión o un rol
concreto. Si un cliente intenta entrar a `/vet/agenda`, este componente lo
redirige. Es comodidad de interfaz, **no seguridad**: la seguridad real está en
los middlewares del backend.

---

## `docs/` — documentación

| Archivo | Para qué |
|---|---|
| `ESTADO-PROYECTO.md` | **Léelo primero.** Estado actual, decisiones tomadas y qué sigue. Es el documento de continuidad entre sesiones de trabajo. |
| `GUIA-CARPETAS.md` | Este archivo. |
| `MANUAL-CODIGO.md` | Cómo funciona el código por dentro y dónde tocar para cada tarea. |
| `build-informe-tecnico.mjs` | Genera el informe técnico en Word. |
| `build-manual-usuario.mjs` | Genera el manual de usuario en Word. |

Los generadores se ejecutan con `node docs/<archivo>.mjs` y escriben el `.docx` en
la carpeta de Descargas. Se versiona **el generador**, no el documento: así el
Word siempre se puede reconstruir y no hay copias desactualizadas dando vueltas.

---

## Archivos que NO están en Git

| Archivo | Por qué |
|---|---|
| `backend/.env` | Contiene contraseñas y llaves reales |
| `frontend/.env` | Dirección del backend según el entorno |
| `node_modules/` | Se reconstruye con `npm install` |
| `frontend/dist/` | Se reconstruye con `npm run build` |

Si clonas el proyecto en otro equipo, copia los `.env.example` a `.env` y
completa los valores.
