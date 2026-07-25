import PDFDocument from 'pdfkit';

// Generación del documento PDF de la historia clínica de una mascota.
// Se usa Helvetica (fuente base de PDF): cubre los acentos y la ñ del
// español sin necesidad de incrustar tipografías.

const BRAND = '#0d9488';
const INK = '#1e293b';
const MUTED = '#64748b';
const LINE = '#e2e8f0';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const SPECIES_LABEL = { perro: 'Perro', gato: 'Gato' };

// Encabezado de la marca, en la primera página.
const drawHeader = (doc) => {
  doc.rect(0, 0, doc.page.width, 90).fill(BRAND);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22)
    .text('PetGrooming', 50, 28);
  doc.font('Helvetica').fontSize(11)
    .text('Historia clínica veterinaria', 50, 55);
  doc.fontSize(9)
    .text(`Emitido el ${fmtDateTime(new Date())}`, 50, 55, {
      align: 'right', width: doc.page.width - 100,
    });
  doc.fillColor(INK).moveDown();
  doc.y = 120;
};

// Título de sección con línea inferior. Salta de página si no cabe el
// encabezado más al menos un registro, para no dejar títulos huérfanos.
const section = (doc, title) => {
  if (doc.y > doc.page.height - 115) doc.addPage();
  doc.moveDown(0.8);
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(13).text(title, 50);
  const y = doc.y + 3;
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(BRAND).lineWidth(1.5).stroke();
  doc.moveDown(0.6);
  doc.fillColor(INK).font('Helvetica').fontSize(10);
};

// Par etiqueta/valor en dos columnas.
const field = (doc, label, value, x, width) => {
  doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(label.toUpperCase(), x, doc.y, { width });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(10.5).text(value || '—', x, doc.y, { width });
};

// Bloque de texto largo con su etiqueta (diagnóstico, tratamiento…).
const block = (doc, label, value) => {
  if (!value) return;
  if (doc.y > doc.page.height - 110) doc.addPage();
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8.5).text(label.toUpperCase(), 62);
  doc.fillColor(INK).font('Helvetica').fontSize(10)
    .text(value, 62, doc.y, { width: doc.page.width - 124 });
  doc.moveDown(0.35);
};

// Nota cuando una sección no tiene registros.
const emptyNote = (doc, text) => {
  doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(10).text(text, 62);
  doc.fillColor(INK).font('Helvetica');
};

// Pie con numeración y aviso de confidencialidad, en todas las páginas.
// El pie se dibuja por debajo del margen inferior: hay que anular ese margen
// o PDFKit lo interpreta como desbordamiento y agrega una página por cada pie.
const drawFooters = (doc) => {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 45;
    doc.moveTo(50, y - 8).lineTo(doc.page.width - 50, y - 8).strokeColor(LINE).lineWidth(1).stroke();
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
      .text('Documento confidencial. Contiene información clínica de la mascota y datos de su propietario.', 50, y, {
        width: doc.page.width - 100,
      })
      .text(`Página ${i + 1} de ${range.count}`, 50, y, {
        width: doc.page.width - 100, align: 'right',
      });
  }
};

// Construye el PDF completo y lo escribe en el stream indicado (la respuesta HTTP).
// data: { pet, owner, vaccines, consultations, appointments }
export const buildPetHistoryPdf = ({ pet, owner, vaccines, consultations, appointments }, stream) => {
  const doc = new PDFDocument({ size: 'LETTER', margin: 50, bufferPages: true, info: {
    Title: `Historia clínica - ${pet.name}`,
    Author: 'PetGrooming',
    Subject: `Historia clínica veterinaria de ${pet.name}`,
  }});
  doc.pipe(stream);

  drawHeader(doc);

  // ── Identificación de la mascota ──
  const half = (doc.page.width - 100) / 2;
  section(doc, `Paciente: ${pet.name}`);
  const rowY = doc.y;
  field(doc, 'Especie', SPECIES_LABEL[pet.species?.toLowerCase()] || pet.species, 62, half - 12);
  const afterLeft = doc.y;
  doc.y = rowY;
  field(doc, 'Raza', pet.breed, 62 + half, half - 12);
  doc.y = Math.max(afterLeft, doc.y);

  const rowY2 = doc.y;
  field(doc, 'Edad', pet.age != null ? `${pet.age} año${pet.age !== 1 ? 's' : ''}` : null, 62, half - 12);
  const afterLeft2 = doc.y;
  doc.y = rowY2;
  field(doc, 'Registrada el', fmtDate(pet.created_at), 62 + half, half - 12);
  doc.y = Math.max(afterLeft2, doc.y);

  if (pet.notes) {
    doc.moveDown(0.4);
    block(doc, 'Notas clínicas permanentes', pet.notes);
  }

  // ── Propietario ──
  section(doc, 'Propietario');
  const rowY3 = doc.y;
  field(doc, 'Nombre', owner?.name, 62, half - 12);
  const afterLeft3 = doc.y;
  doc.y = rowY3;
  field(doc, 'Contacto', owner?.phone || owner?.email, 62 + half, half - 12);
  doc.y = Math.max(afterLeft3, doc.y);

  // ── Consultas clínicas ──
  section(doc, `Consultas clínicas (${consultations.length})`);
  if (!consultations.length) {
    emptyNote(doc, 'Sin consultas registradas.');
  } else {
    for (const c of consultations) {
      if (doc.y > doc.page.height - 170) doc.addPage();
      doc.moveDown(0.3);
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(11)
        .text(`${fmtDate(c.consulted_at)} — ${c.reason}`, 55);
      doc.fillColor(MUTED).font('Helvetica').fontSize(8.5)
        .text(`Atendió: ${c.vet_name || 'No registrado'}${c.clinic_name ? ` · ${c.clinic_name}` : ''}`, 55);
      doc.moveDown(0.3);
      block(doc, 'Síntomas', c.symptoms);
      block(doc, 'Diagnóstico', c.diagnosis);
      block(doc, 'Tratamiento', c.treatment);
      block(doc, 'Medicamentos', c.medications);
      doc.moveDown(0.2);
      doc.moveTo(55, doc.y).lineTo(doc.page.width - 55, doc.y).strokeColor(LINE).lineWidth(0.5).stroke();
      doc.moveDown(0.3);
    }
  }

  // ── Vacunas ──
  section(doc, `Vacunas aplicadas (${vaccines.length})`);
  if (!vaccines.length) {
    emptyNote(doc, 'Sin vacunas registradas.');
  } else {
    for (const v of vaccines) {
      if (doc.y > doc.page.height - 110) doc.addPage();
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(10).text(`• ${v.name}`, 62, doc.y, { continued: true });
      doc.font('Helvetica').fillColor(MUTED).fontSize(9.5).text(`   ${fmtDate(v.applied_date)}`);
      const meta = [v.vet_name && `Aplicó: ${v.vet_name}`, v.clinic_name, v.notes].filter(Boolean).join(' · ');
      if (meta) doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text(meta, 70);
      doc.moveDown(0.3);
    }
  }

  // ── Citas ──
  section(doc, `Historial de citas (${appointments.length})`);
  if (!appointments.length) {
    emptyNote(doc, 'Sin citas registradas.');
  } else {
    for (const a of appointments) {
      if (doc.y > doc.page.height - 110) doc.addPage();
      doc.fillColor(INK).font('Helvetica').fontSize(10)
        .text(`• ${fmtDateTime(a.starts_at)} — ${a.status}`, 62);
      if (a.notes) doc.fillColor(MUTED).fontSize(8.5).text(a.notes, 70, doc.y, { width: doc.page.width - 132 });
      doc.moveDown(0.25);
    }
  }

  drawFooters(doc);
  doc.end();
  return doc;
};
