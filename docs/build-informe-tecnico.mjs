import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TableOfContents,
} from 'docx';
import fs from 'fs';

const CONTENT_W = 9360; // US Letter, margenes de 1"
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
const p = (text, opts = {}) => new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text, ...opts })] });
const pBold = (text) => new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text, bold: true })] });
const bullet = (text) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 60 }, children: [new TextRun(text)] });
const numbered = (text) => new Paragraph({ numbering: { reference: 'numbers', level: 0 }, spacing: { after: 60 }, children: [new TextRun(text)] });

const cell = (text, { bold = false, width, fill } = {}) => new TableCell({
  borders,
  width: { size: width, type: WidthType.DXA },
  margins: cellMargins,
  shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
  children: [new Paragraph({ children: [new TextRun({ text: String(text), bold })] })],
});

const table = (headers, rows, widths) => {
  const w = widths || headers.map(() => Math.floor(CONTENT_W / headers.length));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: w,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((hd, i) => cell(hd, { bold: true, width: w[i], fill: 'D5E8F0' })) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, { width: w[i] })) })),
    ],
  });
};

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, font: 'Arial', color: '1E3A8A' },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: '1E40AF' },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 23, bold: true, font: 'Arial', color: '334155' },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'PetGrooming — Informe Técnico de Desarrollo', size: 16, color: '888888' })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun('Página '), new TextRun({ children: [PageNumber.CURRENT] }), new TextRun(' de '), new TextRun({ children: [PageNumber.TOTAL_PAGES] })],
      })] }),
    },
    children: [
      // ── Portada ──────────────────────────────────────────
      new Paragraph({ spacing: { before: 1200 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'PETGROOMING', bold: true, size: 56, color: '1E3A8A' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: 'Informe Técnico del Desarrollo', size: 32, color: '2563EB' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
        children: [new TextRun({ text: 'Del concepto inicial a la plataforma en producción', italics: true, size: 22, color: '64748B' })] }),

      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 800, after: 80 },
        children: [new TextRun({ text: 'Equipo de desarrollo', bold: true, size: 22 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('Johan Esteban Martínez')] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('Brayan Yesid')] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800 }, children: [new TextRun('José Andrés Camacho Builes')] }),

      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1600 },
        children: [new TextRun({ text: 'Universidad Internacional del Trópico Americano – UNITRÓPICO', size: 20 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Facultad de Ingenierías | Ingeniería de Sistemas', size: 20 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
        children: [new TextRun({ text: 'Yopal, 2026', size: 20 })] }),

      new Paragraph({ children: [new PageBreak()] }),

      // ── Índice ───────────────────────────────────────────
      new TableOfContents('Tabla de contenido', { hyperlink: true, headingStyleRange: '1-3' }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 1. Introducción ──────────────────────────────────
      h1('1. Introducción'),
      p('PetGrooming es una plataforma web desarrollada para centralizar la gestión de servicios de una veterinaria y peluquería de mascotas: historial clínico, agendamiento de citas, cursos de formación para dueños de mascotas y una tienda con pago en línea. Este informe documenta el desarrollo técnico completo del proyecto: la arquitectura implementada, las decisiones tomadas durante la construcción, las funcionalidades desarrolladas y, de manera explícita, los cambios realizados respecto a la concepción inicial del sistema y las razones que los motivaron.'),
      p('El desarrollo se realizó de forma iterativa: se partió de un modelo de datos y de roles simplificado, y se fue refinando a medida que el equipo definía con mayor precisión las reglas de negocio reales de una clínica veterinaria — en particular, la separación de responsabilidades entre el cliente (dueño de la mascota) y el personal veterinario.'),

      // ── 2. Concepto inicial ──────────────────────────────
      h1('2. Concepto inicial del proyecto'),
      p('La primera versión del sistema se diseñó con una estructura de dos roles y un alcance más simple, orientado a validar rápidamente el flujo completo de la plataforma (registro, citas, cursos y tienda) antes de refinar las reglas de negocio.'),
      h2('2.1 Modelo original'),
      bullet('Dos roles de usuario: cliente y administrador. No existía el rol de veterinario como actor independiente.'),
      bullet('El cliente registraba, editaba y eliminaba sus propias mascotas directamente desde la aplicación, sin intervención del personal de la clínica.'),
      bullet('Las citas incluían un catálogo de servicios de peluquería con precio (baño básico, corte completo, corte de uñas) que el cliente seleccionaba al agendar.'),
      bullet('La autenticación usaba un único token JWT de larga duración (7 días) almacenado en una cookie httpOnly, sin mecanismo de renovación.'),
      bullet('Los horarios de atención (slots) eran una lista compartida sin dueño: cualquier horario libre podía asignarse a cualquier cita, sin distinguir qué profesional atendía.'),
      bullet('El pago de la tienda estaba simulado (sin integración real con una pasarela).'),
      bullet('El esquema de base de datos no contemplaba el historial de vacunación ni el registro de sesiones (refresh tokens).'),
      p('Este modelo permitió tener rápidamente una aplicación funcional de extremo a extremo (frontend, backend, base de datos y despliegue en producción), pero no reflejaba con precisión cómo opera una clínica veterinaria real, donde el registro de la mascota y su historial clínico son responsabilidad del personal profesional, no del cliente.'),

      // ── 3. Arquitectura técnica ──────────────────────────
      h1('3. Arquitectura técnica implementada'),
      p('El sistema sigue una arquitectura cliente-servidor de tres capas, con separación estricta entre presentación, lógica de negocio y persistencia de datos.'),
      table(
        ['Capa', 'Tecnología', 'Responsabilidad'],
        [
          ['Presentación', 'React 18 + Vite + Tailwind CSS', 'Interfaz de usuario para los tres roles; consume la API REST, no accede a la base de datos'],
          ['Lógica de negocio', 'Node.js + Express.js', 'API REST; controladores, middlewares de autenticación y rol, servicios de integración externa'],
          ['Datos', 'PostgreSQL (Neon, serverless)', 'Persistencia relacional; 13 tablas con restricciones de integridad a nivel de base de datos'],
        ],
        [2200, 3200, 3960]
      ),
      new Paragraph({ spacing: { before: 200 } }),
      h2('3.1 Infraestructura de despliegue'),
      table(
        ['Componente', 'Servicio', 'Notas'],
        [
          ['Frontend', 'Vercel', 'Despliegue automático desde la rama principal del repositorio; rewrite SPA configurado para evitar errores 404 al recargar rutas internas'],
          ['Backend', 'Render (Web Service, plan gratuito)', 'Se suspende tras 15 minutos sin tráfico; primera petición posterior tarda en reactivarse'],
          ['Base de datos', 'Neon (PostgreSQL serverless)', 'Escalado automático según demanda'],
          ['Repositorio', 'GitHub', 'github.com/DrackZero/petgrooming'],
        ],
        [2200, 3400, 3760]
      ),
      h2('3.2 Autenticación y seguridad'),
      p('El sistema evolucionó de un token único de larga duración a un esquema de dos tokens con rotación:'),
      bullet('Access token: JWT de 15 minutos de vigencia, en cookie httpOnly.'),
      bullet('Refresh token: token opaco de 7 días, persistido en la tabla refresh_tokens, con rotación en cada renovación (el token usado se revoca y se emite uno nuevo).'),
      bullet('El frontend implementa un interceptor que detecta la expiración del access token, solicita automáticamente su renovación y reintenta la petición original de forma transparente para el usuario.'),
      bullet('Las contraseñas se almacenan cifradas con bcrypt; las rutas protegidas verifican el rol del usuario mediante middlewares dedicados.'),

      // ── 4. Modelo de datos ────────────────────────────────
      h1('4. Evolución del modelo de datos'),
      p('El esquema de base de datos se amplió de una versión inicial de 13 tablas orientada a dos roles, a una versión que soporta el modelo de tres roles y la trazabilidad clínica completa. La migración se aplicó de forma incremental (migration-002-veterinarios.sql) sin pérdida de datos existentes.'),
      h2('4.1 Las 13 tablas del sistema'),
      table(
        ['Tabla', 'Propósito'],
        [
          ['users', 'Usuarios (cliente, veterinario, admin); incluye vet_requested para solicitudes de rol pendientes'],
          ['refresh_tokens', 'Sesiones de larga duración por usuario, con rotación y revocación'],
          ['pets', 'Mascotas registradas; propiedad exclusiva de escritura del veterinario'],
          ['vaccines', 'Historial de vacunación por mascota'],
          ['availability_slots', 'Horarios de atención; cada franja pertenece a un veterinario (vet_id)'],
          ['appointments', 'Citas agendadas; relaciona usuario, mascota y horario'],
          ['courses', 'Catálogo de cursos'],
          ['enrollments', 'Inscripciones de clientes a cursos'],
          ['products', 'Catálogo de la tienda'],
          ['orders', 'Pedidos; incluye método de pago y dirección de envío'],
          ['order_items', 'Detalle de productos por pedido, con precio congelado al momento de la compra'],
          ['payments', 'Registro de transacciones procesadas por la pasarela de pagos'],
          ['notifications', 'Bitácora de correos transaccionales enviados'],
        ],
        [2400, 6960]
      ),
      h2('4.2 Cambios estructurales respecto al esquema inicial'),
      bullet('Se agregó la tabla vaccines, inexistente en la versión inicial, para soportar el historial clínico.'),
      bullet('Se agregó la tabla refresh_tokens para el esquema de autenticación de dos tokens.'),
      bullet('Se eliminó la tabla services (servicios de peluquería con precio fijo); las citas pasaron a representar visitas veterinarias genéricas, no un catálogo de servicios tarifados.'),
      bullet('availability_slots incorporó la columna vet_id, que asocia cada horario con el veterinario que lo definió (relación uno a muchos con users), habilitando que el cliente elija profesional al agendar.'),
      bullet('users incorporó vet_requested (booleano) para el flujo de solicitud y aprobación del rol de veterinario, y is_active para la desactivación de cuentas sin eliminar su historial.'),
      bullet('orders incorporó payment_method y shipping_address para soportar el checkout de la tienda.'),

      // ── 5. Modelo de roles ────────────────────────────────
      h1('5. Modelo de roles y permisos'),
      p('El cambio más significativo respecto al concepto inicial fue la introducción del rol veterinario como actor independiente del cliente y del administrador, con permisos exclusivos sobre la información clínica.'),
      table(
        ['Acción', 'Cliente', 'Veterinario', 'Administrador'],
        [
          ['Registrar cuenta / iniciar sesión', 'Sí', 'Sí', 'Sí'],
          ['Registrar mascota', 'No', 'Sí', 'No'],
          ['Ver sus mascotas', 'Sí (solo lectura)', 'Sí (todas)', 'No'],
          ['Registrar vacunas', 'No', 'Sí', 'No'],
          ['Definir horarios de atención', 'No', 'Sí (los propios)', 'No'],
          ['Elegir veterinario y agendar cita', 'Sí', '—', '—'],
          ['Confirmar / completar citas', 'No', 'Sí (las propias)', 'No'],
          ['Ver historial de citas', 'Sí (solo lectura)', 'Sí (gestiona)', 'No'],
          ['Solicitar rol de veterinario', 'Sí (en el registro)', '—', '—'],
          ['Aprobar / rechazar solicitud de veterinario', 'No', 'No', 'Sí'],
          ['Gestionar productos y cursos', 'No', 'No', 'Sí'],
          ['Comprar en la tienda / inscribirse a cursos', 'Sí', '—', '—'],
          ['Ver reportes del negocio', 'No', 'No', 'Sí'],
        ],
        [3000, 2120, 2120, 2120]
      ),
      h2('5.1 Flujo de solicitud de veterinario'),
      p('En la versión inicial, la asignación del rol veterinario era una acción unilateral del administrador sobre cualquier cliente. Se rediseñó como un flujo de solicitud: el usuario marca una casilla al registrarse indicando su intención de ejercer como veterinario, la cuenta se crea con rol cliente y queda marcada como solicitud pendiente. El administrador recibe una notificación dentro de la aplicación (aviso destacado en su panel principal) y puede aprobar o rechazar la solicitud desde la sección de gestión de clientes.'),

      // ── 6. Funcionalidades por módulo ─────────────────────
      h1('6. Funcionalidades desarrolladas'),

      h2('6.1 Gestión de mascotas e historial clínico'),
      p('Se consideró el módulo más crítico del sistema por representar el núcleo del negocio. El veterinario registra la mascota asociándola a un cliente existente, y gestiona su historial de vacunas (nombre, fecha de aplicación, notas). El cliente accede a la información en modo exclusivamente de lectura, incluyendo las notas clínicas que el veterinario registra al completar cada cita. Se verificó mediante una suite de pruebas automatizadas de 19 casos que cubre el flujo completo, las reglas de permisos entre usuarios y los casos límite (mascota sin historial, mascota inexistente, datos incompletos).'),

      h2('6.2 Citas y horarios por veterinario'),
      p('Inicialmente los horarios de atención no tenían un profesional asociado. Se rediseñó el modelo para que cada veterinario administre su propia disponibilidad de forma independiente, y el cliente seleccione primero al profesional de su preferencia y luego un horario disponible de ese veterinario.'),
      p('Para agilizar la creación de horarios, se implementó la generación masiva de jornada laboral: el veterinario define un rango de fechas, los días de la semana que atiende, su horario de inicio y fin, y la duración de cada cita; el sistema genera automáticamente todas las franjas correspondientes, omitiendo las que ya existan o correspondan a fechas pasadas. Esta función sustituyó la creación manual de horarios uno por uno del diseño original.'),

      h2('6.3 Tienda y pagos'),
      p('La tienda se integró con Wompi, pasarela de pagos colombiana, mediante su modalidad de Web Checkout. El backend genera una firma de integridad (hash SHA-256) para cada transacción y valida la autenticidad de las notificaciones de pago mediante un webhook firmado con un secreto de eventos. El estado del pedido se determina exclusivamente a partir de la confirmación del webhook, nunca de la respuesta del navegador, evitando que un cliente pueda alterar el resultado de un pago desde el cliente.'),
      p('Se implementó además un sistema de expiración automática de pedidos: un pedido en estado pendiente que no se paga dentro de un plazo configurable (30 minutos por defecto) se cancela automáticamente y su stock se devuelve al inventario, evitando que productos queden retenidos indefinidamente por compras abandonadas. El cliente puede reintentar el pago de un pedido pendiente desde su historial mientras no haya expirado. Se cubrió este comportamiento, incluyendo el caso límite de un pago que se confirma después de la expiración, con una suite de 8 casos de prueba.'),
      p('Los montos se manejan en pesos colombianos (COP), formato requerido por la pasarela de pagos y ajustado en la interfaz para representarse según la convención numérica local.'),

      h2('6.4 Reportes administrativos'),
      p('El panel de reportes, inicialmente una vista estática de totales generales, se amplió con un filtro de rango de fechas (con accesos rápidos de 7, 30 y 90 días) y tres visualizaciones: ventas por día, distribución de citas por estado y productos más vendidos en el periodo.'),

      h2('6.5 Interfaz y experiencia de usuario'),
      bullet('Diseño responsivo: menú de navegación colapsable en dispositivos móviles y tablas con desplazamiento horizontal en los paneles administrativos.'),
      bullet('Separación de las páginas de inicio y tienda: la página de inicio presenta la propuesta de valor y productos destacados; la tienda incorpora buscador, filtro por categoría y ordenamiento por precio o nombre.'),
      bullet('Visor de imagen a pantalla completa para productos y cursos, implementado mediante un portal de React para evitar conflictos de posicionamiento con los efectos de transformación CSS de las tarjetas.'),
      bullet('Panel de inicio de sesión con sección de invitación al registro, destacando los beneficios de crear una cuenta.'),
      bullet('Corrección del error de recarga en rutas internas de la aplicación de una sola página (SPA), mediante configuración de reescritura de rutas en el proveedor de hosting.'),

      // ── 7. Pruebas ─────────────────────────────────────────
      h1('7. Pruebas automatizadas'),
      p('Se desarrollaron cinco suites de pruebas de integración que ejercitan la API contra una base de datos real, cubriendo el flujo funcional, las reglas de autorización entre roles y los casos límite de cada módulo.'),
      table(
        ['Suite', 'Casos', 'Cobertura'],
        [
          ['history.test.mjs', '19', 'Historial clínico: registro, vacunas, notas de consulta, permisos entre cliente/veterinario/terceros'],
          ['slots-bulk.test.mjs', '9', 'Generación masiva de jornada laboral: conteo, idempotencia, validaciones'],
          ['order-expiry.test.mjs', '8', 'Expiración de pedidos, devolución de stock, reintento de pago, reactivación tras pago tardío'],
          ['wompi-webhook.test.mjs', '7', 'Verificación de firma del webhook, aprobación, rechazo, reenvío idempotente'],
          ['vets-flow.test.mjs', '15', 'Solicitud de rol veterinario, aprobación/rechazo, horarios y citas por veterinario'],
        ],
        [2600, 1200, 5560]
      ),
      p('Total: 58 casos de prueba automatizados, ejecutables mediante Node.js sin dependencias adicionales de framework de testing.'),

      // ── 8. Cambios respecto a la idea inicial ─────────────
      h1('8. Cambios respecto a la idea inicial'),
      p('Esta sección resume, de forma explícita, las decisiones que modificaron el alcance o el diseño original del sistema, junto con la justificación de cada cambio.'),
      table(
        ['Aspecto', 'Idea inicial', 'Implementación final', 'Motivo del cambio'],
        [
          ['Roles', 'Cliente y administrador', 'Cliente, veterinario y administrador', 'Reflejar la separación real de responsabilidades en una clínica veterinaria; el profesional, no el dueño, es quien gestiona la información clínica'],
          ['Registro de mascotas', 'El cliente registra y edita sus mascotas', 'Solo el veterinario registra y edita; el cliente consulta en modo lectura', 'Control clínico de la información; evita datos inconsistentes o incompletos ingresados por el dueño'],
          ['Asignación de veterinario', 'No existía', 'El usuario solicita el rol al registrarse; el administrador aprueba o rechaza', 'Evitar que cualquier usuario se autoasigne permisos profesionales sin control administrativo'],
          ['Servicios de peluquería con precio', 'Catálogo de servicios (baño, corte) seleccionable al agendar', 'Eliminado; la cita representa una visita veterinaria genérica', 'Alinear el modelo de datos con el alcance definido en el documento de arquitectura (13 tablas)'],
          ['Horarios de atención', 'Lista compartida sin dueño', 'Cada veterinario define y gestiona sus propios horarios; el cliente elige profesional', 'Permitir múltiples veterinarios operando en paralelo sin conflictos de agenda'],
          ['Creación de horarios', 'Uno por uno, manual', 'Generación masiva por jornada laboral (rango de fechas, días, horario, duración)', 'Reducir la carga operativa repetitiva reportada como poco práctica para el personal'],
          ['Autenticación', 'Token único de 7 días', 'Access token (15 min) + refresh token (7 días) con rotación', 'Adoptar una práctica de seguridad estándar que limita la ventana de exposición de un token comprometido'],
          ['Pagos', 'Simulados', 'Integración real con Wompi (Web Checkout y webhook firmado)', 'Habilitar cobros en línea verificables criptográficamente para la tienda'],
          ['Pedidos abandonados', 'Sin manejo; quedaban pendientes indefinidamente reteniendo stock', 'Expiración automática a los 30 minutos con devolución de stock', 'Corrección de una falla detectada durante pruebas manuales de la pasarela de pagos'],
          ['Moneda', 'Formato numérico genérico', 'Pesos colombianos (COP)', 'Requisito de la pasarela de pagos y del contexto de operación real del negocio'],
          ['Reportes', 'Totales estáticos sin filtro', 'Filtro por rango de fechas y gráficas (ventas, citas por estado, productos)', 'Aportar valor real de análisis al administrador, no solo cifras acumuladas'],
        ],
        [1700, 2500, 2700, 2460]
      ),

      // ── 9. Conclusiones ────────────────────────────────────
      h1('9. Conclusiones y trabajo futuro'),
      p('El desarrollo de PetGrooming partió de una implementación funcional simplificada y evolucionó, mediante iteraciones sucesivas guiadas por la revisión del documento de arquitectura y por pruebas de uso reales, hacia un sistema que refleja con mayor fidelidad las reglas de negocio de una clínica veterinaria. El cambio de mayor impacto fue la introducción del rol veterinario y la reasignación de la responsabilidad sobre el historial clínico, decisión que a su vez motivó ajustes en cascada sobre el modelo de citas, horarios y permisos.'),
      h2('9.1 Trabajo futuro'),
      bullet('Notificación por correo electrónico al administrador ante nuevas solicitudes de rol de veterinario (actualmente la notificación es únicamente dentro de la aplicación).'),
      bullet('Cobro en línea de cursos, reutilizando el flujo de pago ya integrado con Wompi.'),
      bullet('Registro de un segundo nivel de personal (recepción) diferenciado del rol veterinario.'),
      bullet('Ampliación del historial clínico con documentos adjuntos (exámenes, radiografías).'),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const out = 'C:/Users/USUARIO/Downloads/PetGrooming_Informe_Tecnico.docx';
  fs.writeFileSync(out, buffer);
  console.log('Generado:', out);
});
