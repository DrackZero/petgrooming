# PetGrooming

Plataforma web para una veterinaria y peluquería de mascotas: gestión de mascotas e historial clínico, citas por veterinario, cursos y tienda con pagos en línea.

- **Frontend:** React + Vite + Tailwind CSS, desplegado en Vercel
- **Backend:** Node.js + Express (API REST), desplegado en Render
- **Base de datos:** PostgreSQL (Neon, serverless)
- **Pagos:** Wompi (Web Checkout + webhook de eventos)
- **Correos:** Resend



## Despliegue

- **Render (backend):** Web Service sobre `backend/`, comando `npm start`, con las variables de entorno anteriores.
- **Vercel (frontend):** proyecto sobre `frontend/`, framework Vite, variable `VITE_API_URL` apuntando a la URL pública del backend.
- **Neon (base de datos):** ejecutar `schema.sql` y las migraciones de `backend/sql/` en el SQL Editor.
- En el panel de Wompi, registrar la URL de eventos: `https://<backend>/api/orders/webhook`.
