const express   = require('express');
const router    = express.Router();
const PDFDoc    = require('pdfkit');
const Sensor    = require('../models/sensor');
const Auditoria = require('../models/auditoria');
const Sesion    = require('../models/sesion');

// ── Helper: rango de un día ────────────────────────────────────────
function rangoDia(fechaStr) {
  const inicio = new Date(fechaStr);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fechaStr);
  fin.setHours(23, 59, 59, 999);
  return { inicio, fin };
}

// ── Helper: formato fecha legible ──────────────────────────────────
function fmt(date) {
  return new Date(date).toLocaleString('es-VE', {
    dateStyle: 'short', timeStyle: 'short', hour12: true,
  });
}

// ── Helper: dibujar tabla simple ───────────────────────────────────
function drawTable(doc, headers, rows, startY) {
  const colWidth  = (doc.page.width - 80) / headers.length;
  const rowHeight = 20;
  let   y         = startY;

  // Cabecera
  doc.font('Helvetica-Bold').fontSize(8);
  doc.rect(40, y, doc.page.width - 80, rowHeight).fill('#1e3a8a');
  doc.fillColor('#ffffff');
  headers.forEach((h, i) => {
    doc.text(h, 40 + i * colWidth + 4, y + 6, { width: colWidth - 4, ellipsis: true });
  });
  y += rowHeight;

  // Filas
  doc.font('Helvetica').fontSize(7.5);
  rows.forEach((row, idx) => {
    // Fondo alternado
    doc.rect(40, y, doc.page.width - 80, rowHeight)
       .fill(idx % 2 === 0 ? '#f8fafc' : '#ffffff');
    doc.fillColor('#1e293b');
    row.forEach((cell, i) => {
      doc.text(String(cell ?? '—'), 40 + i * colWidth + 4, y + 6,
        { width: colWidth - 4, ellipsis: true });
    });
    y += rowHeight;

    // Salto de página si es necesario
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 60;
    }
  });

  return y + 10;
}

// ── Helper: encabezado de sección ─────────────────────────────────
function sectionHeader(doc, title, y) {
  doc.rect(40, y, doc.page.width - 80, 24).fill('#2563eb');
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
     .text(title, 48, y + 7);
  return y + 34;
}

// ── GET /api/pdf/dia?fecha=YYYY-MM-DD&tipo=sensores|auditoria|todo
router.get('/dia', async (req, res) => {
  const { fecha, tipo = 'todo' } = req.query;

  if (!fecha) return res.status(400).json({ message: 'Parámetro fecha requerido (YYYY-MM-DD)' });

  const { inicio, fin } = rangoDia(fecha);

  try {
    // Cargar datos según tipo solicitado
    const [sensores, auditorias, sesiones] = await Promise.all([
      (tipo === 'todo' || tipo === 'sensores')
        ? Sensor.find({ fecha: { $gte: inicio, $lte: fin } }).sort({ fecha: 1 }).lean()
        : Promise.resolve([]),
      (tipo === 'todo' || tipo === 'auditoria')
        ? Auditoria.find({ fecha: { $gte: inicio, $lte: fin } }).sort({ fecha: 1 }).lean()
        : Promise.resolve([]),
      (tipo === 'todo' || tipo === 'auditoria')
        ? Sesion.find({ fecha: { $gte: inicio, $lte: fin } }).sort({ fecha: 1 }).lean()
        : Promise.resolve([]),
    ]);

    // ── Crear PDF ────────────────────────────────────────────────
    const doc = new PDFDoc({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="SentinelCold_${fecha}_${tipo}.pdf"`);
    doc.pipe(res);

    // ── Portada ────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 110).fill('#1e3a8a');
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff')
       .text('❄ SENTINEL COLD', 40, 28);
    doc.font('Helvetica').fontSize(11).fillColor('#93c5fd')
       .text('Reporte de Auditoría y Sensores', 40, 56);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
       .text(`Fecha: ${new Date(fecha + 'T12:00:00').toLocaleDateString('es-VE', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}`, 40, 76);
    doc.text(`Generado: ${fmt(new Date())}  |  Tucape, Panadería`, 40, 92);

    let y = 130;

    // ── Resumen ────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b');
    const resumenItems = [
      `Lecturas de sensores: ${sensores.length}`,
      `Cambios del sistema:  ${auditorias.length}`,
      `Sesiones de usuarios: ${sesiones.length}`,
    ];
    doc.rect(40, y, doc.page.width - 80, resumenItems.length * 18 + 14).fill('#eff6ff');
    doc.fillColor('#1e3a8a');
    resumenItems.forEach((item, i) => {
      doc.text(`• ${item}`, 52, y + 8 + i * 18);
    });
    y += resumenItems.length * 18 + 24;

    // ═══════════════════════════════════════════════════════════
    // SECCIÓN 1: HISTORIAL DE SENSORES
    // ═══════════════════════════════════════════════════════════
    if (sensores.length > 0) {
      y = sectionHeader(doc, '📊  HISTORIAL DE SENSORES DEL DÍA', y);
      y = drawTable(
        doc,
        ['Hora', 'Temp (°C)', 'Humedad (%)', 'Voltaje (V)'],
        sensores.map(s => [
          fmt(s.fecha),
          s.temperatura?.toFixed(1),
          s.humedad?.toFixed(0),
          s.voltaje?.toFixed(1),
        ]),
        y
      );
      y += 10;
    }

    // ═══════════════════════════════════════════════════════════
    // SECCIÓN 2: SESIONES DE USUARIOS
    // ═══════════════════════════════════════════════════════════
    if (sesiones.length > 0) {
      // Salto de página si queda poco espacio
      if (y > doc.page.height - 200) { doc.addPage(); y = 60; }
      y = sectionHeader(doc, '🔐  CONEXIONES DE USUARIOS', y);
      y = drawTable(
        doc,
        ['Hora', 'Usuario', 'Cédula', 'Rol', 'Acción'],
        sesiones.map(s => [
          fmt(s.fecha),
          s.usuario?.nombre,
          s.usuario?.cedula,
          s.usuario?.role?.toUpperCase(),
          s.accion,
        ]),
        y
      );
      y += 10;
    }

    // ═══════════════════════════════════════════════════════════
    // SECCIÓN 3: CAMBIOS DEL SISTEMA
    // ═══════════════════════════════════════════════════════════
    if (auditorias.length > 0) {
      if (y > doc.page.height - 200) { doc.addPage(); y = 60; }
      y = sectionHeader(doc, '⚙️  CAMBIOS REALIZADOS EN EL SISTEMA', y);
      y = drawTable(
        doc,
        ['Hora', 'Usuario', 'Rol', 'Acción', 'Afectado'],
        auditorias.map(a => [
          fmt(a.fecha),
          a.realizadoPor?.nombre,
          a.realizadoPor?.role?.toUpperCase(),
          a.accion?.replace(/_/g, ' '),
          a.entidad?.nombre,
        ]),
        y
      );
    }

    // Sin datos
    if (sensores.length === 0 && auditorias.length === 0 && sesiones.length === 0) {
      doc.font('Helvetica').fontSize(12).fillColor('#64748b')
         .text('No se encontraron registros para esta fecha.', 40, y, { align: 'center' });
    }

    // ── Pie de página ─────────────────────────────────────────
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
         .text(
           `Sentinel Cold — Reporte generado automáticamente | Página ${i + 1} de ${pages.count}`,
           40, doc.page.height - 30, { align: 'center', width: doc.page.width - 80 }
         );
    }

    doc.end();

  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ message: 'Error al generar el PDF', error: err.message });
  }
});

module.exports = router;