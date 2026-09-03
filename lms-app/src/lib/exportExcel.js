// Multi-sheet Excel export without a third-party library.
//
// Writes SpreadsheetML 2003 (the XML workbook format Excel has read natively
// since Office 2003). A .xls file in this format opens in Excel, LibreOffice and
// Google Sheets with one tab per sheet — which a .csv cannot do, and which is
// why the report screens export a workbook rather than one file per tab.

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Excel rejects these characters in a sheet name, and truncates past 31 chars. */
function safeSheetName(name, index) {
  const cleaned = String(name || `Sheet${index + 1}`).replace(/[[\]:*?/\\]/g, ' ').trim();
  return (cleaned || `Sheet${index + 1}`).slice(0, 31);
}

function cellXml(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

/**
 * Column headers for a sheet: the union of every row's keys, in first-seen
 * order. Taking the keys of row 0 alone silently drops columns whenever the
 * rows are not all the same shape.
 */
function headersOf(rows) {
  const headers = [];
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!headers.includes(key)) headers.push(key);
    });
  });
  return headers;
}

function sheetXml(sheet, index) {
  const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
  const headers = headersOf(rows);

  const headerXml = headers.length
    ? `<Row>${headers.map((h) => `<Cell ss:StyleID="head">${`<Data ss:Type="String">${escapeXml(h)}</Data>`}</Cell>`).join('')}</Row>`
    : '';

  const bodyXml = rows
    .map((row) => `<Row>${headers.map((h) => cellXml(row[h])).join('')}</Row>`)
    .join('');

  // An empty report still gets its tab, with a note — an absent sheet reads as
  // "this report was not exported" rather than "this report had no rows".
  const emptyXml = rows.length === 0
    ? '<Row><Cell><Data ss:Type="String">No rows for this report.</Data></Cell></Row>'
    : '';

  return `<Worksheet ss:Name="${escapeXml(safeSheetName(sheet.name, index))}"><Table>${headerXml}${bodyXml}${emptyXml}</Table></Worksheet>`;
}

/**
 * Downloads one workbook containing every sheet.
 * @param {string} filename e.g. "report.xls"
 * @param {{name: string, rows: object[]}[]} sheets one tab per entry
 */
export function downloadWorkbook(filename, sheets = []) {
  if (!sheets.length) return;

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="head"><Font ss:Bold="1"/></Style>
 </Styles>
 ${sheets.map(sheetXml).join('\n ')}
</Workbook>`;

  const blob = new Blob([`﻿${xml}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
