# PetGrooming — Estado del proyecto (handoff)

> Documento de continuidad. Léelo primero para saber en qué punto está el proyecto y qué sigue.
> Última actualización: sesión que cerró la Fase C + suscripción por Wompi + limpieza + UX.

## Qué es

SaaS **multi-clínica por suscripción** para veterinarias/peluquerías de mascotas.
Una veterinaria se suscribe (plan Básico/Pro), su gerente la administra, sus veterinarios
atienden, y los clientes (dueños de mascotas) agendan citas, compran y usan el chat de urgencias.

## Stack e infraestructura

- **Frontend:** React 18 + Vite + Tailwind → **Vercel** → https://petgrooming-tau.vercel.app
- **Backend:** Node + Express (ESM) + WebSocket (`ws`) → **Render** → https://petgrooming.onrender.com
- **BD:** PostgreSQL en **Neon** (serverless)
- **Pagos:** Wompi (Web Checkout + webhook). **Solo la suscripción usa Wompi real**; las tiendas de clínicas están en **modo simulación (mock)**.
- **Correos:** Resend
- **Repo:** https://github.com/DrackZero/petgrooming  (usuario git: Johan Esteban Martinez)

## Reglas de trabajo IMPORTANTES

1. **Yo (Claude) NO tengo la contraseña de Neon.** Toda migración SQL la aplica el usuario en el **SQL Editor de Neon**. Nunca pedir que pegue la connection string en el chat.
2. **La BD local sí la manejo:** password local = `johan883`, psql en `C:\Program Files\PostgreSQL\18\bin\psql.exe`, base `petgrooming`.
3. **Flujo de despliegue:** commit → (si hay migración nueva, el usuario la corre en Neon primero) → `git push` → Render y Vercel redespliegan solos (~2-3 min). Render gratis "duerme" a los 15 min; primera petición tarda ~40s.
4. **Verificación de producción:** tras el push, esperar ~140s y probar endpoints con un script en background.
5. **Vercel a veces se salta un deploy;** si el bundle no cambia, un commit vacío (`git commit --allow-empty`) lo redispara.
6. Los warnings `LF will be replaced by CRLF` en git son normales (Windows), ignorar.
7. **Servidores locales:** hay `.claude/launch.json` (en la carpeta padre `Documents`). Backend puerto 4000, frontend 5173. No gastan horas de Render.

## Roles (4)

| Rol | Qué hace |
|---|---|
| **cliente** | Dueño de mascota. Agenda citas (elige veterinario), compra en tienda, cursos, chat de urgencias, ve sus mascotas/historial en solo lectura. |
| **veterinario** | Atiende: registra mascotas y vacunas, historial clínico, define su jornada (horarios), gestiona sus citas. Pertenece a UNA clínica. NO administra el negocio. |
| **gerente** | Dirige UNA clínica (NO atiende). Aprueba/gestiona SUS veterinarios, edita la clínica, ve SUS reportes, gestiona su tienda/cursos (solo plan Pro), paga/cambia su suscripción. |
| **admin** (plataforma = el dueño del software) | Activa/suspende clínicas, asigna planes, ve **ingresos por suscripción**. NO ve datos operativos de las clínicas. |

## Base de datos (migraciones aplicadas)

Esquema base en `backend/sql/schema.sql`. Migraciones incrementales:
- `migration-002-veterinarios.sql` — vet_requested, availability_slots.vet_id (aplicada)
- `migration-003-chat.sql` — conversations, messages (aplicada)
- `migration-004-clinicas.sql` — clinics, users.clinic_id, vaccines.vet_id, emergency_access_log (aplicada)
- `migration-005-gerente.sql` — rol `gerente`, clinics.status/plan/manager_id (aplicada)
- `migration-006-tienda-clinica.sql` — products.clinic_id, courses.clinic_id, clinics.store_enabled (aplicada)
- `migration-007-pet-requests.sql` — tabla `pet_requests` (límite de 1 mascota autoregistrada por cliente + solicitud de mascota adicional) (aplicada)
- `migration-008-password-reset.sql` — tabla `password_resets` (recuperación de contraseña, token hasheado de un solo uso, vence en 1 h). **Aplicada en local, PENDIENTE en Neon.**

**Suscripción:** clinics.status = pendiente|activa|suspendida ; clinics.plan = basico|pro.
Precios (backend `admin.controller.js` PLAN_PRICES): básico 60.000, pro 150.000 COP/mes.
**Candado:** un veterinario solo opera si su clínica está `activa` (middleware `requireActiveClinic`).
**Tienda:** el cliente solo ve productos de clínicas `activa` + `pro` + `store_enabled=true`.

## Flujo de negocio (ya funciona end-to-end)

1. Gerente se registra (tipo "🏥 Veterinaria") → su clínica nace `pendiente` plan `basico`.
2. Gerente paga suscripción por **Wompi real** (ref `SUB-<clinicId>-<plan>`) → el webhook activa la clínica con ese plan.
   - También puede: mejorar a Pro (pago) o bajar a Básico (inmediato, apaga la tienda). Admin también puede cambiar plan/estado.
3. Veterinario se registra (tipo "🩺 Veterinario") eligiendo una clínica activa → el **gerente de esa clínica** lo aprueba.
4. Veterinario define su jornada, registra mascotas/vacunas, atiende citas. También registra mascotas sin límite y aprueba/rechaza solicitudes de mascota adicional de los clientes (cualquier vet activo ve la cola global, igual que ya ve todo el historial portable).
5. Cliente agenda (elige veterinario con disponibilidad), compra (pago **mock**), usa chat de urgencias. Registra él mismo su **primera mascota**; para una adicional debe enviar una **solicitud** que aprueba un veterinario (tabla `pet_requests`).

## Funcionalidades destacadas ya implementadas

- Auth: access token 15min + refresh token 7d con rotación (cookies httpOnly).
- **Recuperación de contraseña**: "¿Olvidaste tu contraseña?" en el login → `/forgot-password` pide el email (respuesta genérica, no revela cuentas) → correo por Resend con enlace a `/reset-password?token=…` → token de un solo uso (SHA-256 en BD, vence 1 h); al usarse revoca todas las sesiones. Fuera de producción `/auth/forgot` devuelve `debug_token` para pruebas.
- **Calendario del vet** muestra también los días con horario libre sin reservar (estado `disponible`, punto índigo), no solo los días con citas.
- Historial clínico **portable entre clínicas** + bitácora de acceso "break-glass" (`emergency_access_log`).
- **Chat de emergencia en vivo** cliente↔veterinario por WebSocket (`/ws`, auth por cookie).
- **Calendario mensual** del veterinario (estilo Q10).
- **Jornada laboral masiva** (genera muchos horarios de una vez).
- **Expiración de pedidos** pendientes (30 min → devuelve stock) + "Pagar ahora".
- **Tooltips** informativos, **selector visual de especie** (perro/gato/otro), lightbox de imágenes, diseño responsive (menú hamburguesa), moneda COP.

## Pruebas (todas en verde, ~185 casos)

En `backend/tests/`, correr con la API local levantada: `node tests/<archivo>`
- history, slots-bulk, order-expiry, wompi-webhook, vets-flow, chat, multiclinic, gerente-flow, gerente-manage, store-clinic, subscription-pay, pets-limit, calendar-summary, password-reset

## Cuentas semilla (tras la limpieza, son las ÚNICAS en producción)

- Admin de plataforma: `admin@petgrooming.com` / `admin123`
- Veterinario: `vet@petgrooming.com` / `vet123`
- Clínica semilla: **PetGrooming Yopal** (activa, plan Pro, tienda activa, 11 productos). Sin gerente asignado.

## PENDIENTES (por dónde seguir)

1. **Cambiar contraseñas por defecto** (`admin123`/`vet123`): son débiles (disparan el aviso de "contraseña filtrada" del navegador) y están en el repo. Generar hashes bcrypt nuevos, actualizar seed en `schema.sql`, dar SQL para Neon (`UPDATE users SET password_hash=... WHERE email=...`).
2. **Actualizar el documento técnico** (`Petgrooming_Arquitectura_v*.docx` en Descargas y/o `PetGrooming_Informe_Tecnico.docx`) con TODO lo nuevo: 4 roles, suscripción, chat, calendario, multi-clínica, tienda por clínica. (El generador está en `docs/build-informe-tecnico.mjs` — quedó desactualizado, contempla hasta antes de multi-clínica.)
3. **Futuro grande:** Wompi propio por clínica para sus tiendas (hoy mock) + cobro recurrente automático de la suscripción (hoy es pago único que activa; la suspensión por impago es manual del admin).
4. **PetGrooming Yopal sin gerente:** sus 11 productos no son editables por nadie (no hay gerente). Si se quiere, asignarle un gerente o dejarlo como "tienda de plataforma".

## Notas de decisiones tomadas

- Gerente ≠ veterinario (carriles separados; el usuario fue explícito).
- Tiendas de clínica en mock a propósito (cada clínica tendrá su Wompi a futuro); la Wompi de la plataforma es solo para cobrar suscripciones.
- Los productos que crea el admin van a la clínica semilla (tienda de la plataforma).
- Límite de mascotas: el cliente autoregistra solo 1; para más, la solicitud la aprueba el **veterinario** (no el gerente) — el usuario delegó la decisión. Se eligió vet porque ya es quien gestiona mascotas/historial y las ve todas (portable entre clínicas); el gerente nunca toca datos clínicos. Cualquier vet activo ve la cola global de solicitudes (no hay clínica asignada al cliente).
