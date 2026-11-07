/** Report exporters: CSV, Excel (.xlsx), PDF and Notion (Markdown). Everything runs locally.
 *  Visual style: minimal and elegant — white page, midnight text, hairline rules, one gold accent. */
import { saveFile, stamp } from './files';
import { locale, tr } from '../lib/i18n';

export interface ReportColumn { key: string; label: string; money?: boolean; align?: 'left' | 'right' }
export interface ReportTable { name: string; columns: ReportColumn[]; rows: Array<Record<string, string | number | null>> }
export interface Report { title: string; subtitle: string; tables: ReportTable[]; summary?: Array<{ label: string; value: string }> }

// Brand palette (midnight + gold) for exported documents.
const INK = [20, 48, 77] as const; // #14304D
const TEXT = [38, 42, 51] as const;
const MUTED = [120, 124, 132] as const;
const RULE = [228, 226, 221] as const;
const GOLD = [232, 147, 15] as const; // #E8930F
const hex = (c: readonly number[]) => 'FF' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

const money = (cents: number) => (cents / 100).toFixed(2);
const moneyText = (cents: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
const cellText = (c: ReportColumn, v: string | number | null | undefined) => (c.money && typeof v === 'number' ? moneyText(v) : String(v ?? ''));
const generated = () => tr('Generado por Monto el {v0}', { v0: new Date().toLocaleString(locale) });

// Byte-order mark so Excel opens UTF-8 CSV correctly.
const BOM = String.fromCharCode(0xfeff);

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(t: ReportTable): string {
  const head = t.columns.map((c) => csvCell(c.label)).join(',');
  const body = t.rows.map((r) => t.columns.map((c) => csvCell(c.money && typeof r[c.key] === 'number' ? money(r[c.key] as number) : r[c.key])).join(','));
  return BOM + [head, ...body].join('\r\n');
}

export async function exportCSV(r: Report, slug: string) {
  const parts = r.tables.map((t) => (r.tables.length > 1 ? `# ${t.name}\r\n` : '') + toCSV(t).slice(BOM.length));
  return saveFile(`monto-${slug}-${stamp()}.csv`, BOM + parts.join('\r\n\r\n'), [{ name: 'CSV', extensions: ['csv'] }], 'text/csv');
}

// ---------------------------------------------------------------- Notion (Markdown)
const mdCell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

/** Markdown with real tables: Notion turns it into tables when imported (Import → Markdown) or pasted. */
export function toMarkdown(r: Report): string {
  const out = [`# ${r.title}`, '', `*${r.subtitle}*`, ''];
  if (r.summary?.length) {
    out.push(`| ${r.summary.map((s) => mdCell(s.label)).join(' | ')} |`, `| ${r.summary.map(() => '---').join(' | ')} |`, `| ${r.summary.map((s) => `**${mdCell(s.value)}**`).join(' | ')} |`, '');
  }
  for (const t of r.tables) {
    out.push(`## ${t.name}`, '');
    out.push(`| ${t.columns.map((c) => mdCell(c.label)).join(' | ')} |`);
    out.push(`| ${t.columns.map((c) => (c.money || c.align === 'right' ? '---:' : '---')).join(' | ')} |`);
    for (const row of t.rows) out.push(`| ${t.columns.map((c) => mdCell(cellText(c, row[c.key]))).join(' | ')} |`);
    if (!t.rows.length) out.push(`| ${t.columns.map((_, i) => (i ? '' : tr('Sin datos'))).join(' | ')} |`);
    out.push('');
  }
  out.push('---', `*${generated()}*`, '');
  return out.join('\n');
}

export async function exportNotion(r: Report, slug: string) {
  return saveFile(`monto-${slug}-${stamp()}.md`, toMarkdown(r), [{ name: 'Notion (Markdown)', extensions: ['md'] }], 'text/markdown');
}

// ---------------------------------------------------------------- Excel
export async function buildXLSX(r: Report): Promise<Uint8Array> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Monto';
  wb.created = new Date();
  const font = { name: 'Calibri', color: { argb: hex(TEXT) } };
  const hair = { style: 'hair' as const, color: { argb: hex(RULE) } };
  r.tables.forEach((t, ti) => {
    const ws = wb.addWorksheet(t.name.slice(0, 31).replace(/[\\/?*[\]:]/g, ' '), { views: [{ showGridLines: false }] });
    const n = t.columns.length;
    ws.addRow(['MONTO']).getCell(1).font = { ...font, size: 9, bold: true, color: { argb: hex(GOLD) } };
    ws.addRow([r.title]).getCell(1).font = { ...font, size: 18, bold: true, color: { argb: hex(INK) } };
    ws.addRow([`${r.subtitle} · ${t.name}`]).getCell(1).font = { ...font, size: 10, color: { argb: hex(MUTED) } };
    ws.addRow([]);
    if (ti === 0 && r.summary?.length) {
      const labels = ws.addRow(r.summary.map((s) => s.label.toUpperCase()));
      labels.eachCell((c) => { c.font = { ...font, size: 8, color: { argb: hex(MUTED) } }; });
      const values = ws.addRow(r.summary.map((s) => s.value));
      values.eachCell((c) => { c.font = { ...font, size: 13, bold: true, color: { argb: hex(INK) } }; });
      ws.addRow([]);
    }
    const header = ws.addRow(t.columns.map((c) => c.label));
    header.height = 22;
    header.eachCell((cell, i) => {
      const c = t.columns[i - 1];
      cell.font = { ...font, size: 10, bold: true, color: { argb: hex(INK) } };
      cell.alignment = { vertical: 'middle', horizontal: c?.money || c?.align === 'right' ? 'right' : 'left' };
      cell.border = { bottom: { style: 'medium', color: { argb: hex(INK) } } };
    });
    for (const row of t.rows) {
      const added = ws.addRow(t.columns.map((c) => (c.money && typeof row[c.key] === 'number' ? (row[c.key] as number) / 100 : row[c.key])));
      added.height = 19;
      for (let i = 1; i <= n; i++) {
        const cell = added.getCell(i);
        const c = t.columns[i - 1];
        cell.font = { ...font, size: 10 };
        cell.border = { bottom: hair };
        cell.alignment = { vertical: 'middle', horizontal: c.money || c.align === 'right' ? 'right' : 'left' };
        if (c.money) cell.numFmt = '#,##0.00;[Color9]-#,##0.00';
      }
    }
    // Sortable and filterable straight away.
    if (t.rows.length) ws.autoFilter = { from: { row: header.number, column: 1 }, to: { row: header.number + t.rows.length, column: n } };
    ws.views = [{ state: 'frozen', ySplit: header.number, showGridLines: false }];
    t.columns.forEach((c, i) => {
      const longest = Math.max(c.label.length, ...t.rows.slice(0, 500).map((row) => cellText(c, row[c.key]).length));
      ws.getColumn(i + 1).width = Math.max(10, Math.min(50, longest + 4));
    });
    ws.pageSetup = { orientation: n > 5 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
    ws.headerFooter = { oddFooter: `&L&8${generated()}&R&8&P / &N` };
  });
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

export async function exportXLSX(r: Report, slug: string) {
  return saveFile(`monto-${slug}-${stamp()}.xlsx`, await buildXLSX(r), [{ name: 'Excel', extensions: ['xlsx'] }], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// ---------------------------------------------------------------- PDF
export async function buildPDF(r: Report): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const wide = r.tables.some((t) => t.columns.length > 6);
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: wide ? 'landscape' : 'portrait' });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...INK);
  doc.text('monto', M, 52);
  doc.setFillColor(...GOLD); doc.circle(M + doc.getTextWidth('monto') + 4, 49.5, 2.2, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  doc.text(r.subtitle, W - M, 52, { align: 'right' });
  doc.setDrawColor(...RULE); doc.setLineWidth(0.6); doc.line(M, 64, W - M, 64);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...INK);
  doc.text(r.title, M, 104);
  doc.setFillColor(...GOLD); doc.rect(M, 114, 28, 2, 'F');
  let y = 140;

  if (r.summary?.length) {
    const items = r.summary.slice(0, 4);
    const colW = (W - 2 * M) / items.length;
    items.forEach((s, i) => {
      const x = M + i * colW;
      if (i) { doc.setDrawColor(...RULE); doc.line(x - 10, y, x - 10, y + 34); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.text(s.label.toUpperCase(), x, y + 9);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...INK); doc.text(s.value, x, y + 29);
    });
    y += 62;
  }

  for (const t of r.tables) {
    if (y > doc.internal.pageSize.getHeight() - 120) { doc.addPage(); y = 64; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK);
    doc.text(t.name, M, y + 10);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text(String(t.rows.length), W - M, y + 10, { align: 'right' });
    autoTable(doc, {
      startY: y + 20,
      theme: 'plain',
      head: [t.columns.map((c) => c.label)],
      body: t.rows.length ? t.rows.map((row) => t.columns.map((c) => cellText(c, row[c.key]))) : [[tr('Sin datos'), ...t.columns.slice(1).map(() => '')]],
      styles: { font: 'helvetica', fontSize: 8.5, textColor: [...TEXT], cellPadding: { top: 6, bottom: 6, left: 4, right: 4 }, lineColor: [...RULE], lineWidth: { bottom: 0.4 } },
      headStyles: { fontStyle: 'bold', fontSize: 7.5, textColor: [...INK], lineColor: [...INK], lineWidth: { bottom: 0.9 } },
      columnStyles: Object.fromEntries(t.columns.map((c, i) => [i, { halign: c.money || c.align === 'right' ? 'right' : 'left' }])),
      didParseCell: (d) => {
        const c = t.columns[d.column.index];
        if (d.section === 'head') d.cell.styles.halign = c?.money || c?.align === 'right' ? 'right' : 'left';
        if (d.section === 'body' && c?.money && String(d.cell.raw).startsWith('-')) d.cell.styles.textColor = [176, 72, 60];
      },
      margin: { left: M, right: M, top: 64 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 34;
  }

  const pages = doc.getNumberOfPages();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...RULE); doc.setLineWidth(0.6); doc.line(M, H - 40, W - M, H - 40);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text(generated(), M, H - 26);
    doc.text(tr('Página {i} de {pages}', { i, pages }), W - M, H - 26, { align: 'right' });
  }
  return new Uint8Array(doc.output('arraybuffer'));
}

export async function exportPDF(r: Report, slug: string) {
  return saveFile(`monto-${slug}-${stamp()}.pdf`, await buildPDF(r), [{ name: 'PDF', extensions: ['pdf'] }], 'application/pdf');
}
