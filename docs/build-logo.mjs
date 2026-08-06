import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

// pdfkit es una dependencia del backend (la usa el PDF de la historia clínica),
// no de docs/. Se resuelve desde allí para no duplicar la instalación.
const aqui = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(aqui, '../backend/package.json'));
const PDFDocument = require('pdfkit');

// Genera el manual de marca de PetGrooming en PDF listo para imprenta.
//
// Por qué PDF y no PNG: el logo queda en vectores, así que se puede imprimir
// desde una tarjeta de presentación hasta un pendón sin pixelarse. El texto usa
// Helvetica, una de las 14 fuentes estándar del formato PDF, de modo que se ve
// igual en cualquier equipo de impresión aunque no tenga instalada la fuente
// de la marca.

const AZUL = '#2563eb';
const AZUL_OSCURO = '#1e40af';
const AMARILLO = '#facc15';
const TINTA = '#111827';
const GRIS = '#64748b';
const GRIS_CLARO = '#e2e8f0';

// Dibuja la huella dentro de un cuadro de 110x110 en el origen indicado.
// escala 1 = 110 pt de lado.
const huella = (doc, x, y, lado, color) => {
  const s = lado / 110;
  doc.save().translate(x, y).scale(s, { origin: [0, 0] }).fillColor(color);

  // Almohadilla central
  doc.path('M55 52 C71 52, 82 63, 82 74 C82 85, 70 92, 55 92 C40 92, 28 85, 28 74 C28 63, 39 52, 55 52 Z').fill();

  // Los cuatro dedos, cada uno rotado hacia afuera
  const dedos = [
    { cx: 26, cy: 43, rx: 10, ry: 13, rot: -22 },
    { cx: 45, cy: 31, rx: 10.5, ry: 14, rot: -8 },
    { cx: 66, cy: 31, rx: 10.5, ry: 14, rot: 8 },
    { cx: 85, cy: 43, rx: 10, ry: 13, rot: 22 },
  ];
  for (const d of dedos) {
    doc.save().rotate(d.rot, { origin: [d.cx, d.cy] }).ellipse(d.cx, d.cy, d.rx, d.ry).fill().restore();
  }

  doc.restore();
};

// Distintivo completo: cuadro redondeado con la huella centrada.
const isotipo = (doc, x, y, lado, { fondo = AZUL, tinta = '#ffffff', contorno = null } = {}) => {
  doc.roundedRect(x, y, lado, lado, lado * 0.255);
  if (contorno) doc.lineWidth(lado * 0.028).strokeColor(contorno).stroke();
  else doc.fillColor(fondo).fill();
  huella(doc, x, y, lado, tinta);
};

// Logo horizontal: distintivo + nombre + línea amarilla + lema.
const logoHorizontal = (doc, x, y, lado, { tinta1 = AZUL_OSCURO, tinta2 = AZUL, linea = AMARILLO, lema = GRIS, fondo = AZUL, huellaColor = '#ffffff', contorno = null } = {}) => {
  isotipo(doc, x, y, lado, { fondo, tinta: huellaColor, contorno });

  const tx = x + lado * 1.35;
  const tamNombre = lado * 0.40;
  doc.font('Helvetica-Bold').fontSize(tamNombre).fillColor(tinta1);
  const anchoPet = doc.widthOfString('Pet');
  doc.text('Pet', tx, y + lado * 0.20, { lineBreak: false });
  doc.font('Helvetica').fillColor(tinta2).text('Grooming', tx + anchoPet, y + lado * 0.20, { lineBreak: false });

  const anchoTotal = anchoPet + doc.widthOfString('Grooming');
  doc.rect(tx + 2, y + lado * 0.70, anchoTotal - 4, lado * 0.026).fillColor(linea).fill();

  doc.font('Helvetica').fontSize(lado * 0.115).fillColor(lema)
    .text('CUIDAMOS A TU MEJOR AMIGO', tx, y + lado * 0.80, { characterSpacing: lado * 0.021, lineBreak: false });
};

const doc = new PDFDocument({
  size: 'LETTER',
  margin: 54,
  info: { Title: 'PetGrooming — Manual de marca', Author: 'PetGrooming', Subject: 'Logo e identidad visual' },
});
doc.pipe(fs.createWriteStream('C:/Users/USUARIO/Downloads/PetGrooming_Logo.pdf'));

// ── Página 1: el logo, grande y listo para usar ──
doc.font('Helvetica').fontSize(9).fillColor(GRIS)
  .text('MANUAL DE MARCA', 54, 54, { characterSpacing: 2 });

logoHorizontal(doc, 70, 170, 130);

doc.font('Helvetica').fontSize(9).fillColor(GRIS)
  .text('Versión principal — a color, sobre fondo claro', 70, 350);

// Versión sobre fondo azul (para portadas y camisetas)
doc.roundedRect(54, 400, 504, 200, 14).fillColor(AZUL).fill();
logoHorizontal(doc, 90, 445, 110, {
  tinta1: '#ffffff', tinta2: '#dbeafe', linea: AMARILLO, lema: '#bfdbfe',
  fondo: '#ffffff', huellaColor: AZUL,
});
doc.font('Helvetica').fontSize(9).fillColor(GRIS)
  .text('Versión sobre fondo azul — invierte el distintivo para mantener el contraste', 54, 615);

doc.font('Helvetica').fontSize(8).fillColor(GRIS)
  .text('Documento vectorial: se puede ampliar a cualquier tamaño sin perder nitidez.', 54, 700);

// ── Página 2: variantes, paleta y uso ──
doc.addPage();

doc.font('Helvetica-Bold').fontSize(16).fillColor(AZUL_OSCURO).text('Variantes del isotipo', 54, 54);
doc.font('Helvetica').fontSize(9).fillColor(GRIS)
  .text('El distintivo funciona solo cuando no hay espacio para el nombre completo.', 54, 78);

const variantes = [
  { x: 54, opciones: {}, etiqueta: 'A color' },
  { x: 174, opciones: { fondo: TINTA }, etiqueta: 'Una tinta' },
  { x: 294, opciones: { contorno: TINTA, tinta: TINTA }, etiqueta: 'Contorno' },
];
for (const v of variantes) {
  isotipo(doc, v.x, 110, 90, v.opciones);
  doc.font('Helvetica').fontSize(9).fillColor(GRIS).text(v.etiqueta, v.x, 212);
}
// Tamaño mínimo
isotipo(doc, 414, 110, 32);
doc.font('Helvetica').fontSize(9).fillColor(GRIS).text('Mínimo: 32 pt', 414, 212);

doc.font('Helvetica-Bold').fontSize(16).fillColor(AZUL_OSCURO).text('Paleta', 54, 260);

const colores = [
  { hex: AZUL, nombre: 'Azul de marca', uso: 'Distintivo, botones' },
  { hex: AZUL_OSCURO, nombre: 'Azul oscuro', uso: 'Títulos, "Pet"' },
  { hex: AMARILLO, nombre: 'Amarillo', uso: 'Solo detalles' },
  { hex: TINTA, nombre: 'Tinta', uso: 'Una tinta, texto' },
];
let cy = 292;
for (const c of colores) {
  doc.roundedRect(54, cy, 34, 34, 8).fillColor(c.hex).fill();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(TINTA).text(c.nombre, 100, cy + 4);
  doc.font('Helvetica').fontSize(9).fillColor(GRIS).text(`${c.hex.toUpperCase()}  ·  ${c.uso}`, 100, cy + 18);
  cy += 46;
}

doc.font('Helvetica-Bold').fontSize(16).fillColor(AZUL_OSCURO).text('Cómo usarlo', 54, cy + 16);
const reglas = [
  'Deja alrededor del logo un espacio libre igual a la mitad del distintivo.',
  'No lo estires ni lo comprimas: manténlo siempre proporcional.',
  'Sobre fondos oscuros o fotografías, usa la versión de una tinta en blanco.',
  'Para grabados, sellos o impresión a una tinta, usa la versión de contorno.',
  'No cambies los colores ni sustituyas la tipografía.',
];
let ry = cy + 42;
doc.font('Helvetica').fontSize(10).fillColor(TINTA);
for (const r of reglas) {
  doc.circle(59, ry + 4, 2).fillColor(AZUL).fill();
  doc.fillColor(TINTA).text(r, 70, ry, { width: 470 });
  ry += 22;
}

doc.moveTo(54, ry + 18).lineTo(558, ry + 18).lineWidth(1).strokeColor(GRIS_CLARO).stroke();
doc.font('Helvetica').fontSize(8).fillColor(GRIS)
  .text('Archivos editables en docs/logo/ del repositorio (SVG vectorial).', 54, ry + 30);

doc.end();
console.log('Generado: C:/Users/USUARIO/Downloads/PetGrooming_Logo.pdf');
