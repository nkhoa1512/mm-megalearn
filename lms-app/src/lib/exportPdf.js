// Real PDF download for the L&D Audit Dossier — the button used to call
// window.print(), which just opens the browser's print dialog (and the user
// still has to manually pick "Save as PDF" as the destination printer). This
// builds an actual .pdf file and downloads it directly, one table per report
// section, using the exact same {name, rows} shape the Excel export uses.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function headersOf(rows) {
  const headers = [];
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!headers.includes(key)) headers.push(key);
    });
  });
  return headers;
}

/**
 * @param {string} filename e.g. "mmvn-lms-audit-dossier-2026-09-04.pdf"
 * @param {{title: string, subtitle?: string, meta?: string[], sections: {name: string, rows: object[]}[]}} content
 */
export function downloadDossierPdf(filename, { title, subtitle, meta = [], sections = [] }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;

  let cursorY = 46;
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(20);
  doc.text(title, marginX, cursorY);

  if (subtitle) {
    cursorY += 20;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(90);
    doc.text(subtitle, marginX, cursorY);
  }

  if (meta.length) {
    cursorY += 16;
    doc.setFontSize(9);
    doc.setTextColor(120);
    meta.forEach((line) => {
      doc.text(line, marginX, cursorY);
      cursorY += 13;
    });
  }
  doc.setTextColor(0);

  sections.forEach((section, idx) => {
    const rows = Array.isArray(section.rows) ? section.rows : [];
    const headers = headersOf(rows);

    if (idx > 0) {
      doc.addPage();
      cursorY = 46;
    } else {
      cursorY += 18;
    }

    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 91, 170);
    doc.text(section.name, marginX, cursorY);
    doc.setTextColor(0);

    if (headers.length === 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(120);
      doc.text('No rows for this report.', marginX, cursorY + 22);
      doc.setTextColor(0);
      return;
    }

    autoTable(doc, {
      startY: cursorY + 12,
      head: [headers],
      body: rows.map((row) => headers.map((h) => (row[h] === null || row[h] === undefined ? '—' : String(row[h])))),
      styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [0, 91, 170], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: marginX, right: marginX },
    });
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - marginX - 60, pageHeight - 20);
  }

  doc.save(filename);
}
