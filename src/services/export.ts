/** Report exporters: CSV, Excel (.xlsx) and PDF. Everything runs locally. */
import { saveFile, stamp } from './files';
import { locale, tr } from '../lib/i18n';

export interface ReportColumn { key: string; label: string; money?: boolean; align?: 'left' | 'right' }
export interface ReportTable { name: string; columns: ReportColumn[]; rows: Array<Record<string, string | number | null>> }
export interface Report { title: string; subtitle: string; tables: ReportTable[]; summary?: Array<{ label: string; value: string }> }

const money = (cents: number) => (cents / 100).toFixed(2);

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(t: ReportTable): string {
  const head = t.columns.map((c) => csvCell(c.label)).join(',');
  const body = t.rows.map((r) => t.columns.map((c) => csvCell(c.money && typeof r[c.key] === 'number' ? money(r[c.key] as number) : r[c.key])).join(','));
  return '\uFEFF' + [head, ...body].join('\r\n');
}

export async function exportCSV(r: Report, slug: string) {
  const parts = r.tables.map((t) => (r.tables.length > 1 ? `# ${t.name}\r\n` : '') + toCSV(t).replace(/^\uFEFF/, ''));
  return saveFile(`monto-${slug}-${stamp()}.csv`, '\uFEFF' + parts.join('\r\n\r\n'), [{ name: 'CSV', extensions: ['csv'] }], 'text/csv');
}

export async function buildXLSX(r: Report): Promise<Uint8Array> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Monto';
  wb.created = new Date();
  for (const t of r.tables) {
    const ws = wb.addWorksheet(t.name.slice(0, 31).replace(/[\\/?*[\]:]/g, ' '));
    ws.addRow([r.title]).font = { bold: true, size: 14, color: { argb: 'FF12291F' } };
    ws.addRow([r.subtitle]).font = { italic: true, color: { argb: 'FF6B7570' } };
    ws.addRow([]);
    const header = ws.addRow(t.columns.map((c) => c.label));
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFF5F3EE' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF12291F' } };
      cell.alignment = { vertical: 'middle' };
    });
    for (const row of t.rows) {
      const added = ws.addRow(t.columns.map((c) => (c.money && typeof row[c.key] === 'number' ? (row[c.key] as number) / 100 : row[c.key])));
      t.columns.forEach((c, i) => { if (c.money) added.getCell(i + 1).numFmt = '#,##0.00;[Red]-#,##0.00'; });
    }
    ws.columns.forEach((col, i) => { col.width = Math.max(12, Math.min(48, (t.columns[i]?.label.length ?? 10) + 8)); });
    ws.views = [{ state: 'frozen', ySplit: 4 }];
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

export async function exportXLSX(r: Report, slug: string) {
  return saveFile(`monto-${slug}-${stamp()}.xlsx`, await buildXLSX(r), [{ name: 'Excel', extensions: ['xlsx'] }], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export async function buildPDF(r: Report): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(18, 41, 31);
  doc.rect(0, 0, W, 78, 'F');
  doc.setTextColor(245, 243, 238);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('monto', 40, 44);
  doc.setFillColor(47, 191, 133);
  doc.circle(98, 41, 3, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(r.subtitle, W - 40, 44, { align: 'right' });
  doc.setTextColor(18, 24, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(r.title, 40, 112);
  let y = 128;
  if (r.summary?.length) {
    doc.setFontSize(9);
    const colW = (W - 80) / Math.min(4, r.summary.length);
    r.summary.slice(0, 8).forEach((s, i) => {
      const x = 40 + (i % 4) * colW;
      const yy = y + Math.floor(i / 4) * 40;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(110, 120, 115); doc.text(s.label, x, yy + 12);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(18, 24, 22); doc.setFontSize(12); doc.text(s.value, x, yy + 28); doc.setFontSize(9);
    });
    y += Math.ceil(Math.min(8, r.summary.length) / 4) * 40 + 10;
  }
  for (const t of r.tables) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(31, 75, 57);
    doc.text(t.name, 40, y + 10);
    autoTable(doc, {
      startY: y + 18,
      head: [t.columns.map((c) => c.label)],
      body: t.rows.map((row) => t.columns.map((c) => (c.money && typeof row[c.key] === 'number' ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format((row[c.key] as number) / 100) : String(row[c.key] ?? '')))),
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, textColor: [30, 36, 33] },
      headStyles: { fillColor: [18, 41, 31], textColor: [245, 243, 238] },
      alternateRowStyles: { fillColor: [246, 245, 241] },
      columnStyles: Object.fromEntries(t.columns.map((c, i) => [i, { halign: c.money || c.align === 'right' ? 'right' : 'left' }])),
      margin: { left: 40, right: 40 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 24;
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(140, 146, 142);
    doc.text(tr('Generado por Monto el {v0} · Página {i} de {pages}', { v0: new Date().toLocaleString(locale), i, pages }), 40, doc.internal.pageSize.getHeight() - 24);
  }
  return new Uint8Array(doc.output('arraybuffer'));
}

export async function exportPDF(r: Report, slug: string) {
  return saveFile(`monto-${slug}-${stamp()}.pdf`, await buildPDF(r), [{ name: 'PDF', extensions: ['pdf'] }], 'application/pdf');
}
