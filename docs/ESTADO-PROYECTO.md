# PetGrooming — Estado del proyecto (handoff)

> Documento de continuidad. Léelo primero para saber en qué punto está el proyecto y qué sigue.
> Última actualización: 25/07/2026 — sesión que agregó límite de mascotas, recuperación de contraseña,
> ciclo de vida de la suscripción, historia clínica estructurada + PDF, agenda semanal estilo Q10 y
> pulido visual. Todo desplegado y verificado en producción; informe técnico regenerado.

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
- `migration-008-password-reset.sql` — tabla `password_resets` (recuperación de contraseña, token hasheado de un solo uso, vence en 1 h) (aplicada)
- `migration-009-ciclo-suscripcion.sql` — `clinics.subscription_expires_at` + tabla `subscription_payments` (la suscripción ahora vence y se renueva) (aplicada)
- `migration-010-consultas.sql` — tabla `consultations` (historia clínica estructurada: motivo, síntomas, diagnóstico, tratamiento, medicamentos) (aplicada y verificada en producción)
- `migration-011-horario-clinica.sql` — `clinics.opens_at` / `closes_at` (horario de atención configurable por clínica, 07:00–19:00 por defecto). **Aplicada en local, PENDIENTE en Neon.**

**Suscripción:** clinics.status = pendiente|activa|suspendida ; clinics.plan = basico|pro ;
clinics.subscription_expires_at = vigencia (NULL = nunca pagó).
Precios (backend `services/subscription.service.js` PLAN_PRICES): básico 60.000, pro 150.000 COP/mes.
**Ciclo de vida:** cada pago cubre `SUBSCRIPTION_DAYS` (30 por defecto) y queda en `subscription_payments`.
Si aún hay vigencia, la renovación SUMA días (no reinicia). Al vencer, `expireOverdueSubscriptions()`
suspende la clínica sola y apaga su tienda; se llama antes de las lecturas que dependen del estado
(igual patrón que `expireStaleOrders`). Renovar reactiva al instante.
**Candado:** un veterinario solo opera si su clínica está `activa` (middleware `requireActiveClinic`).
**Tienda:** el cliente solo ve productos de clínicas `activa` + `pro` + `store_enabled=true`.

## Flujo de negocio (ya funciona end-to-end)

1. Gerente se registra (tipo "🏥 Veterinaria") → su clínica nace `pendiente` plan `basico`.
2. Gerente paga la suscripción. **Modo simulado (actual, `SUBSCRIPTION_MOCK=true`):** confirma en
   `POST /gerente/subscription/confirm` y la clínica se activa al instante. **Modo Wompi real:** ref
   `SUB-<clinicId>-<plan>` → el webhook la activa. Ambos caminos pasan por `registerSubscriptionPayment()`.
   - También puede: mejorar a Pro (pago) o bajar a Básico (inmediato, apaga la tienda). Admin también puede cambiar plan/estado.
   - Al vencer la vigencia la clínica se suspende sola; el gerente ve el aviso y renueva desde su panel.
3. Veterinario se registra (tipo "🩺 Veterinario") eligiendo una clínica activa → el **gerente de esa clínica** lo aprueba.
4. Veterinario define su jornada, registra mascotas/vacunas, atiende citas. También registra mascotas sin límite y aprueba/rechaza solicitudes de mascota adicional de los clientes (cualquier vet activo ve la cola global, igual que ya ve todo el historial portable).
5. Cliente agenda (elige veterinario con disponibilidad), compra (pago **mock**), usa chat de urgencias. Registra él mismo su **primera mascota**; para una adicional debe enviar una **solicitud** que aprueba un veterinario (tabla `pet_requests`).

## Funcionalidades destacadas ya implementadas

- Auth: access token 15min + refresh token 7d con rotación (cookies httpOnly).
- **Recuperación de contraseña**: "¿Olvidaste tu contraseña?" en el login → `/forgot-password` pide el email (respuesta genérica, no revela cuentas) → correo por Resend con enlace a `/reset-password?token=…` → token de un solo uso (SHA-256 en BD, vence 1 h); al usarse revoca todas las sesiones. Fuera de producción `/auth/forgot` devuelve `debug_token` para pruebas.
- **Calendario del vet** muestra también los días con horario libre sin reservar (estado `disponible`, punto índigo), no solo los días con citas.
- Historial clínico **portable entre clínicas** + bitácora de acceso "break-glass" (`emergency_access_log`).
- **Consultas clínicas estructuradas** (`consultations`): cada atención con motivo, síntomas, diagnóstico, tratamiento y medicamentos en campos separados. Las registra el veterinario desde "🩺 Consulta" en su panel de mascotas; el dueño las ve en solo lectura.
- **Historia clínica en PDF** (`GET /api/pets/:id/history.pdf`, PDFKit): documento con membrete, ficha del paciente, propietario, consultas, vacunas y citas, con pie de confidencialidad y numeración. Lo descargan el veterinario y el dueño; la descarga del vet queda en la bitácora break-glass.
- **Chat de emergencia en vivo** cliente↔veterinario por WebSocket (`/ws`, auth por cookie).
- **Horario de atención por clínica** (`clinics.opens_at/closes_at`): el gerente lo configura desde "✏️ Editar" en su panel; sus veterinarios solo pueden abrir franjas dentro de ese rango. `createSlot` valida además que la franja sea futura y que el fin sea posterior al inicio (antes no validaba NADA). **La comparación de horas se hace en SQL con `AT TIME ZONE 'America/Bogota'`**, no con el reloj de Node: Render corre en UTC y compararlo directo daría 5 horas de desfase.
- **Horario semanal interactivo estilo Q10** (`components/WeekSchedule.jsx`): rejilla de horas × días. Celda vacía → crea franja de 1 h; franja libre → la elimina; cita → salta a su día en la agenda. Se usa en Agenda (selector Semana/Mes) y en Horarios, donde reemplazó la lista plana. Las celdas pasadas no permiten crear.
- **Calendario mensual** del veterinario (puntos por estado), ahora como vista alternativa dentro de Agenda.
- **Gráficas** sin dependencias externas (`BarList.jsx`, `TrendBars.jsx`): recaudo de 6 meses y distribución de clínicas en el panel admin, citas por estado en reportes del gerente.
- **Estados de carga y vacíos** (`Skeleton.jsx`, `EmptyState.jsx`) y transiciones suaves, con `prefers-reduced-motion` respetado.
- **Jornada laboral masiva** (genera muchos horarios de una vez).
- **Expiración de pedidos** pendientes (30 min → devuelve stock) + "Pagar ahora".
- **Tooltips** informativos, **selector visual de especie** (perro/gato/otro), lightbox de imágenes, diseño responsive (menú hamburguesa), moneda COP.

## Pruebas (todas en verde, 243 casos)

En `backend/tests/`, correr con la API local levantada: `node tests/<archivo>`
- history, slots-bulk, order-expiry, wompi-webhook, vets-flow, chat, multiclinic, gerente-flow, gerente-manage, store-clinic, subscription-pay, pets-limit, calendar-summary, password-reset, subscription-cycle, consultations-pdf, clinic-hours

**Ojo con las horas en las pruebas:** desde que existe el horario de atención, toda prueba que
cree franjas debe usar el helper `slotAt(hora, dias)`, que ancla la hora a `-05:00` (Colombia).
Usar `new Date(Date.now() + 86400000)` crea la franja "mañana a esta misma hora" y la suite
falla si se ejecuta de noche o en una máquina con otro huso. Verificado con `TZ=UTC`.

## Cuentas semilla (tras la limpieza, son las ÚNICAS en producción)

- Admin de plataforma: `admin@petgrooming.com` / `admin123`
- Veterinario: `vet@petgrooming.com` / `vet123`
- Clínica semilla: **PetGrooming Yopal** (activa, plan Pro, tienda activa, 11 productos). Sin gerente asignado.

## PENDIENTES (por dónde seguir)

1. **Cambiar contraseñas por defecto** (`admin123`/`vet123`): son débiles (disparan el aviso de "contraseña filtrada" del navegador) y están en el repo. Generar hashes bcrypt nuevos, actualizar seed en `schema.sql`, dar SQL para Neon (`UPDATE users SET password_hash=... WHERE email=...`).
2. ~~Actualizar el documento técnico~~ — **HECHO.** `docs/build-informe-tecnico.mjs` regenerado el 25/07/2026 con: SaaS multi-clínica, 4 roles, ciclo de suscripción, historia clínica estructurada + PDF, chat, agenda semanal, 21 tablas, 9 migraciones y 224 pruebas. Se genera con `node docs/build-informe-tecnico.mjs` → `~/Downloads/PetGrooming_Informe_Tecnico.docx`.
3. **Volver a Wompi real en la suscripción** cuando pase la entrega: quitar `SUBSCRIPTION_MOCK=true` de Render. El código de Wompi está intacto, solo está detrás del interruptor.
4. **Futuro grande:** Wompi propio por clínica para sus tiendas (hoy mock) + cobro recurrente **automático** (hoy el vencimiento y la suspensión sí son automáticos, pero la renovación la dispara el gerente a mano; falta tokenizar el medio de pago con Wompi).
5. **Avisos previos al vencimiento**: hoy se envía correo al pagar y al suspenderse; falta el recordatorio "te vence en 5 días".
6. **PetGrooming Yopal sin gerente:** sus 11 productos no son editables por nadie (no hay gerente). Si se quiere, asignarle un gerente o dejarlo como "tienda de plataforma".
7. **Correos solo llegan a la cuenta de Resend** mientras se use el remitente de prueba `onboarding@resend.dev`. Se resuelve verificando un dominio propio en Resend y cambiando `EMAIL_FROM`.
8. **Historial: lo que quedó fuera.** Se implementó solo la consulta clínica estructurada (decisión del usuario). Quedan como mejoras naturales: peso y signos vitales por visita (con curva de peso), desparasitaciones con próxima dosis, y ficha ampliada de la mascota (sexo, fecha de nacimiento en vez de `age` fija que se desactualiza, esterilizado, microchip, alergias estructuradas). También un certificado de vacunación en PDF aparte del historial completo.
9. **PetGrooming Yopal quedó en plan Básico** en producción, y la tienda pública solo muestra clínicas Pro: sus 11 productos y los cursos están ocultos. Se arregla en un clic desde Admin → Clínicas cambiando su plan a Pro.

## Notas de decisiones tomadas

- Gerente ≠ veterinario (carriles separados; el usuario fue explícito).
- Tiendas de clínica en mock a propósito (cada clínica tendrá su Wompi a futuro); la Wompi de la plataforma es solo para cobrar suscripciones.
- Los productos que crea el admin van a la clínica semilla (tienda de la plataforma).
- **Colores de las gráficas validados, no elegidos a ojo.** Los estados de cita (ámbar/verde/azul/rojo) quedan a ΔE 7.9 para daltonismo protan — por debajo del umbral seguro de 8. Por eso TODA barra lleva su etiqueta de texto con nombre y valor: el color nunca es el único indicador. Si se agregan estados o series, revalidar antes de publicar.
- **Suscripción en modo simulado para la entrega** (`SUBSCRIPTION_MOCK=true`): el gerente paga sin pasar por Wompi, para demostrar el ciclo sin gastar dinero real ni depender de la pasarela en vivo. El endpoint `/gerente/subscription/confirm` está bloqueado (403) si el modo simulado NO está activo, para que nunca se pueda activar gratis con Wompi real.
- **Al vencer se suspende de inmediato** (sin periodo de gracia) y el admin tiene "Vencer ahora" / "+30 días" para demostrar el ciclo en vivo sin esperar 30 días. Ambas decisiones las tomó el usuario.
- Límite de mascotas: el cliente autoregistra solo 1; para más, la solicitud la aprueba el **veterinario** (no el gerente) — el usuario delegó la decisión. Se eligió vet porque ya es quien gestiona mascotas/historial y las ve todas (portable entre clínicas); el gerente nunca toca datos clínicos. Cualquier vet activo ve la cola global de solicitudes (no hay clínica asignada al cliente).
