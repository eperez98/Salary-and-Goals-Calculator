import { z } from 'zod';
import { Engine, nowISO, uid } from '../engine';
import { camel } from '../map';
import { assertCan, canEditTransaction, PermissionError } from '../../domain/permissions';
import { log } from './core';
import { formatMoney } from '../../lib/money';
import type { Account, Actor, Attachment, Category, ScopeFilter, Transaction, TxType } from '../types';
import { tr } from '../../lib/i18n';

const currency = z.enum(['PAB', 'USD']);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, tr('Fecha no válida'));
const cents = z.number().int(tr('Importe no válido'));

// ================================================================= accounts
export const ACCOUNT_TYPE_LABEL: Record<Account['type'], string> = {
  savings: tr('Cuenta de ahorros'), checking: tr('Cuenta corriente'), cash: tr('Efectivo'), credit_card: tr('Tarjeta de crédito'), debit_card: tr('Tarjeta de débito'), investment: tr('Inversión'),
};
export const accountSchema = z.object({
  name: z.string().trim().min(1, tr('Escribe un nombre')).max(60),
  type: z.enum(['savings', 'checking', 'cash', 'credit_card', 'debit_card', 'investment']),
  currency,
  initialBalance: cents,
  creditLimit: cents.nonnegative().nullable().optional(),
  institution: z.string().trim().max(60).nullable().optional(),
  color: z.string().optional(),
  ownerMemberId: z.string().nullable().optional(),
});

/** SQL expression for the signed effect of transactions on account `acc`. */
const BALANCE_SQL = `(a.initial_balance
  + IFNULL((SELECT SUM(CASE WHEN t.type IN ('income','refund','loan_disbursement') THEN t.amount ELSE -t.amount END) FROM transactions t WHERE t.account_id = a.id), 0)
  + IFNULL((SELECT SUM(t.amount) FROM transactions t WHERE t.to_account_id = a.id AND t.type IN ('transfer','card_payment')), 0))`;

export function listAccounts(e: Engine, opts: { includeArchived?: boolean; visibleTo?: string; sharedOnly?: boolean } = {}): Account[] {
  const where: string[] = [];
  const p: string[] = [];
  if (!opts.includeArchived) where.push('a.archived = 0');
  if (opts.sharedOnly) where.push('a.owner_member_id IS NULL');
  if (opts.visibleTo) { where.push('(a.owner_member_id IS NULL OR a.owner_member_id = ?)'); p.push(opts.visibleTo); }
  return e.all(`SELECT a.*, ${BALANCE_SQL} AS balance FROM accounts a ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY a.archived, a.created_at`, p).map((r) => camel<Account>(r));
}
export function getAccount(e: Engine, id: string): Account | undefined {
  const r = e.get(`SELECT a.*, ${BALANCE_SQL} AS balance FROM accounts a WHERE a.id = ?`, [id]);
  return r ? camel<Account>(r) : undefined;
}
export function createAccount(e: Engine, actor: Actor, input: z.input<typeof accountSchema>): Account {
  assertCan(actor.role, 'account.manage');
  const v = accountSchema.parse(input);
  const id = uid();
  e.run('INSERT INTO accounts(id, name, type, currency, initial_balance, credit_limit, institution, color, owner_member_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, v.name, v.type, v.currency, v.initialBalance, v.creditLimit ?? null, v.institution ?? null, v.color ?? '#1F6B4F', v.ownerMemberId ?? null, nowISO()]);
  log(e, actor, 'create', 'account', id, tr('Creó la cuenta {name}', { name: v.name }), v.ownerMemberId ? 'personal' : 'family');
  return getAccount(e, id)!;
}
export function updateAccount(e: Engine, actor: Actor, id: string, input: Partial<z.input<typeof accountSchema>>) {
  assertCan(actor.role, 'account.manage');
  const cur = getAccount(e, id);
  if (!cur) throw new Error(tr('Cuenta no encontrada'));
  const v = accountSchema.parse({ ...cur, ...input });
  const used = Number(e.scalar('SELECT count(*) FROM transactions WHERE account_id = ? OR to_account_id = ?', [id, id]));
  if (used && v.currency !== cur.currency) throw new Error(tr('No puedes cambiar la moneda de una cuenta con movimientos.'));
  e.run('UPDATE accounts SET name=?, type=?, currency=?, initial_balance=?, credit_limit=?, institution=?, color=?, owner_member_id=? WHERE id=?',
    [v.name, v.type, v.currency, v.initialBalance, v.creditLimit ?? null, v.institution ?? null, v.color ?? cur.color, v.ownerMemberId ?? null, id]);
  log(e, actor, 'update', 'account', id, tr('Editó la cuenta {name}', { name: v.name }));
}
export function archiveAccount(e: Engine, actor: Actor, id: string, archived = true) {
  assertCan(actor.role, 'account.manage');
  e.run('UPDATE accounts SET archived = ? WHERE id = ?', [archived ? 1 : 0, id]);
}
export function deleteAccount(e: Engine, actor: Actor, id: string) {
  assertCan(actor.role, 'account.manage');
  const n = Number(e.scalar('SELECT count(*) FROM transactions WHERE account_id = ? OR to_account_id = ?', [id, id]));
  if (n > 0) throw new Error(tr('La cuenta tiene {n} movimientos. Archívala en lugar de eliminarla.', { n }));
  e.run('DELETE FROM accounts WHERE id = ?', [id]);
}
export const isLiability = (a: Pick<Account, 'type'>) => a.type === 'credit_card';
export const isLiquid = (a: Pick<Account, 'type'>) => a.type === 'savings' || a.type === 'checking' || a.type === 'cash' || a.type === 'debit_card';

// ================================================================= categories
export const categorySchema = z.object({
  name: z.string().trim().min(1, tr('Escribe un nombre')).max(40),
  kind: z.enum(['income', 'expense']),
  parentId: z.string().nullable().optional(),
  icon: z.string().default('other'),
  color: z.string().default('#6B7A72'),
});
export function listCategories(e: Engine, kind?: 'income' | 'expense', includeArchived = false): Category[] {
  const where = [includeArchived ? '1=1' : 'archived = 0'];
  const p: string[] = [];
  if (kind) { where.push('kind = ?'); p.push(kind); }
  return e.all(`SELECT * FROM categories WHERE ${where.join(' AND ')} ORDER BY kind, sort, name`, p).map((r) => camel<Category>(r));
}
export function createCategory(e: Engine, actor: Actor, input: z.input<typeof categorySchema>): Category {
  assertCan(actor.role, 'category.manage');
  const v = categorySchema.parse(input);
  if (v.parentId) {
    const parent = e.get<{ kind: string; icon: string; color: string; parent_id: string | null }>('SELECT kind, icon, color, parent_id FROM categories WHERE id = ?', [v.parentId]);
    if (!parent) throw new Error(tr('Categoría principal no encontrada'));
    if (parent.parent_id) throw new Error(tr('Solo se admite un nivel de subcategorías.'));
    if (parent.kind !== v.kind) throw new Error(tr('La subcategoría debe ser del mismo tipo.'));
  }
  const id = uid();
  const sort = Number(e.scalar('SELECT IFNULL(MAX(sort),0)+1 FROM categories WHERE kind = ?', [v.kind]));
  e.run('INSERT INTO categories(id, name, kind, parent_id, icon, color, sort) VALUES (?,?,?,?,?,?,?)', [id, v.name, v.kind, v.parentId ?? null, v.icon, v.color, sort]);
  return camel<Category>(e.get('SELECT * FROM categories WHERE id = ?', [id])!);
}
export function updateCategory(e: Engine, actor: Actor, id: string, input: { name?: string; icon?: string; color?: string; archived?: boolean }) {
  assertCan(actor.role, 'category.manage');
  const cur = e.get<Record<string, unknown>>('SELECT * FROM categories WHERE id = ?', [id]);
  if (!cur) throw new Error(tr('Categoría no encontrada'));
  const name = input.name !== undefined ? z.string().trim().min(1).max(40).parse(input.name) : cur.name;
  e.run('UPDATE categories SET name=?, icon=?, color=?, archived=? WHERE id=?', [name as string, (input.icon ?? cur.icon) as string, (input.color ?? cur.color) as string, input.archived === undefined ? (cur.archived as number) : input.archived ? 1 : 0, id]);
}
export function deleteCategory(e: Engine, actor: Actor, id: string) {
  assertCan(actor.role, 'category.manage');
  const c = e.get<{ is_system: number }>('SELECT is_system FROM categories WHERE id = ?', [id]);
  if (c?.is_system) throw new Error(tr('Las categorías predeterminadas no se eliminan; puedes archivarlas.'));
  e.run('DELETE FROM categories WHERE id = ?', [id]);
}

// ================================================================= transactions
export const TX_TYPE_LABEL: Record<TxType, string> = {
  income: tr('Ingreso'), expense: tr('Gasto'), transfer: tr('Transferencia'), card_payment: tr('Pago de tarjeta'), loan_disbursement: tr('Préstamo recibido'), loan_payment: tr('Abono a préstamo'), refund: tr('Reembolso'),
};
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: tr('Efectivo'), debit: tr('Tarjeta de débito'), credit: tr('Tarjeta de crédito'), transfer: tr('Transferencia'), ach: 'ACH', yappy: tr('Yappy'), check: tr('Cheque'), other: tr('Otro'),
};
export const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer', 'card_payment', 'loan_disbursement', 'loan_payment', 'refund']),
  description: z.string().trim().min(1, tr('Escribe una descripción')).max(120),
  amount: cents.positive(tr('El importe debe ser mayor que cero')).max(100_000_000_00, tr('Importe demasiado grande')),
  currency,
  date: isoDate,
  categoryId: z.string().nullable().optional(),
  accountId: z.string({ message: tr('Selecciona una cuenta') }).min(1, tr('Selecciona una cuenta')),
  toAccountId: z.string().nullable().optional(),
  paymentMethod: z.enum(['cash', 'debit', 'credit', 'transfer', 'ach', 'yappy', 'check', 'other']).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  memberId: z.string().nullable().optional(),
  scope: z.enum(['personal', 'family']).default('personal'),
  debtId: z.string().nullable().optional(),
  incomeSourceId: z.string().nullable().optional(),
  periodKey: z.string().nullable().optional(),
  recurringId: z.string().nullable().optional(),
  splits: z.array(z.object({ memberId: z.string(), amount: cents.nonnegative() })).optional(),
}).superRefine((v, ctx) => {
  if ((v.type === 'transfer' || v.type === 'card_payment') && !v.toAccountId) ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: tr('Selecciona la cuenta de destino') });
  if (v.toAccountId && v.toAccountId === v.accountId) ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: tr('La cuenta de destino debe ser distinta') });
  if (v.splits?.length && v.splits.reduce((a, s) => a + s.amount, 0) !== v.amount) ctx.addIssue({ code: 'custom', path: ['splits'], message: tr('El reparto debe sumar el importe total') });
});
export type TransactionInput = z.input<typeof transactionSchema>;

export interface TxFilter {
  from?: string; to?: string; types?: TxType[]; accountId?: string; categoryId?: string; memberId?: string; search?: string;
  scope?: ScopeFilter; limit?: number; offset?: number; minAmount?: number; maxAmount?: number; incomeSourceId?: string; debtId?: string;
}

function buildWhere(f: TxFilter): { sql: string; p: (string | number)[] } {
  const w: string[] = [];
  const p: (string | number)[] = [];
  if (f.from) { w.push('t.date >= ?'); p.push(f.from); }
  if (f.to) { w.push('t.date <= ?'); p.push(f.to); }
  if (f.types?.length) { w.push(`t.type IN (${f.types.map(() => '?').join(',')})`); p.push(...f.types); }
  if (f.accountId) { w.push('(t.account_id = ? OR t.to_account_id = ?)'); p.push(f.accountId, f.accountId); }
  if (f.categoryId) { w.push('(t.category_id = ? OR t.category_id IN (SELECT id FROM categories WHERE parent_id = ?))'); p.push(f.categoryId, f.categoryId); }
  if (f.memberId) { w.push('t.member_id = ?'); p.push(f.memberId); }
  if (f.incomeSourceId) { w.push('t.income_source_id = ?'); p.push(f.incomeSourceId); }
  if (f.debtId) { w.push('t.debt_id = ?'); p.push(f.debtId); }
  if (f.minAmount != null) { w.push('t.amount >= ?'); p.push(f.minAmount); }
  if (f.maxAmount != null) { w.push('t.amount <= ?'); p.push(f.maxAmount); }
  if (f.search) { w.push("(t.description LIKE ? OR IFNULL(t.notes,'') LIKE ?)"); p.push(`%${f.search}%`, `%${f.search}%`); }
  if (f.scope) {
    if (f.scope.scope === 'family') w.push("t.scope = 'family'");
    else { w.push("t.scope = 'personal' AND t.member_id = ?"); p.push(f.scope.memberId); }
  }
  return { sql: w.length ? 'WHERE ' + w.join(' AND ') : '', p };
}

export function listTransactions(e: Engine, f: TxFilter = {}): Transaction[] {
  const { sql, p } = buildWhere(f);
  const rows = e.all(`SELECT t.*, (SELECT count(*) FROM attachments a WHERE a.transaction_id = t.id) AS attachment_count FROM transactions t ${sql} ORDER BY t.date DESC, t.created_at DESC LIMIT ${f.limit ?? 1000} OFFSET ${f.offset ?? 0}`, p);
  return rows.map((r) => camel<Transaction>(r));
}
export function countTransactions(e: Engine, f: TxFilter = {}): number {
  const { sql, p } = buildWhere(f);
  return Number(e.scalar(`SELECT count(*) FROM transactions t ${sql}`, p));
}
export function getTransaction(e: Engine, id: string): Transaction | undefined {
  const r = e.get('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!r) return undefined;
  const t = camel<Transaction>(r);
  t.splits = e.all<{ member_id: string; amount: number }>('SELECT member_id, amount FROM transaction_splits WHERE transaction_id = ?', [id]).map((s) => ({ memberId: s.member_id, amount: s.amount }));
  return t;
}

function checkAccounts(e: Engine, v: z.output<typeof transactionSchema>) {
  const acc = e.get<{ currency: string; archived: number }>('SELECT currency, archived FROM accounts WHERE id = ?', [v.accountId]);
  if (!acc) throw new Error(tr('La cuenta seleccionada no existe.'));
  if (acc.currency !== v.currency) throw new Error(tr('La cuenta opera en {currency}; el movimiento debe usar la misma moneda.', { currency: acc.currency }));
  if (v.toAccountId && !e.get('SELECT 1 FROM accounts WHERE id = ?', [v.toAccountId])) throw new Error(tr('La cuenta de destino no existe.'));
}

function writeSplits(e: Engine, id: string, splits?: Array<{ memberId: string; amount: number }>) {
  e.run('DELETE FROM transaction_splits WHERE transaction_id = ?', [id]);
  splits?.filter((s) => s.amount > 0).forEach((s) => e.run('INSERT INTO transaction_splits(transaction_id, member_id, amount) VALUES (?,?,?)', [id, s.memberId, s.amount]));
}

export function createTransaction(e: Engine, actor: Actor, input: TransactionInput): Transaction {
  assertCan(actor.role, 'tx.create');
  const v = transactionSchema.parse({ ...input, memberId: input.memberId ?? actor.id });
  if (v.memberId !== actor.id && !canEditTransaction(actor.role, actor.id, v.memberId ?? null)) throw new PermissionError('tx.create.other');
  checkAccounts(e, v);
  const id = uid();
  const now = nowISO();
  e.transaction(() => {
    e.run(`INSERT INTO transactions(id, type, description, amount, currency, date, category_id, account_id, to_account_id, payment_method, notes, member_id, scope, debt_id, income_source_id, period_key, recurring_id, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, v.type, v.description, v.amount, v.currency, v.date, v.categoryId ?? null, v.accountId, v.toAccountId ?? null, v.paymentMethod ?? null, v.notes ?? null, v.memberId ?? actor.id, v.scope, v.debtId ?? null, v.incomeSourceId ?? null, v.periodKey ?? null, v.recurringId ?? null, now, now]);
    if (v.scope === 'family') writeSplits(e, id, v.splits);
    log(e, actor, 'create', 'transaction', id, `${TX_TYPE_LABEL[v.type]}: ${v.description} (${formatMoney(v.amount, v.currency)})`, v.scope);
  });
  return getTransaction(e, id)!;
}

export function updateTransaction(e: Engine, actor: Actor, id: string, input: Partial<TransactionInput>): Transaction {
  const cur = getTransaction(e, id);
  if (!cur) throw new Error(tr('Movimiento no encontrado'));
  if (!canEditTransaction(actor.role, actor.id, cur.memberId)) throw new PermissionError('tx.edit');
  const v = transactionSchema.parse({ ...cur, ...input });
  checkAccounts(e, v);
  e.transaction(() => {
    e.run(`UPDATE transactions SET type=?, description=?, amount=?, currency=?, date=?, category_id=?, account_id=?, to_account_id=?, payment_method=?, notes=?, member_id=?, scope=?, debt_id=?, updated_at=? WHERE id=?`,
      [v.type, v.description, v.amount, v.currency, v.date, v.categoryId ?? null, v.accountId, v.toAccountId ?? null, v.paymentMethod ?? null, v.notes ?? null, v.memberId ?? cur.memberId, v.scope, v.debtId ?? null, nowISO(), id]);
    writeSplits(e, id, v.scope === 'family' ? v.splits : []);
    log(e, actor, 'update', 'transaction', id, tr('Editó: {description}', { description: v.description }), v.scope);
  });
  return getTransaction(e, id)!;
}

export function deleteTransaction(e: Engine, actor: Actor, id: string) {
  const cur = getTransaction(e, id);
  if (!cur) return;
  if (!canEditTransaction(actor.role, actor.id, cur.memberId)) throw new PermissionError('tx.delete');
  e.transaction(() => {
    e.run('DELETE FROM transactions WHERE id = ?', [id]);
    log(e, actor, 'delete', 'transaction', id, tr('Eliminó: {description} ({v1})', { description: cur.description, v1: formatMoney(cur.amount, cur.currency) }), cur.scope);
  });
}

// ================================================================= attachments
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export function addAttachment(e: Engine, actor: Actor, transactionId: string, file: { name: string; mime: string; data: Uint8Array }): Attachment {
  const t = getTransaction(e, transactionId);
  if (!t) throw new Error(tr('Movimiento no encontrado'));
  if (!canEditTransaction(actor.role, actor.id, t.memberId)) throw new PermissionError('attachment.add');
  if (file.data.length > MAX_ATTACHMENT_BYTES) throw new Error(tr('El comprobante supera el límite de 5 MB.'));
  const id = uid();
  e.run('INSERT INTO attachments(id, transaction_id, name, mime, size, data, created_at) VALUES (?,?,?,?,?,?,?)', [id, transactionId, file.name.slice(0, 120), file.mime || 'application/octet-stream', file.data.length, file.data, nowISO()]);
  return camel<Attachment>(e.get('SELECT id, transaction_id, name, mime, size, created_at FROM attachments WHERE id = ?', [id])!);
}
export function listAttachments(e: Engine, transactionId: string): Attachment[] {
  return e.all('SELECT id, transaction_id, name, mime, size, created_at FROM attachments WHERE transaction_id = ? ORDER BY created_at', [transactionId]).map((r) => camel<Attachment>(r));
}
export function getAttachmentData(e: Engine, id: string): { name: string; mime: string; data: Uint8Array } | undefined {
  return e.get<{ name: string; mime: string; data: Uint8Array }>('SELECT name, mime, data FROM attachments WHERE id = ?', [id]);
}
export function deleteAttachment(e: Engine, actor: Actor, id: string) {
  const r = e.get<{ member_id: string | null }>('SELECT t.member_id FROM attachments a JOIN transactions t ON t.id = a.transaction_id WHERE a.id = ?', [id]);
  if (!r) return;
  if (!canEditTransaction(actor.role, actor.id, r.member_id)) throw new PermissionError('attachment.delete');
  e.run('DELETE FROM attachments WHERE id = ?', [id]);
}
