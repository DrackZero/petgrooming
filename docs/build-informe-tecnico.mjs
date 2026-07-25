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
        children: [new TextRun({ text: 'De una aplicación de dos roles a un SaaS multi-clínica por suscripción', italics: true, size: 22, color: '64748B' })] }),

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
      p('PetGrooming es una plataforma web de tipo SaaS (software como servicio) que permite a múltiples veterinarias y peluquerías de mascotas gestionar su operación bajo un modelo de suscripción mensual. Cada clínica se suscribe a un plan, su gerente la administra, sus veterinarios atienden a los pacientes, y los dueños de mascotas agendan citas, consultan la historia clínica, compran en la tienda y disponen de un chat de urgencias en tiempo real.'),
      p('Este informe documenta el desarrollo técnico completo del proyecto: la arquitectura implementada, las decisiones tomadas durante la construcción, las funcionalidades desarrolladas y, de manera explícita, los cambios realizados respecto a la concepción inicial del sistema junto con las razones que los motivaron.'),
      p('El desarrollo se realizó de forma iterativa. Se partió de una aplicación de dos roles para una única veterinaria y se fue refinando a medida que se definían con mayor precisión las reglas de negocio reales del sector. La transformación de mayor alcance fue el paso de una aplicación de instalación única a una plataforma multi-inquilino: el software dejó de ser el sistema de una clínica para convertirse en un producto que se vende a muchas, lo que introdujo el concepto de suscripción, el rol de gerente y el aislamiento de los datos entre clínicas.'),

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
      bullet('El sistema atendía a una sola veterinaria: no existía el concepto de clínica como entidad, ni un modelo de negocio asociado al uso del software.'),
      p('Este modelo permitió tener rápidamente una aplicación funcional de extremo a extremo (frontend, backend, base de datos y despliegue en producción), pero no reflejaba con precisión cómo opera una clínica veterinaria real, donde el registro de la mascota y su historial clínico son responsabilidad del personal profesional, no del cliente. Tampoco contemplaba cómo se sostendría económicamente la plataforma.'),

      // ── 3. Arquitectura técnica ──────────────────────────
      h1('3. Arquitectura técnica implementada'),
      p('El sistema sigue una arquitectura cliente-servidor de tres capas, con separación estricta entre presentación, lógica de negocio y persistencia de datos.'),
      table(
        ['Capa', 'Tecnología', 'Responsabilidad'],
        [
          ['Presentación', 'React 18 + Vite + Tailwind CSS', 'Interfaz para los cuatro roles; consume la API REST y mantiene una conexión WebSocket para el chat. No accede a la base de datos'],
          ['Lógica de negocio', 'Node.js + Express.js (ESM)', 'API REST, servidor WebSocket, controladores, middlewares de autenticación y rol, servicios de integración externa'],
          ['Datos', 'PostgreSQL (Neon, serverless)', 'Persistencia relacional; 21 tablas con restricciones de integridad declaradas a nivel de base de datos'],
        ],
        [2200, 3200, 3960]
      ),
      new Paragraph({ spacing: { before: 200 } }),
      h2('3.1 Servicios e integraciones externas'),
      table(
        ['Servicio', 'Uso en el sistema'],
        [
          ['Wompi', 'Pasarela de pagos colombiana. Cobra las suscripciones de las clínicas mediante Web Checkout, con firma de integridad SHA-256 y webhook de eventos verificado por checksum'],
          ['Resend', 'Correo transaccional: recuperación de contraseña, comprobante de pago de suscripción, aviso de suspensión, confirmación de citas y de pedidos'],
          ['PDFKit', 'Generación en el servidor del documento PDF de la historia clínica. Se eligió frente a alternativas basadas en navegador headless por su bajo consumo de memoria, condición necesaria en el plan gratuito de Render'],
          ['ws (WebSocket)', 'Canal bidireccional del chat de urgencias entre cliente y veterinario, autenticado mediante la misma cookie de sesión de la API'],
        ],
        [2200, 7160]
      ),
      new Paragraph({ spacing: { before: 200 } }),
      h2('3.2 Infraestructura de despliegue'),
      table(
        ['Componente', 'Servicio', 'Notas'],
        [
          ['Frontend', 'Vercel', 'Despliegue automático desde la rama principal del repositorio; rewrite SPA configurado para evitar errores 404 al recargar rutas internas'],
          ['Backend', 'Render (Web Service, plan gratuito)', 'Se suspende tras 15 minutos sin tráfico; la primera petición posterior tarda en reactivarse. Esta restricción condicionó decisiones de diseño, como resolver el vencimiento de suscripciones de forma perezosa en lugar de mediante tareas programadas'],
          ['Base de datos', 'Neon (PostgreSQL serverless)', 'Escalado automático según demanda'],
          ['Repositorio', 'GitHub', 'github.com/DrackZero/petgrooming'],
        ],
        [2200, 3400, 3760]
      ),
      h2('3.3 Autenticación y seguridad'),
      p('El sistema evolucionó de un token único de larga duración a un esquema de dos tokens con rotación:'),
      bullet('Access token: JWT de 15 minutos de vigencia, en cookie httpOnly.'),
      bullet('Refresh token: token opaco de 7 días, persistido en la tabla refresh_tokens, con rotación en cada renovación (el token usado se revoca y se emite uno nuevo).'),
      bullet('El frontend implementa un interceptor que detecta la expiración del access token, solicita automáticamente su renovación y reintenta la petición original de forma transparente para el usuario.'),
      bullet('Las contraseñas se almacenan cifradas con bcrypt; las rutas protegidas verifican el rol del usuario mediante middlewares dedicados.'),
      bullet('Recuperación de contraseña con token de un solo uso: se almacena únicamente su hash SHA-256, vence en una hora y, al utilizarse, revoca todas las sesiones abiertas de la cuenta. La respuesta del endpoint es idéntica exista o no el correo, para no revelar qué direcciones están registradas.'),
      bullet('El historial clínico es portable entre clínicas: cualquier veterinario puede consultarlo en una urgencia, pero cada acceso queda registrado en una bitácora de auditoría (emergency_access_log). Es un mecanismo de tipo break-glass: no bloquea la atención, la deja trazada.'),
      bullet('La descarga del PDF de la historia clínica está restringida al dueño de la mascota y al personal veterinario; cualquier otro usuario, incluido el administrador de la plataforma, recibe un 404.'),

      // ── 4. Modelo de datos ────────────────────────────────
      h1('4. Evolución del modelo de datos'),
      p('El esquema pasó de 13 tablas orientadas a dos roles y una sola veterinaria, a 21 tablas que soportan el modelo multi-clínica, los cuatro roles, la trazabilidad clínica completa y el ciclo de vida de la suscripción. Todos los cambios se aplicaron mediante migraciones incrementales, sin pérdida de datos y sin interrumpir el servicio en producción.'),
      h2('4.1 Las 21 tablas del sistema'),
      table(
        ['Tabla', 'Propósito'],
        [
          ['clinics', 'Veterinarias suscritas: estado, plan, gerente, tienda activa y vigencia de la suscripción'],
          ['subscription_payments', 'Historial real de cobros de suscripción, con el periodo que cubre cada pago'],
          ['users', 'Usuarios de los cuatro roles; incluye clinic_id y vet_requested para solicitudes pendientes'],
          ['refresh_tokens', 'Sesiones de larga duración por usuario, con rotación y revocación'],
          ['password_resets', 'Tokens de recuperación de contraseña (hash SHA-256, un solo uso, vencimiento de una hora)'],
          ['pets', 'Mascotas registradas; el cliente registra la primera, el veterinario el resto'],
          ['pet_requests', 'Solicitudes del cliente para registrar una mascota adicional, aprobadas por un veterinario'],
          ['vaccines', 'Historial de vacunación por mascota, con el veterinario que la aplicó'],
          ['consultations', 'Atención clínica estructurada: motivo, síntomas, diagnóstico, tratamiento y medicamentos'],
          ['emergency_access_log', 'Bitácora de auditoría de accesos a historiales clínicos (break-glass)'],
          ['availability_slots', 'Horarios de atención; cada franja pertenece a un veterinario (vet_id)'],
          ['appointments', 'Citas agendadas; relaciona usuario, mascota y horario'],
          ['conversations', 'Conversaciones del chat de urgencias entre cliente y veterinario'],
          ['messages', 'Mensajes de cada conversación, entregados en vivo por WebSocket'],
          ['courses', 'Catálogo de cursos, por clínica'],
          ['enrollments', 'Inscripciones de clientes a cursos'],
          ['products', 'Catálogo de la tienda, por clínica'],
          ['orders', 'Pedidos; incluye método de pago y dirección de envío'],
          ['order_items', 'Detalle de productos por pedido, con precio congelado al momento de la compra'],
          ['payments', 'Registro de transacciones de la tienda procesadas por la pasarela'],
          ['notifications', 'Bitácora de correos transaccionales enviados'],
        ],
        [2400, 6960]
      ),
      new Paragraph({ spacing: { before: 200 } }),
      h2('4.2 Migraciones aplicadas'),
      p('Cada cambio de esquema se entregó como un archivo SQL independiente e idempotente (seguro de ejecutar varias veces), lo que permitió aplicarlos en la base de datos de producción de forma controlada antes de publicar el código que los requería.'),
      table(
        ['Migración', 'Qué introdujo'],
        [
          ['002-veterinarios', 'Rol veterinario: vet_requested y availability_slots.vet_id'],
          ['003-chat', 'Chat de urgencias: conversations y messages'],
          ['004-clinicas', 'Multi-clínica: clinics, users.clinic_id, vaccines.vet_id y la bitácora de auditoría'],
          ['005-gerente', 'Rol gerente y estado/plan/gerente de cada clínica'],
          ['006-tienda-clinica', 'Tienda y cursos por clínica (plan Pro)'],
          ['007-pet-requests', 'Límite de mascotas del cliente y solicitudes de mascota adicional'],
          ['008-password-reset', 'Recuperación de contraseña'],
          ['009-ciclo-suscripcion', 'Vigencia de la suscripción e historial de cobros'],
          ['010-consultas', 'Consultas clínicas estructuradas'],
        ],
        [2600, 6760]
      ),
      new Paragraph({ spacing: { before: 200 } }),
      h2('4.3 Cambios estructurales respecto al esquema inicial'),
      bullet('Se agregó la tabla vaccines, inexistente en la versión inicial, para soportar el historial clínico.'),
      bullet('Se agregó refresh_tokens para el esquema de autenticación de dos tokens.'),
      bullet('Se eliminó la tabla services (servicios de peluquería con precio fijo); las citas pasaron a representar visitas veterinarias genéricas, no un catálogo de servicios tarifados.'),
      bullet('availability_slots incorporó vet_id, que asocia cada horario con el veterinario que lo definió, habilitando que el cliente elija profesional al agendar.'),
      bullet('Se introdujo clinics como entidad central del modelo multi-inquilino: usuarios, productos y cursos pasaron a pertenecer a una clínica, y el estado de esa clínica condiciona qué puede hacer su personal.'),
      bullet('La historia clínica dejó de ser una nota de texto libre asociada a la cita y pasó a la tabla consultations, con campos separados para motivo, síntomas, diagnóstico, tratamiento y medicamentos.'),
      bullet('orders incorporó payment_method y shipping_address para soportar el checkout de la tienda.'),

      // ── 5. Modelo de roles ────────────────────────────────
      h1('5. Modelo de roles y permisos'),
      p('El sistema pasó de dos roles a cuatro. Primero se introdujo el veterinario como actor independiente con permisos exclusivos sobre la información clínica; después, al convertir la aplicación en un producto multi-clínica, se separó la administración del negocio (gerente) de la administración de la plataforma (admin).'),
      table(
        ['Rol', 'Alcance y responsabilidad'],
        [
          ['Cliente', 'Dueño de la mascota. Registra su primera mascota, consulta y descarga la historia clínica, agenda citas eligiendo veterinario, compra en la tienda, se inscribe en cursos y usa el chat de urgencias'],
          ['Veterinario', 'Personal que atiende. Registra mascotas sin límite, aprueba solicitudes de mascota adicional, documenta consultas y vacunas, define su jornada y gestiona sus citas. Pertenece a UNA clínica'],
          ['Gerente', 'Dirige UNA clínica pero no atiende pacientes. Aprueba a sus veterinarios, edita los datos de la clínica, consulta sus reportes, gestiona su tienda y cursos (solo plan Pro) y paga la suscripción'],
          ['Administrador', 'Dueño de la plataforma. Activa o suspende clínicas, asigna planes y consulta los ingresos por suscripción. No accede a los datos operativos ni clínicos de las clínicas'],
        ],
        [1800, 7560]
      ),
      new Paragraph({ spacing: { before: 200 } }),
      h2('5.1 Matriz de permisos'),
      table(
        ['Acción', 'Cliente', 'Veterinario', 'Gerente', 'Admin'],
        [
          ['Registrar su primera mascota', 'Sí', '—', 'No', 'No'],
          ['Registrar mascotas sin límite', 'No', 'Sí', 'No', 'No'],
          ['Aprobar solicitud de mascota adicional', 'No', 'Sí', 'No', 'No'],
          ['Registrar consultas y vacunas', 'No', 'Sí', 'No', 'No'],
          ['Ver la historia clínica', 'Sí (la suya)', 'Sí (todas)', 'No', 'No'],
          ['Descargar la historia clínica en PDF', 'Sí (la suya)', 'Sí', 'No', 'No'],
          ['Definir horarios de atención', 'No', 'Sí (los propios)', 'No', 'No'],
          ['Agendar cita eligiendo veterinario', 'Sí', '—', 'No', 'No'],
          ['Confirmar / completar citas', 'No', 'Sí (las propias)', 'No', 'No'],
          ['Aprobar veterinarios de la clínica', 'No', 'No', 'Sí (los suyos)', 'No'],
          ['Gestionar tienda y cursos', 'No', 'No', 'Sí (plan Pro)', 'Sí'],
          ['Pagar / cambiar la suscripción', 'No', 'No', 'Sí', '—'],
          ['Activar o suspender una clínica', 'No', 'No', 'No', 'Sí'],
          ['Ver ingresos por suscripción', 'No', 'No', 'No', 'Sí'],
          ['Chat de urgencias', 'Sí', 'Sí', 'No', 'No'],
        ],
        [3160, 1600, 1800, 1500, 1300]
      ),
      new Paragraph({ spacing: { before: 200 } }),
      h2('5.2 Flujo de alta del personal'),
      p('En la versión inicial la asignación del rol veterinario era una acción unilateral del administrador sobre cualquier cliente. Se rediseñó como un flujo de solicitud y, con la llegada del modelo multi-clínica, la aprobación se trasladó del administrador de la plataforma al gerente de la clínica correspondiente, que es quien realmente conoce a su equipo.'),
      bullet('El gerente se registra eligiendo el tipo "Veterinaria" y crea su clínica, que nace en estado pendiente.'),
      bullet('El veterinario se registra eligiendo el tipo "Veterinario" y seleccionando una clínica activa; su cuenta queda como solicitud pendiente.'),
      bullet('El gerente de esa clínica aprueba o rechaza la solicitud desde su panel.'),
      p('Se implementó un candado de suscripción: un veterinario solo puede operar si su clínica está activa. Si la clínica está pendiente o suspendida, sus horarios dejan de ofrecerse a los clientes y el personal no puede registrar información clínica.'),

      // ── 6. Funcionalidades por módulo ─────────────────────
      h1('6. Funcionalidades desarrolladas'),

      h2('6.1 Modelo de suscripción y ciclo de vida'),
      p('Es el módulo que convierte al sistema en un producto comercializable. Cada veterinaria se suscribe a uno de dos planes: Básico ($60.000 COP mensuales, con citas e historial clínico) o Pro ($150.000 COP mensuales, que añade tienda en línea y cursos propios).'),
      p('El cobro no es un pago único que activa la clínica de forma indefinida: cada pago cubre un periodo de 30 días registrado en subscription_payments. Si la clínica renueva antes de vencerse, los días se suman al saldo restante en lugar de reiniciarlo, de modo que el cliente no pierde lo ya pagado. Al vencer la vigencia, la clínica se suspende automáticamente: sus veterinarios dejan de operar, sus horarios desaparecen del agendamiento y su tienda se oculta del catálogo público. Renovar la reactiva de inmediato.'),
      p('La suspensión se resuelve mediante una verificación perezosa (lazy) ejecutada antes de las lecturas que dependen del estado de la clínica, en lugar de un proceso programado. La decisión se tomó porque el plan gratuito de Render suspende el servicio tras quince minutos sin tráfico, lo que haría poco fiable cualquier tarea agendada; con este enfoque, el vencimiento se hace efectivo en la primera petición que lo requiera.'),
      p('El administrador de la plataforma distingue el recaudo real del mes (lo efectivamente cobrado, extraído del historial de pagos) del ingreso proyectado (lo que facturarían las clínicas activas si todas renovaran), y dispone de herramientas para vencer una suscripción al instante o extender su vigencia.'),

      h2('6.2 Gestión de mascotas e historia clínica'),
      p('Es el módulo más crítico del sistema por representar el núcleo del negocio. El diseño de permisos se ajustó dos veces: originalmente el cliente gestionaba sus mascotas; después se restringió por completo al veterinario; y finalmente se adoptó un punto intermedio, al detectarse que impedir todo registro al cliente hacía incómoda su primera experiencia con la aplicación.'),
      p('El modelo definitivo permite al cliente registrar su primera mascota de forma autónoma. Para cualquier mascota adicional debe enviar una solicitud que un veterinario aprueba o rechaza, lo que preserva el control profesional sobre los datos sin bloquear el ingreso inicial. El veterinario registra mascotas sin límite alguno.'),
      p('La historia clínica dejó de ser una nota de texto libre por cita y pasó a estructurarse en consultas con campos separados: motivo, síntomas, diagnóstico, tratamiento y medicamentos recetados, junto con el veterinario y la clínica que atendieron. El historial es portable entre clínicas, de modo que un profesional de otra sede puede consultarlo en una urgencia; cada acceso queda auditado.'),

      h2('6.3 Historia clínica en documento PDF'),
      p('El sistema genera en el servidor un documento PDF con la historia clínica completa de la mascota: encabezado institucional, ficha del paciente, datos del propietario, consultas clínicas detalladas, vacunas aplicadas e historial de citas, con pie de confidencialidad y numeración de páginas.'),
      p('Pueden descargarlo el dueño de la mascota y el personal veterinario; cualquier otro usuario recibe un 404. La descarga realizada por un veterinario queda registrada en la bitácora de auditoría, igual que la consulta en pantalla.'),

      h2('6.4 Citas, horarios y agenda semanal'),
      p('Inicialmente los horarios de atención no tenían un profesional asociado. Se rediseñó el modelo para que cada veterinario administre su propia disponibilidad de forma independiente, y el cliente seleccione primero al profesional de su preferencia y luego un horario disponible de ese veterinario.'),
      p('Para agilizar la creación de horarios se implementó la generación masiva de jornada laboral: el veterinario define un rango de fechas, los días de la semana que atiende, su horario de inicio y fin, y la duración de cada cita; el sistema genera automáticamente todas las franjas correspondientes, omitiendo las que ya existan o correspondan a fechas pasadas.'),
      p('La visualización de la agenda evolucionó en dos etapas. Primero se construyó un calendario mensual que señala con puntos de color los días con actividad, diferenciando por estado de la cita y marcando también los días con horario disponible sin reservar. Posteriormente se añadió una vista semanal interactiva, en forma de rejilla de horas por días: tocar una celda vacía abre una franja de atención, tocar una franja libre la elimina y tocar una cita salta a su gestión. Esta vista sustituyó a la lista plana de horarios del diseño anterior, en la que definir la jornada y consultarla eran pantallas separadas.'),

      h2('6.5 Chat de urgencias en tiempo real'),
      p('Se implementó un canal de comunicación directa entre el cliente y el personal veterinario mediante WebSocket, para consultas que no admiten la espera de una cita agendada. La conexión se autentica con la misma cookie de sesión que utiliza la API REST, evitando un segundo mecanismo de credenciales. Los mensajes se persisten en base de datos, de modo que la conversación sobrevive a la desconexión y puede retomarse después.'),

      h2('6.6 Tienda y pagos'),
      p('Con el paso al modelo multi-clínica, la tienda dejó de ser un catálogo único de la plataforma: cada veterinaria en plan Pro gestiona sus propios productos y cursos, y decide si su tienda es visible. El cliente solo ve el catálogo de clínicas activas, en plan Pro y con la tienda encendida.'),
      p('El cobro se integró con Wompi, pasarela de pagos colombiana, mediante su modalidad de Web Checkout. El backend genera una firma de integridad (hash SHA-256) para cada transacción y valida la autenticidad de las notificaciones de pago mediante un webhook firmado con un secreto de eventos. El estado del pedido se determina exclusivamente a partir de la confirmación del webhook, nunca de la respuesta del navegador, evitando que el resultado de un pago pueda alterarse desde el lado del cliente.'),
      p('Se tomó una decisión deliberada sobre el alcance de los cobros: la pasarela de la plataforma se reserva para las suscripciones de las clínicas, mientras que las tiendas de cada veterinaria operan en modo simulado. La razón es que cada clínica es una persona jurídica distinta y deberá integrar su propia cuenta de Wompi para recibir el dinero de sus ventas; canalizarlo por la cuenta de la plataforma implicaría que esta actúe como intermediario financiero, con las obligaciones tributarias y regulatorias que ello conlleva.'),
      p('Se implementó además un sistema de expiración automática de pedidos: un pedido en estado pendiente que no se paga dentro de un plazo configurable (30 minutos por defecto) se cancela automáticamente y su stock se devuelve al inventario, evitando que productos queden retenidos indefinidamente por compras abandonadas. El cliente puede reintentar el pago de un pedido pendiente desde su historial mientras no haya expirado. Se cubrió este comportamiento, incluyendo el caso límite de un pago que se confirma después de la expiración, con una suite de 8 casos de prueba.'),
      p('Los montos se manejan en pesos colombianos (COP), formato requerido por la pasarela de pagos y ajustado en la interfaz para representarse según la convención numérica local.'),

      h2('6.7 Recuperación de contraseña'),
      p('Se incorporó el flujo completo de restablecimiento: el usuario solicita el enlace desde la pantalla de inicio de sesión, recibe un correo con un enlace de un solo uso y define su nueva contraseña. El endpoint responde siempre con el mismo mensaje, exista o no la dirección, para no revelar qué correos están registrados. El token se guarda hasheado, vence en una hora y, al utilizarse, revoca todas las sesiones abiertas de la cuenta.'),

      h2('6.8 Reportes y visualización de datos'),
      p('El panel del administrador de la plataforma presenta el recaudo por suscripciones de los últimos seis meses, la distribución de clínicas por estado y por plan, y los vencimientos próximos. El gerente dispone de sus propios reportes con la actividad de su clínica y la distribución de citas por estado.'),
      p('Las gráficas se implementaron sin librerías externas, para no incrementar el peso del paquete ni el consumo de memoria del servidor. Los colores se sometieron a una verificación automatizada de accesibilidad para daltonismo: el par ámbar (pendiente) y verde (confirmada) resultó con una separación perceptual de 7,9 unidades, por debajo del umbral seguro de 8. En consecuencia, todas las barras incorporan etiqueta de texto con el nombre y el valor, de manera que el color nunca sea el único indicador de la información.'),

      h2('6.9 Interfaz y experiencia de usuario'),
      bullet('Diseño responsivo: menú de navegación colapsable en dispositivos móviles y tablas con desplazamiento horizontal en los paneles administrativos.'),
      bullet('Separación de las páginas de inicio y tienda: la página de inicio presenta la propuesta de valor y productos destacados; la tienda incorpora buscador, filtro por categoría y ordenamiento por precio o nombre.'),
      bullet('Visor de imagen a pantalla completa para productos y cursos, implementado mediante un portal de React para evitar conflictos de posicionamiento con los efectos de transformación CSS de las tarjetas.'),
      bullet('Esqueletos de carga que ocupan el lugar del contenido mientras llega, en lugar de mensajes de espera que desplazan el diseño al resolverse.'),
      bullet('Estados vacíos explicativos: en vez de indicar únicamente la ausencia de datos, describen la situación y ofrecen la acción correspondiente.'),
      bullet('Transiciones y microinteracciones que respetan la preferencia de movimiento reducido configurada en el sistema operativo del usuario.'),
      bullet('Selector visual de especie, información contextual mediante tooltips y presentación de importes en pesos colombianos.'),
      bullet('Corrección del error de recarga en rutas internas de la aplicación de una sola página (SPA), mediante configuración de reescritura de rutas en el proveedor de hosting.'),

      // ── 7. Pruebas ─────────────────────────────────────────
      h1('7. Pruebas automatizadas'),
      p('Se desarrollaron dieciséis suites de pruebas de integración que ejercitan la API contra una base de datos real (no simulada), cubriendo el flujo funcional, las reglas de autorización entre roles y los casos límite de cada módulo. Cada suite crea sus propios datos, verifica el comportamiento y limpia lo que creó, de modo que puede ejecutarse repetidamente sin dejar residuos.'),
      table(
        ['Suite', 'Casos', 'Cobertura'],
        [
          ['history', '19', 'Historial clínico: registro, vacunas, notas, permisos entre cliente, veterinario y terceros'],
          ['slots-bulk', '9', 'Generación masiva de jornada laboral: conteo, idempotencia, validaciones'],
          ['order-expiry', '8', 'Expiración de pedidos, devolución de stock, reintento de pago, reactivación tras pago tardío'],
          ['wompi-webhook', '7', 'Verificación de firma del webhook, aprobación, rechazo, reenvío idempotente'],
          ['vets-flow', '15', 'Solicitud de rol veterinario, aprobación y rechazo, horarios y citas por veterinario'],
          ['chat', '17', 'Chat de urgencias por WebSocket: autenticación, entrega, persistencia y permisos'],
          ['multiclinic', '15', 'Aislamiento entre clínicas, historial portable y bitácora break-glass'],
          ['gerente-flow', '15', 'Rol gerente, alta de clínica y candado de suscripción'],
          ['gerente-manage', '12', 'Gestión del equipo veterinario por parte del gerente'],
          ['store-clinic', '10', 'Tienda y cursos por clínica, restringidos al plan Pro'],
          ['subscription-pay', '9', 'Pago de la suscripción por Wompi y activación vía webhook'],
          ['pets-limit', '13', 'Límite de una mascota por cliente y solicitudes de mascota adicional'],
          ['calendar-summary', '9', 'Resumen del calendario: citas por estado y días con horario disponible'],
          ['password-reset', '17', 'Recuperación de contraseña: token de un solo uso, vencimiento y revocación de sesiones'],
          ['subscription-cycle', '26', 'Ciclo de vida: vigencia, renovación acumulativa, vencimiento y reactivación'],
          ['consultations-pdf', '23', 'Consultas clínicas estructuradas y generación del PDF con sus permisos'],
        ],
        [2400, 1000, 5960]
      ),
      new Paragraph({ spacing: { before: 200 } }),
      p('Total: 224 casos de prueba automatizados, ejecutables mediante Node.js sin dependencias adicionales de framework de testing. La suite completa se ejecuta antes de cada publicación a producción; durante el desarrollo detectó regresiones reales, entre ellas un error de inferencia de tipos en PostgreSQL que había inutilizado la activación manual de clínicas desde el panel administrativo.'),

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
          ['Alcance del producto', 'Aplicación para una sola veterinaria', 'Plataforma multi-clínica: cada veterinaria es una entidad con su propio equipo, catálogo y datos aislados', 'Convertir el sistema en un producto comercializable a varias clínicas, no en una instalación a la medida de una sola'],
          ['Modelo de negocio', 'No definido', 'Suscripción mensual por clínica en dos planes (Básico y Pro), cobrada por la plataforma', 'Dotar al proyecto de una fuente de ingresos sostenible y de una razón para diferenciar funcionalidades por plan'],
          ['Roles', 'Cliente y administrador', 'Cliente, veterinario, gerente y administrador de plataforma', 'Separar la administración del negocio de cada clínica (gerente) de la administración de la plataforma (admin), que son intereses distintos'],
          ['Vigencia de la suscripción', 'No existía', 'Cada pago cubre 30 días; al vencer, la clínica se suspende sola y renovar la reactiva', 'Sin vencimiento, un único pago habilitaba el servicio de forma indefinida y el ingreso reportado no correspondía a dinero realmente recaudado'],
          ['Registro de mascotas', 'El cliente registra y edita sus mascotas', 'El cliente registra la primera; las adicionales requieren aprobación de un veterinario', 'Punto intermedio entre el diseño original y la restricción total: preserva el control clínico sin bloquear la primera experiencia del usuario'],
          ['Historia clínica', 'Nota de texto libre asociada a la cita', 'Consulta estructurada con motivo, síntomas, diagnóstico, tratamiento y medicamentos', 'Un campo libre no permite consultar, comparar ni exportar la información clínica de forma fiable'],
          ['Documento clínico', 'No existía', 'Historia clínica descargable en PDF por el dueño y el personal veterinario', 'Los dueños requieren el documento para viajes, guarderías y consultas en otras clínicas'],
          ['Comunicación', 'Solo correo transaccional', 'Chat de urgencias en vivo por WebSocket entre cliente y veterinario', 'Atender consultas que no admiten la espera de una cita agendada'],
          ['Recuperación de contraseña', 'No existía', 'Enlace por correo con token de un solo uso, vencimiento de una hora y revocación de sesiones', 'Una cuenta sin mecanismo de recuperación queda inaccesible de forma permanente al olvidar la contraseña'],
          ['Vista de agenda', 'Lista de horarios y calendario no interactivo', 'Rejilla semanal de horas por días donde se crean, eliminan y gestionan las franjas y citas', 'Definir la jornada y consultarla eran pantallas separadas; la rejilla unifica ambas tareas en una sola vista'],
        ],
        [1700, 2500, 2700, 2460]
      ),

      // ── 9. Conclusiones ────────────────────────────────────
      h1('9. Conclusiones y trabajo futuro'),
      p('El desarrollo de PetGrooming partió de una implementación funcional simplificada y evolucionó, mediante iteraciones sucesivas guiadas por la revisión del documento de arquitectura y por pruebas de uso reales, hacia un sistema que refleja con mayor fidelidad las reglas de negocio del sector veterinario.'),
      p('Se identifican dos cambios de mayor impacto. El primero, la introducción del rol veterinario y la reasignación de la responsabilidad sobre el historial clínico, que motivó ajustes en cascada sobre el modelo de citas, horarios y permisos. El segundo, y de mayor alcance, la transformación del sistema en una plataforma multi-clínica por suscripción: dejó de ser el software de una veterinaria para convertirse en un producto vendible a muchas, lo que obligó a introducir el concepto de clínica como entidad, el rol de gerente, el aislamiento de datos entre inquilinos y un ciclo de cobro con vigencia y suspensión automática.'),
      p('El proyecto se encuentra desplegado y operativo en producción, con 21 tablas, 224 pruebas automatizadas en verde y cuatro roles funcionales. La metodología de trabajo aplicada de forma consistente —construir, probar contra base de datos real, verificar en el navegador y desplegar con verificación posterior en producción— permitió detectar defectos antes de que llegaran al usuario final.'),
      h2('9.1 Trabajo futuro'),
      bullet('Cobro recurrente automático de la suscripción mediante tokenización del medio de pago en Wompi. Actualmente el vencimiento y la suspensión son automáticos, pero la renovación la inicia el gerente de forma manual.'),
      bullet('Integración de una pasarela de pagos propia por clínica, de modo que cada veterinaria reciba directamente el dinero de las ventas de su tienda, hoy en modo simulado.'),
      bullet('Verificación de un dominio propio en el proveedor de correo, para que las notificaciones lleguen a cualquier destinatario y no únicamente a la cuenta asociada al remitente de pruebas.'),
      bullet('Ampliación de la historia clínica con peso y signos vitales por visita, desparasitaciones con fecha de próxima dosis, y una ficha del paciente con sexo, fecha de nacimiento, esterilización y microchip.'),
      bullet('Certificado de vacunación como documento PDF independiente del historial completo.'),
      bullet('Aviso por correo previo al vencimiento de la suscripción, complementando los avisos actuales de pago recibido y de suspensión.'),
      bullet('Ampliación del historial clínico con documentos adjuntos (exámenes, radiografías).'),
      bullet('Registro de un segundo nivel de personal (recepción) diferenciado del rol veterinario.'),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const out = 'C:/Users/USUARIO/Downloads/PetGrooming_Informe_Tecnico.docx';
  fs.writeFileSync(out, buffer);
  console.log('Generado:', out);
});
