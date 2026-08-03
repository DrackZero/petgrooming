# Manual del código — PetGrooming

Cómo funciona el sistema por dentro. Para saber **dónde** está cada cosa, mira
[GUIA-CARPETAS.md](GUIA-CARPETAS.md); este documento explica **cómo** funciona y
por qué está hecho así.

---

## 1. El recorrido de una petición

Todo lo que hace la aplicación sigue el mismo camino. Ejemplo real: el
veterinario registra una consulta clínica.

```
Navegador                Backend                          PostgreSQL
────────────────────────────────────────────────────────────────────
VetPets.jsx
  addConsultation()  →  routes/pets.routes.js
  (api/pets.js)          router.post('/:id/consultations', …)
                              ↓
                         authRequired      ¿hay sesión válida?
                              ↓
                         vetOnly           ¿es veterinario?
                              ↓
                         requireActiveClinic  ¿su clínica está al día?
                              ↓
                         controllers/pets.controller.js
                           addConsultation()  →  INSERT INTO consultations
                              ↓
                         res.status(201).json(fila)
  ← respuesta
  setMsg('Consulta registrada ✓')
```

Los tres middlewares corren **en orden** y cualquiera puede cortar el paso. El
controlador solo se ejecuta si los tres dejaron pasar, así que dentro de él ya se
puede asumir que `req.user` existe y que tiene permiso.

---

## 2. Autenticación: dos tokens

El sistema usa **dos** tokens en lugar de uno, ambos en cookies `httpOnly` (el
JavaScript de la página no puede leerlas, lo que protege ante ataques XSS).

| Token | Duración | Dónde vive | Para qué |
|---|---|---|---|
| **Access** | 15 minutos | Cookie, es un JWT firmado | Autoriza cada petición |
| **Refresh** | 7 días | Cookie + tabla `refresh_tokens` | Obtener un access nuevo |

**Por qué dos.** Si el access token se filtrara, solo sirve 15 minutos. El refresh
sí dura una semana, pero está guardado en la base de datos y se puede **revocar**
— cosa que con un JWT suelto es imposible.

**Rotación.** Cada vez que se usa un refresh token, se marca como revocado y se
emite uno nuevo. Si alguien roba uno y lo usa, la sesión legítima deja de
funcionar y el robo se hace evidente.

**El interceptor.** El usuario nunca ve el vencimiento de los 15 minutos. En
`frontend/src/api/client.js` hay un interceptor que, cuando el backend responde
401, llama a `/auth/refresh`, obtiene un token nuevo y **reintenta la petición
original**. Todo transparente.

**Recuperación de contraseña.** Se guarda solo el hash SHA-256 del token, nunca el
token en claro: si alguien lee la tabla, no puede usarlo. Vence en una hora, es de
un solo uso, y al usarse revoca todas las sesiones abiertas. El endpoint responde
lo mismo exista o no el correo, para no revelar qué direcciones están registradas.

---

## 3. Roles y permisos

Cuatro roles, cada uno con su carril:

| Rol | Middleware | Alcance |
|---|---|---|
| `cliente` | `clientOnly` | Sus mascotas, sus citas, sus compras |
| `veterinario` | `vetOnly` | Todas las mascotas (historial portable), su agenda |
| `gerente` | `managerOnly` | SU clínica: equipo, tienda, suscripción |
| `admin` | `adminOnly` | La plataforma: clínicas y planes, NO datos clínicos |

La separación importante es **gerente vs admin**: el gerente administra el negocio
de una veterinaria, el admin administra el negocio de vender el software. El admin
deliberadamente no puede ver historias clínicas — si intenta descargar un PDF
recibe un 404.

### El candado de suscripción

`requireActiveClinic` protege todas las operaciones del veterinario. Si su clínica
no está `activa`, no puede registrar nada. Esto es lo que le da fuerza al modelo de
negocio: sin pago, la clínica deja de operar.

---

## 4. El ciclo de la suscripción

Es el corazón del modelo de negocio y conviene entenderlo completo.

```
Clínica nace 'pendiente', sin vigencia (subscription_expires_at = NULL)
        ↓  el gerente paga
registerSubscriptionPayment()
        ├─ clinics: status='activa', expires_at = MAX(actual, ahora) + 30 días
        ├─ subscription_payments: INSERT del cobro y el periodo que cubre
        └─ correo de comprobante al gerente
        ↓  pasan 30 días
expireOverdueSubscriptions()
        ├─ status='suspendida', store_enabled=false
        └─ correo de aviso
        ↓  el gerente renueva
vuelve a estar activa al instante
```

**Renovar suma, no reinicia.** El `MAX(vigencia_actual, ahora) + 30 días` significa
que si renuevas faltando 10 días, quedas con 40 — no pierdes lo pagado.

**Por qué el vencimiento es perezoso.** No hay tarea programada. `expireOverdueSubscriptions()`
se llama antes de las lecturas que dependen del estado (el panel del gerente, el
catálogo público, el listado de horarios, el candado del veterinario). La razón es
práctica: el plan gratuito de Render apaga el servicio tras 15 minutos sin tráfico,
así que un cron no correría de forma fiable. Con este enfoque, el vencimiento se
hace efectivo en la primera petición que lo necesite. Es el mismo patrón que ya
usaba `expireStaleOrders()` para los pedidos abandonados.

**Dos caminos, una función.** El pago real por Wompi (vía webhook) y el pago
simulado (`SUBSCRIPTION_MOCK=true`) terminan ambos en `registerSubscriptionPayment()`.
Por eso lo que se demuestra en modo simulado es exactamente el mismo código que
correrá con dinero real. El endpoint de confirmación simulada responde 403 si el
modo no está activo, para que nunca se pueda activar gratis en producción.

---

## 5. Horarios y zonas horarias

**El problema.** Render corre en UTC y Colombia es UTC−5. Si comparas la hora de
una franja con el reloj del servidor, te equivocas por cinco horas: una cita de las
8 de la mañana el servidor la ve como la 1 de la tarde.

**La solución.** La comparación se hace en SQL, no en JavaScript:

```sql
SELECT ($1::timestamptz AT TIME ZONE 'America/Bogota')::time AS inicio
```

PostgreSQL convierte a hora local de Colombia y ahí sí se compara contra
`clinics.opens_at` / `closes_at`. Funciona igual sin importar dónde corra el proceso.

**Consecuencia para las pruebas.** Cualquier prueba que cree franjas debe usar el
helper `slotAt(hora, dias)`, que ancla la hora a `-05:00`. Usar
`new Date(Date.now() + 86400000)` crea la franja *"mañana a esta misma hora"*, así
que la prueba pasa de día y falla de noche. Ya ocurrió: seis suites quedaron
frágiles al introducir la validación y hubo que anclarlas.

---

## 6. Historia clínica y auditoría

**Portabilidad.** Cualquier veterinario puede ver el historial de cualquier
mascota, aunque sea de otra clínica. Es intencional: en una urgencia, bloquear el
acceso al historial es peor que permitirlo.

**Break-glass.** A cambio de no bloquear, todo acceso queda registrado en
`emergency_access_log`, incluida la descarga del PDF. El admin ve esa bitácora. El
principio es *"no te lo impido, pero queda tu nombre"*.

**El PDF se genera al vuelo**, nunca se guarda. El disco de Render es efímero
(se borra en cada despliegue) y así el documento siempre refleja el estado actual.
La contrapartida: no hay copia histórica, si se borra una consulta desaparece de
los PDF futuros.

---

## 7. Convenciones del proyecto

**Idioma.** Interfaz, comentarios y mensajes de error en español. Los nombres de
tablas y columnas en inglés (`pets`, `starts_at`) por convención de bases de datos.

**Comentarios.** Se comenta el **porqué**, no el qué. `// suma 30 días` sobra;
`// se suman al restante para no perder lo ya pagado` sirve.

**Errores.** Los controladores no envían respuestas de error genéricas: hacen
`next(err)` y `error.middleware.js` responde de forma uniforme. Los mensajes que sí
se escriben a mano son los de validación, y deben decirle al usuario **qué hacer**
("Tu veterinaria atiende de 07:00 a 19:00", no "Hora inválida").

**Consultas.** Siempre parametrizadas (`$1`, `$2`), nunca concatenando texto. Es lo
que impide la inyección SQL.

---

## 8. Recetas para tareas comunes

### Agregar un endpoint

1. Escribe la función en el `controller` correspondiente
2. Regístrala en el `routes` con sus middlewares de rol
3. Agrega la función que lo llama en `frontend/src/api/`
4. Escribe una prueba en `backend/tests/`

### Agregar una columna a una tabla

1. Créala en `schema.sql` (para instalaciones nuevas)
2. Crea `migration-0XX-*.sql` idempotente (para producción)
3. **Aplícala en Neon antes de publicar el código que la usa**, o producción se rompe
4. Actualiza `ESTADO-PROYECTO.md` con la migración nueva

### Agregar una pantalla

1. Crea el archivo en `pages/` (en la subcarpeta del rol si aplica)
2. Registra la ruta en `App.jsx`, envuelta en `ProtectedRoute` si requiere rol
3. Agrega el enlace en `Navbar.jsx`

### Antes de publicar

```bash
cd backend && node tests/<cada-suite>.mjs   # las 17 suites en verde
cd frontend && npm run build                 # que compile
```

Y si hubo migración, aplicarla en Neon **antes** del `git push`.

---

## 9. Errores que ya se cometieron

Registro de fallos reales, para no repetirlos.

**Tipos inconsistentes en PostgreSQL.** Usar el mismo parámetro en dos contextos
(`SET status = $1` y `WHERE $1 = 'activa'`) hace que Postgres no pueda deducir el
tipo y lance *"se dedujeron tipos de dato inconsistentes"*. Se arregla con un cast
explícito: `$1::text`. Rompió la activación manual de clínicas y lo detectaron las
pruebas de regresión.

**Pies de página en PDFKit.** Escribir por debajo del margen inferior hace que
PDFKit interprete desbordamiento y **agregue una página por cada pie**. El
documento decía "Página 1 de 2" pero salía con 6 hojas. Se resuelve poniendo
`doc.page.margins.bottom = 0` antes de dibujar el pie.

**Scripts de shell para editar código.** Un intento de corregir un formato con
`sed`/`node -e` y comillas anidadas dejó `const hora = ;` en dos archivos. Para
editar código, usa el editor; los scripts de shell son para tareas de una línea.

**Colores elegidos a ojo.** El ámbar y el verde de los estados de cita quedan a
ΔE 7.9 para daltonismo protan, por debajo del umbral seguro de 8. Por eso toda
barra de las gráficas lleva etiqueta de texto: el color nunca es el único
indicador. Si agregas series, revalida antes de publicar.
