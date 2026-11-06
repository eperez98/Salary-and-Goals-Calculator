/** Backups, restore, JSON export and CSV import. */
import { Engine } from '../db/engine';
import { openFile, saveFile, stamp } from './files';
import { getPrefs, setPrefs } from '../db/repo/core';
import { createTransaction } from '../db/repo/finance';
import { parseMoney } from '../lib/money';
import type { Actor } from '../db/types';
import { tr } from '../lib/i18n';

export async function createBackup(e: Engine, label = 'manual'): Promise<string> {
  await e.flush();
  const name = `monto-${stamp()}-${label}.monto`;
  const path = await e.adapter.backup(await e.serialize(), name);
  return path;
}

/** One automatic backup per day, keeping data safe before updates. */
export async function autoBackup(e: Engine): Promise<string | null> {
  const day = new Date().toISOString().slice(0, 10);
  if (getPrefs(e).recentAutoBackup === day) return null;
  const p = await createBackup(e, 'auto');
  setPrefs(e, { recentAutoBackup: day });
  return p;
}

export async function exportBackupFile(e: Engine) {
  await e.flush();
  return saveFile(`monto-respaldo-${stamp()}.monto`, await e.serialize(), [{ name: tr('Respaldo de Monto'), extensions: ['monto'] }]);
}

export async function pickBackupFile() { return openFile([{ name: tr('Respaldo de Monto'), extensions: ['monto', 'db', 'sqlite'] }]); }

/** Restore from bytes after validating integrity. A safety backup is created first. */
export async function restoreFromBytes(e: Engine, bytes: Uint8Array, password?: string) {
  const v = await Engine.validateBytes(bytes, password);
  if (!v.ok || !v.plain) throw new Error(v.error ?? tr('Copia no válida'));
  await createBackup(e, 'antes-de-restaurar');
  await e.replaceWith(v.plain);
}

export async function exportJSON(e: Engine) {
  const tables = ['members', 'accounts', 'categories', 'transactions', 'transaction_splits', 'income_sources', 'budgets', 'goals', 'goal_contributions', 'debts', 'recurring', 'reminders', 'settlements'];
  const out: Record<string, unknown> = { app: 'Monto', format: 1, exportedAt: new Date().toISOString() };
  for (const t of tables) out[t] = e.all(`SELECT * FROM ${t}`).map((r) => { const { pin_hash: _p, ...rest } = r as Record<string, unknown>; return rest; });
  return saveFile(`monto-datos-${stamp()}.json`, JSON.stringify(out, null, 2), [{ name: 'JSON', extensions: ['json'] }], 'application/json');
}

/** Parse a CSV line respecting quotes. */
export function parseCSVLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export interface CsvImportResult { imported: number; skipped: number; errors: string[] }

/**
 * Import transactions from a CSV with columns: fecha, descripcion, importe[, categoria][, tipo].
 * Negative amounts (or tipo=gasto) are expenses; positive are income.
 */
export function importTransactionsCSV(e: Engine, actor: Actor, text: string, accountId: string): CsvImportResult {
  const acc = e.get<{ currency: 'PAB' | 'USD' }>('SELECT currency FROM accounts WHERE id = ?', [accountId]);
  if (!acc) throw new Error(tr('Selecciona una cuenta válida'));
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { imported: 0, skipped: 0, errors: [tr('El archivo está vacío')] };
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const head = parseCSVLine(lines[0], sep).map((h) => h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
  const idx = (names: string[]) => head.findIndex((h) => names.some((n) => h.includes(n)));
  const iDate = idx(['fecha', 'date']), iDesc = idx(['desc', 'concepto', 'detalle']), iAmt = idx(['importe', 'monto', 'amount', 'valor']), iCat = idx(['categ']), iType = idx(['tipo', 'type']);
  if (iDate < 0 || iDesc < 0 || iAmt < 0) throw new Error(tr('El CSV debe tener columnas fecha, descripción e importe.'));
  const cats = e.all<{ id: string; name: string; kind: string }>('SELECT id, name, kind FROM categories');
  const res: CsvImportResult = { imported: 0, skipped: 0, errors: [] };
  e.transaction(() => {
    lines.slice(1).forEach((line, n) => {
      const c = parseCSVLine(line, sep);
      try {
        let date = c[iDate];
        const dm = date.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (dm) date = `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
        let amount = parseMoney(c[iAmt]);
        if (Number.isNaN(amount) || amount === 0) throw new Error(tr('importe no válido'));
        const t = iType >= 0 ? c[iType].toLowerCase() : '';
        const isExpense = t.startsWith('gas') || t.startsWith('exp') || (!t && amount < 0);
        amount = Math.abs(amount);
        const kind = isExpense ? 'expense' : 'income';
        const cat = iCat >= 0 ? cats.find((x) => x.kind === kind && x.name.toLowerCase() === c[iCat]?.toLowerCase()) : undefined;
        createTransaction(e, actor, { type: kind, description: c[iDesc] || tr('Importado'), amount, currency: acc.currency, date, accountId, categoryId: cat?.id ?? null, notes: tr('Importado desde CSV') });
        res.imported++;
      } catch (err) {
        res.skipped++;
        if (res.errors.length < 5) res.errors.push(tr('Fila {v0}: {message}', { v0: n + 2, message: (err as Error).message }));
      }
    });
  });
  return res;
}
