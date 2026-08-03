import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TableOfContents,
} from 'docx';
import fs from 'fs';

const CONTENT_W = 9360; // US Letter, márgenes de 1"
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
const p = (text, opts = {}) => new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text, ...opts })] });
const bullet = (text) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 60 }, children: [new TextRun(text)] });
const paso = (text) => new Paragraph({ numbering: { reference: 'pasos', level: 0 }, spacing: { after: 80 }, children: [new TextRun(text)] });

// Marca dónde va una captura de pantalla. El texto describe qué se debe fotografiar.
const captura = (descripcion) => new Paragraph({
  spacing: { before: 120, after: 200 },
  border: {
    top: { style: BorderStyle.DASHED, size: 1, color: '9CA3AF' },
    bottom: { style: BorderStyle.DASHED, size: 1, color: '9CA3AF' },
    left: { style: BorderStyle.DASHED, size: 1, color: '9CA3AF' },
    right: { style: BorderStyle.DASHED, size: 1, color: '9CA3AF' },
  },
  shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
  children: [new TextRun({ text: `📷  CAPTURA: ${descripcion}`, italics: true, color: '64748B', size: 20 })],
});

// Recuadro de aviso o consejo.
const nota = (texto, tipo = 'Nota') => new Paragraph({
  spacing: { before: 120, after: 200 },
  shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: '2563EB' } },
  indent: { left: 200 },
  children: [
    new TextRun({ text: `${tipo}: `, bold: true, color: '1E40AF' }),
    new TextRun({ text: texto, color: '1E3A5F' }),
  ],
});

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
      { reference: 'pasos', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'PetGrooming — Manual de Usuario', size: 16, color: '888888' })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun('Página '), new TextRun({ children: [PageNumber.CURRENT] }), new TextRun(' de '), new TextRun({ children: [PageNumber.TOTAL_PAGES] })],
      })] }),
    },
    children: [
      // ── Portada ──
      new Paragraph({ spacing: { before: 1400 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'PETGROOMING', bold: true, size: 56, color: '1E3A8A' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: 'Manual de Usuario', size: 32, color: '2563EB' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800 },
        children: [new TextRun({ text: 'Guía paso a paso para cada tipo de usuario', italics: true, size: 22, color: '64748B' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200 },
        children: [new TextRun({ text: 'Plataforma de gestión para veterinarias', size: 22 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 },
        children: [new TextRun({ text: 'petgrooming-tau.vercel.app', size: 22, color: '2563EB' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Universidad Internacional del Trópico Americano – UNITRÓPICO', size: 20 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Yopal, 2026', size: 20 })] }),
      new Paragraph({ children: [new PageBreak()] }),

      new TableOfContents('Contenido', { hyperlink: true, headingStyleRange: '1-3' }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 1. Introducción ──
      h1('1. ¿Qué es PetGrooming?'),
      p('PetGrooming es una plataforma web donde las veterinarias gestionan su día a día y los dueños de mascotas acceden a los servicios de su clínica desde cualquier dispositivo con navegador. No hay que instalar nada.'),
      p('Según quién seas, la plataforma te muestra opciones distintas. Este manual está dividido por tipo de usuario: busca tu capítulo y sigue los pasos.'),
      table(
        ['Si eres…', 'Ve al capítulo', 'Qué puedes hacer'],
        [
          ['Dueño de una mascota', '3. Cliente', 'Agendar citas, ver y descargar la historia clínica, comprar, chat de urgencias'],
          ['Veterinario', '4. Veterinario', 'Atender pacientes, registrar consultas y vacunas, manejar tu agenda'],
          ['Dueño o administrador de una veterinaria', '5. Gerente', 'Administrar tu clínica, tu equipo, tu tienda y tu suscripción'],
          ['Administrador de la plataforma', '6. Administrador', 'Gestionar las veterinarias suscritas y ver los ingresos'],
        ],
        [2400, 1900, 5060]
      ),

      // ── 2. Primeros pasos ──
      h1('2. Primeros pasos'),

      h2('2.1 Crear una cuenta'),
      p('Al entrar a la plataforma verás el botón "Registro" en la parte superior derecha. El formulario te pide primero qué tipo de cuenta quieres:'),
      table(
        ['Opción', 'Elígela si…', 'Qué pasa después'],
        [
          ['🐾 Cliente', 'Eres dueño de una mascota', 'Tu cuenta queda activa de inmediato'],
          ['🩺 Veterinario', 'Vas a atender pacientes', 'Eliges tu veterinaria y su gerente debe aprobarte'],
          ['🏥 Veterinaria', 'Vas a administrar una clínica', 'Se crea tu veterinaria y debes pagar la suscripción'],
        ],
        [1800, 3200, 4360]
      ),
      captura('Pantalla de registro mostrando las tres opciones de tipo de cuenta'),
      paso('Pulsa "Registro" en el menú superior.'),
      paso('Elige el tipo de cuenta que corresponde.'),
      paso('Completa nombre, correo y contraseña. El teléfono es opcional.'),
      paso('Si eres veterinario, selecciona la veterinaria donde vas a trabajar.'),
      paso('Si registras una veterinaria, escribe su nombre, dirección y teléfono.'),
      paso('Pulsa "Registrarme".'),
      nota('Usa un correo real: es por donde llegan la recuperación de contraseña y las confirmaciones de cita.'),

      h2('2.2 Iniciar sesión'),
      paso('Pulsa "Entrar" en el menú superior.'),
      paso('Escribe tu correo y contraseña.'),
      paso('Pulsa "Entrar". El sistema te lleva directo a la pantalla de tu rol.'),

      h2('2.3 Recuperar la contraseña'),
      p('Si olvidaste tu contraseña no necesitas ayuda de nadie: el sistema te envía un enlace por correo.'),
      paso('En la pantalla de inicio de sesión, pulsa "¿Olvidaste tu contraseña?".'),
      paso('Escribe tu correo y pulsa "Enviar enlace".'),
      paso('Abre el correo que te llega (revisa también la carpeta de spam).'),
      paso('Pulsa el botón "Crear nueva contraseña".'),
      paso('Escribe la contraseña nueva dos veces y guarda.'),
      captura('Correo de recuperación con el botón "Crear nueva contraseña"'),
      nota('El enlace vence en una hora y sirve una sola vez. Al usarlo se cierran todas las sesiones abiertas de tu cuenta, por seguridad.', 'Importante'),

      // ── 3. Cliente ──
      h1('3. Manual del Cliente'),
      p('Como dueño de mascota puedes registrar a tu compañero, agendar citas, consultar su historia clínica, comprar en la tienda y contactar a un veterinario en caso de urgencia.'),

      h2('3.1 Registrar tu mascota'),
      p('Puedes registrar tu primera mascota tú mismo. Para las siguientes necesitas que un veterinario apruebe la solicitud, porque a partir de la segunda la clínica lleva el control de los datos.'),
      h3('Tu primera mascota'),
      paso('Entra a "Mis mascotas" en el menú.'),
      paso('Completa el nombre, la raza y la edad.'),
      paso('Elige la especie tocando la tarjeta de Perro, Gato u Otro.'),
      paso('Si tiene alergias o alguna condición, escríbela en las notas.'),
      paso('Pulsa "Registrar mi mascota".'),
      captura('Formulario de registro de la primera mascota con el selector de especie'),
      h3('Una mascota adicional'),
      paso('En "Mis mascotas", pulsa "Solicitar mascota adicional".'),
      paso('Completa los datos igual que antes y pulsa "Enviar solicitud".'),
      paso('Verás la solicitud marcada como "Pendiente".'),
      paso('Cuando un veterinario la apruebe, la mascota aparecerá en tu lista.'),

      h2('3.2 Agendar una cita'),
      paso('Entra a "Citas".'),
      paso('Elige la mascota que vas a llevar.'),
      paso('Selecciona el veterinario que prefieras.'),
      paso('Escoge uno de los horarios disponibles que muestre ese veterinario.'),
      paso('Confirma. Recibirás un correo con los datos de la cita.'),
      captura('Pantalla de agendamiento con la lista de horarios disponibles'),
      nota('Solo aparecen horarios de veterinarias activas. Si no ves ninguno, esa clínica aún no ha publicado su agenda.'),

      h3('Cancelar una cita'),
      paso('En "Citas", busca la cita y pulsa "Cancelar".'),
      paso('Confirma en el aviso que aparece.'),
      p('El horario queda libre para otros clientes, así que si cambias de opinión tendrás que agendar de nuevo según disponibilidad.'),

      h2('3.3 Consultar y descargar la historia clínica'),
      p('Todo lo que el veterinario registra sobre tu mascota queda disponible para ti en modo lectura.'),
      paso('Entra a "Mis mascotas".'),
      paso('Pulsa "Ver historial" en la mascota que quieras.'),
      paso('Verás las consultas con su diagnóstico y tratamiento, las vacunas y las citas.'),
      paso('Para llevarlo contigo, pulsa el botón "📄 PDF".'),
      captura('Historia clínica desplegada con una consulta y el botón PDF visible'),
      nota('El PDF sirve para viajes, guarderías, adopciones o para llevarlo a otra veterinaria. Se genera con la información del momento en que lo descargas.'),

      h2('3.4 Comprar en la tienda'),
      paso('Entra a "Tienda".'),
      paso('Usa el buscador o los filtros del panel izquierdo: categoría, veterinaria, rango de precio o solo productos disponibles.'),
      paso('Pulsa un producto para ver su ficha completa.'),
      paso('Elige la cantidad con los botones − y +.'),
      paso('Pulsa "Agregar al carrito" o "Comprar ahora".'),
      paso('En el carrito, revisa el total y confirma el pedido.'),
      captura('Tienda con el panel de filtros y la rejilla de productos'),
      captura('Ficha de un producto con el selector de cantidad y el subtotal'),
      nota('Tienes 30 minutos para pagar un pedido. Si no lo haces, se cancela solo y los productos vuelven al inventario para otros compradores.', 'Ten en cuenta'),

      h2('3.5 Chat de urgencias'),
      p('Para consultas que no pueden esperar a una cita, tienes un canal directo con el personal veterinario.'),
      paso('Pulsa "🚨 Urgencias" en el menú.'),
      paso('Elige un veterinario disponible e inicia la conversación.'),
      paso('Escribe tu consulta. Los mensajes llegan en el momento.'),
      nota('El chat no reemplaza una consulta presencial. Si tu mascota está en peligro, acude de inmediato a la clínica.', 'Importante'),

      // ── 4. Veterinario ──
      h1('4. Manual del Veterinario'),
      p('Como veterinario gestionas tu agenda, atiendes a los pacientes y documentas su historia clínica.'),
      nota('Tu cuenta debe estar aprobada por el gerente de tu veterinaria, y la veterinaria debe tener su suscripción al día. Si está vencida, no podrás registrar nada hasta que el gerente renueve.', 'Requisito'),

      h2('4.1 Definir tu horario de atención'),
      p('Antes de que alguien pueda agendar contigo, debes publicar tus franjas disponibles. Hay dos formas.'),
      h3('Jornada completa (recomendado)'),
      paso('Entra a "Horarios".'),
      paso('Elige el rango de fechas: desde cuándo y hasta cuándo.'),
      paso('Marca los días de la semana que atiendes.'),
      paso('Define tu hora de inicio y de fin, y cuánto dura cada cita.'),
      paso('Pulsa "Generar horarios de la jornada".'),
      p('El sistema crea todas las franjas de una vez y omite las que ya existan o sean de fechas pasadas.'),
      captura('Formulario de jornada laboral con los días de la semana seleccionados'),

      h3('Franjas sueltas desde la rejilla'),
      paso('En "Horarios" o en "Agenda", baja hasta la rejilla semanal.'),
      paso('Pulsa el signo + en la casilla del día y la hora que quieras abrir.'),
      paso('La franja aparece en verde marcada como "Libre".'),
      p('Para quitar una franja, púlsala y confirma. Las casillas grises están fuera del horario de tu veterinaria y no se pueden usar.'),
      captura('Rejilla semanal con franjas libres en verde y citas en color'),
      nota('El horario de atención lo define el gerente de tu clínica. Si necesitas atender más temprano o más tarde, pídele que lo amplíe.'),

      h2('4.2 Ver y gestionar tu agenda'),
      paso('Entra a "Agenda".'),
      paso('Elige la vista "Semana" para la rejilla de horas, o "Mes" para el calendario general.'),
      paso('Pulsa una cita para abrir el día correspondiente.'),
      paso('Usa "Confirmar" para aceptar una cita pendiente, o "Rechazar" si no puedes atenderla.'),
      paso('Cuando termines de atender, pulsa "Completar" y escribe las notas de la consulta.'),
      captura('Agenda en vista semana con citas de distintos colores según su estado'),
      p('Los colores indican el estado: ámbar es pendiente, verde confirmada, azul completada y rojo cancelada.'),

      h2('4.3 Registrar una mascota'),
      paso('Entra a "Mascotas".'),
      paso('Selecciona el cliente dueño en la lista desplegable.'),
      paso('Completa nombre, raza, especie y edad.'),
      paso('Escribe en las notas clínicas cualquier alergia o condición permanente.'),
      paso('Pulsa "Registrar mascota".'),
      p('Tú no tienes límite de mascotas. El límite de una aplica solo a los clientes que se registran por su cuenta.'),

      h2('4.4 Aprobar solicitudes de mascota'),
      p('Cuando un cliente pide registrar una mascota adicional, la solicitud aparece en un recuadro ámbar al inicio de tu pantalla de mascotas.'),
      paso('Revisa los datos y quién la solicita.'),
      paso('Pulsa "✓ Aprobar" para crearla, o "✕ Rechazar" si algo no cuadra.'),
      captura('Recuadro de solicitudes de mascota adicional pendientes'),

      h2('4.5 Registrar una consulta clínica'),
      p('Es el registro más importante del sistema: alimenta la historia clínica y el PDF que se lleva el dueño.'),
      paso('En "Mascotas", pulsa "🩺 Consulta" en la fila del paciente.'),
      paso('Escribe el motivo de consulta (obligatorio).'),
      paso('Completa los síntomas observados.'),
      paso('Registra tu diagnóstico.'),
      paso('Indica el tratamiento y los medicamentos recetados con su dosis.'),
      paso('Pulsa "Guardar consulta en el historial".'),
      captura('Formulario de consulta clínica con sus cinco campos'),

      h2('4.6 Registrar una vacuna'),
      paso('En "Mascotas", pulsa "💉 Vacuna".'),
      paso('Escribe el nombre de la vacuna y la fecha de aplicación.'),
      paso('Pulsa "Guardar".'),

      h2('4.7 Consultar historiales y descargar el PDF'),
      paso('Pulsa "📋 Historial" para ver el expediente completo en pantalla.'),
      paso('Pulsa "📄 PDF" para descargar el documento.'),
      nota('Puedes consultar el historial de cualquier mascota, aunque sea de otra veterinaria: en una urgencia esa información salva vidas. A cambio, cada acceso queda registrado con tu nombre en la bitácora de auditoría que revisa el administrador.', 'Importante'),

      // ── 5. Gerente ──
      h1('5. Manual del Gerente'),
      p('Como gerente administras el negocio de tu veterinaria: el equipo, la suscripción, la tienda y los reportes. No atiendes pacientes; de eso se encargan tus veterinarios.'),

      h2('5.1 Activar tu veterinaria'),
      p('Al registrarte, tu veterinaria nace en estado "pendiente". Para operar debes pagar la suscripción.'),
      table(
        ['Plan', 'Precio mensual', 'Incluye'],
        [
          ['Básico', '$ 60.000 COP', 'Citas, historia clínica y gestión de tu equipo'],
          ['Pro', '$ 150.000 COP', 'Todo lo del Básico, más tienda en línea y cursos propios'],
        ],
        [1600, 2400, 5360]
      ),
      paso('Entra a "Mi veterinaria".'),
      paso('En la sección de planes, pulsa el que quieras contratar.'),
      paso('Completa el pago. Tu veterinaria queda activa al instante.'),
      captura('Panel del gerente con los dos planes y el estado de la veterinaria'),

      h2('5.2 Entender la vigencia'),
      p('Cada pago cubre 30 días. En tu panel ves la fecha exacta hasta la que estás cubierto y cuántos días te quedan.'),
      bullet('Con más de 5 días restantes, el aviso es gris.'),
      bullet('A 5 días o menos, se pone ámbar con un botón para renovar.'),
      bullet('Si vence, se pone rojo y tu veterinaria queda suspendida.'),
      p('Suspendida significa que tus veterinarios no pueden atender, sus horarios desaparecen del agendamiento y tu tienda deja de verse. Al renovar, todo se reactiva al instante.'),
      nota('Si renuevas antes de que venza, los 30 días se suman a lo que te queda. No pierdes el tiempo que ya pagaste.'),

      h2('5.3 Configurar los datos y el horario'),
      paso('En "Mi veterinaria", pulsa "✏️ Editar".'),
      paso('Actualiza el nombre, la dirección o el teléfono.'),
      paso('Define la hora de apertura y de cierre.'),
      paso('Guarda los cambios.'),
      captura('Formulario de edición con las horas de apertura y cierre'),
      nota('El horario que definas limita a tus veterinarios: no podrán abrir franjas fuera de él. Si alguno necesita atender más temprano, amplíalo aquí.', 'Importante'),

      h2('5.4 Aprobar veterinarios'),
      paso('Entra a "Veterinarios".'),
      paso('Revisa las solicitudes pendientes en el recuadro ámbar.'),
      paso('Pulsa "✓ Aprobar" para sumarlo a tu equipo, o "✕ Rechazar".'),
      p('También puedes desactivar a un veterinario que ya no trabaje contigo. Sus citas e historial se conservan; solo pierde el acceso.'),

      h2('5.5 Gestionar tu tienda y cursos'),
      nota('Esta sección requiere el plan Pro. Con el plan Básico verás un aviso invitándote a mejorar.', 'Requisito'),
      paso('Entra a "Tienda y cursos".'),
      paso('Usa el interruptor para que tu tienda sea visible a los clientes.'),
      paso('En la pestaña Productos, completa el formulario y pulsa "Agregar producto".'),
      paso('En la pestaña Cursos, haz lo mismo con tus cursos.'),
      captura('Panel de tienda con el interruptor y la lista de productos'),

      h2('5.6 Consultar tus reportes'),
      p('En "Reportes" ves cuántos veterinarios activos tienes, el total de citas, las próximas y cómo se reparten por estado.'),

      // ── 6. Administrador ──
      h1('6. Manual del Administrador de la plataforma'),
      p('El administrador gestiona el negocio de vender el software: las veterinarias suscritas, sus planes y los ingresos. No accede a las historias clínicas.'),

      h2('6.1 Ver el estado del negocio'),
      p('En "Clínicas y suscripciones" está el panorama completo:'),
      table(
        ['Indicador', 'Qué significa'],
        [
          ['Recaudado este mes', 'Dinero efectivamente cobrado, según el historial de pagos'],
          ['Proyectado mensual', 'Lo que facturarían todas las clínicas activas si renovaran'],
          ['Activas / Pendientes / Suspendidas', 'Cuántas veterinarias hay en cada estado'],
          ['Recaudo por suscripciones', 'Gráfica de los últimos seis meses'],
          ['Vencen en los próximos 7 días', 'A quién hay que cobrarle pronto'],
        ],
        [3000, 6360]
      ),
      captura('Panel de administración con las gráficas de recaudo y la tabla de clínicas'),

      h2('6.2 Gestionar una veterinaria'),
      table(
        ['Acción', 'Para qué sirve'],
        [
          ['Cambiar el plan', 'Pasar una clínica de Básico a Pro o al revés'],
          ['Activar', 'Habilitar una clínica manualmente; recibe 30 días de vigencia'],
          ['Vencer ahora', 'Cortar el servicio al instante, por ejemplo por impago'],
          ['+30 días', 'Extender la vigencia, por ejemplo como cortesía'],
        ],
        [2200, 7160]
      ),

      h2('6.3 Revisar la auditoría de historiales'),
      p('Al final de la pantalla de clínicas está la bitácora de accesos: cada vez que un veterinario consulta o descarga una historia clínica, queda registrado con su nombre, su clínica, la mascota y la fecha. Es el control que compensa el que los historiales sean accesibles entre veterinarias.'),

      // ── 7. Problemas frecuentes ──
      h1('7. Problemas frecuentes'),
      table(
        ['Situación', 'Qué hacer'],
        [
          ['La página tarda mucho en cargar la primera vez', 'El servidor se suspende tras un rato sin uso. La primera petición puede tardar cerca de un minuto; las siguientes son inmediatas.'],
          ['No me llega el correo de recuperación', 'Revisa la carpeta de spam. Verifica que el correo esté bien escrito y que sea el mismo con el que te registraste.'],
          ['No puedo crear una franja de atención', 'Revisa que esté dentro del horario de tu veterinaria, que no sea una fecha pasada y que la suscripción de tu clínica esté al día.'],
          ['Mis veterinarios no pueden atender', 'Lo más probable es que la suscripción haya vencido. Entra a "Mi veterinaria" y renueva.'],
          ['La tienda aparece vacía', 'Solo se muestran productos de veterinarias activas, en plan Pro y con la tienda encendida.'],
          ['No veo horarios para agendar', 'El veterinario aún no ha publicado su jornada, o su veterinaria no está activa.'],
          ['Mi pedido se canceló solo', 'Los pedidos sin pagar se cancelan a los 30 minutos para liberar el inventario. Vuelve a hacerlo.'],
          ['Quiero registrar otra mascota y no me deja', 'Solo la primera es directa. Usa "Solicitar mascota adicional" y espera la aprobación de un veterinario.'],
        ],
        [3000, 6360]
      ),

      h1('8. Glosario'),
      table(
        ['Término', 'Qué significa'],
        [
          ['Franja', 'Un bloque de tiempo que el veterinario abre para que le agenden una cita'],
          ['Jornada', 'El conjunto de franjas de varios días generadas de una sola vez'],
          ['Vigencia', 'La fecha hasta la que la suscripción de una veterinaria está pagada'],
          ['Plan Básico / Pro', 'Los dos niveles de suscripción; el Pro añade tienda y cursos'],
          ['Historia clínica', 'El expediente de la mascota: consultas, vacunas y citas'],
          ['Consulta clínica', 'El registro de una atención: motivo, síntomas, diagnóstico, tratamiento y medicamentos'],
          ['Bitácora de auditoría', 'El registro de quién consultó cada historia clínica y cuándo'],
        ],
        [2400, 6960]
      ),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const out = 'C:/Users/USUARIO/Downloads/PetGrooming_Manual_Usuario.docx';
  fs.writeFileSync(out, buffer);
  console.log('Generado:', out);
});
