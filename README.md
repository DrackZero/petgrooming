# 🐾 PetGrooming

Plataforma para una peluquería canina/felina: gestión de **mascotas, citas, cursos y tienda online**, con panel de administración.

- **Frontend:** React + Vite + Tailwind → desplegable en **Vercel**
- **Backend:** Node + Express + PostgreSQL → desplegable en **Render**
- **Auth:** JWT en cookie `httpOnly` + roles (`client` / `admin`)

---

## 📁 Estructura

```
petgrooming/
├── frontend/   # React + Tailwind (SPA)
└── backend/    # API REST Express + PostgreSQL
```

---

## 🚀 Puesta en marcha (local)

### 1. Base de datos
Crea una base PostgreSQL y carga el esquema (13 tablas):

```bash
psql -U postgres -d petgrooming -f backend/sql/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env      # rellena tus credenciales
npm install
npm run dev               # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev               # http://localhost:5173
```

> **Admin de prueba:** `admin@petgrooming.com` (cambia el hash sembrado en `schema.sql` por uno real generado con bcrypt).

---

## 🔌 Endpoints principales

| Módulo        | Base                    | Notas                          |
|---------------|-------------------------|--------------------------------|
| Auth          | `/api/auth`             | register, login, logout, me    |
| Mascotas      | `/api/pets`             | CRUD (requiere sesión)         |
| Citas         | `/api/appointments`     | slots + reservas               |
| Cursos        | `/api/courses`          | catálogo + inscripciones       |
| Tienda        | `/api/orders`           | productos + pedidos            |
| Administración| `/api/admin`            | solo rol `admin`               |

---

## 🗄️ Las 13 tablas

`users`, `pets`, `services`, `slots`, `appointments`, `courses`,
`enrollments`, `products`, `orders`, `order_items`, `payments`,
`notifications`, `settings`.

---

## ☁️ Despliegue

- **Backend (Render):** crea un *Web Service* apuntando a `backend/`, comando `npm start`, y añade las variables de `.env`. Usa una base PostgreSQL gestionada (Render/Neon/Supabase) y define `DATABASE_URL`.
- **Frontend (Vercel):** importa `frontend/`, framework *Vite*, variable `VITE_API_URL` con la URL pública del backend.
- Recuerda configurar `CLIENT_URL` en el backend para que **CORS** y las cookies `httpOnly` funcionen entre dominios (`sameSite=none`, `secure=true`).

---

## 🛠️ Pendiente / ideas

- Integrar pasarela de pago real en `payment.service.js`.
- Tabla `services` editable desde el admin.
- Gráficas en *Reports* (Recharts).
- Notificaciones en la campana usando la tabla `notifications`.
