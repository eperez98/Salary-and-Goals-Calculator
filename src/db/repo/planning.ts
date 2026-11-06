import { z } from 'zod';
import { Engine, nowISO, uid } from '../engine';
import { camel } from '../map';
import { assertCan } from '../../domain/permissions';
import { categoryIdByName, log } from './core';
import { createTransaction } from './finance';
import { estimateIncome, nextPayment, payOccurrences, type IncomeConfig, type PayOccurrence } from '../../domain/salary';
import { applyPayments, type DebtStatus } from '../../domain/amortization';
import { budgetStatus, type BudgetStatus } from '../../domain/budget';
import { occurrences, type RecurFrequency } from '../../domain/recurrence';
import { netBalances, simplifyDebts } from '../../domain/split';
import { addDays, lastMonths, monthKey, today, type ISODate } from '../../lib/dates';
import { formatMoney, type Currency } from '../../lib/money';
import type { Actor, Budget, Contribution, Debt, Goal, IncomeSource, Recurring, Reminder, Scope, ScopeFilter, Settlement } from '../types';
import { tr } from '../../lib/i18n';

const currency = z.enum(['PAB', 'USD']);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, tr('Fecha no válida'));
const cents = z.number().int(tr('Importe no válido'));

const scopeWhere = (s: ScopeFilter | undefined, alias = '') => {
  const a = alias ? alias + '.' : '';
  if (!s) return { sql: '1=1', p: [] as string[] };
  return s.scope === 'family' ? { sql: `${a}scope = 'family'`, p: [] as string[] } : { sql: `${a}scope = 'personal' AND ${a}member_id = ?`, p: [s.memberId] };
};

// ================================================================= income sources
export const incomeConfigSchema = z.object({
  frequency: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly', 'hourly', 'variable', 'other']),
  amount1: cents.nonnegative(),
  amount2: cents.nonnegative().optional(),
  sameAmount: z.boolean().optional(),
  hourlyRate: cents.nonnegative().optional(),
  hoursPerWeek: z.number().min(0).max(168).optional(),
  schedule: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']).optional(),
  payDay1: z.number().int().min(1).max(31).optional(),
  payDay2: z.number().int().min(1).max(31).optional(),
  weekday: z.number().int().min(0).max(6).optional(),
  anchorDate: isoDate.optional(),
  adjustBusinessDay: z.boolean().optional(),
  deductions: z.array(z.object({ name: z.string().min(1), type: z.enum(['percent', 'fixed']), value: z.number().min(0), preset: z.enum(['css', 'se']).optional() })).optional(),
  includeDecimo: z.boolean().optional(),
}).superRefine((c, ctx) => {
  if ((c.frequency === 'semimonthly' || c.frequency === 'weekly' || c.frequency === 'biweekly' || c.frequency === 'monthly') && c.amount1 <= 0)
    ctx.addIssue({ code: 'custom', path: ['amount1'], message: tr('Indica el importe del pago') });
  if (c.frequency === 'hourly' && (!c.hourlyRate || !c.hoursPerWeek)) ctx.addIssue({ code: 'custom', path: ['hourlyRate'], message: tr('Indica tarifa y horas por semana') });
  if (c.frequency === 'semimonthly' && c.payDay1 && c.payDay2 && c.payDay1 >= c.payDay2) ctx.addIssue({ code: 'custom', path: ['payDay2'], message: tr('La segunda quincena debe ser posterior a la primera') });
});
export const incomeSourceSchema = z.object({
  name: z.string().trim().min(1, tr('Escribe un nombre')).max(60),
  config: incomeConfigSchema,
  currency,
  accountId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  memberId: z.string().nullable().optional(),
  startDate: isoDate,
});

export function listIncomeSources(e: Engine, memberId?: string): IncomeSource[] {
  const rows = memberId ? e.all('SELECT * FROM income_sources WHERE active = 1 AND member_id = ? ORDER BY created_at', [memberId]) : e.all('SELECT * FROM income_sources WHERE active = 1 ORDER BY created_at');
  return rows.map((r) => { const s = camel<IncomeSource & { config: string }>(r); return { ...s, config: JSON.parse(s.config as unknown as string) as IncomeConfig }; });
}
export function getIncomeSource(e: Engine, id: string) { return listIncomeSources(e).find((s) => s.id === id); }

export function createIncomeSource(e: Engine, actor: Actor, input: z.input<typeof incomeSourceSchema>): IncomeSource {
  assertCan(actor.role, 'income.manage');
  const v = incomeSourceSchema.parse({ ...input, memberId: input.memberId ?? actor.id });
  const id = uid();
  e.run('INSERT INTO income_sources(id, name, config, currency, account_id, category_id, member_id, start_date, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, v.name, JSON.stringify(v.config), v.currency, v.accountId ?? null, v.categoryId ?? categoryIdByName(e, 'Salario', 'income'), v.memberId ?? actor.id, v.startDate, nowISO()]);
  log(e, actor, 'create', 'income', id, tr('Configuró el ingreso {name}', { name: v.name }));
  return getIncomeSource(e, id)!;
}
export function updateIncomeSource(e: Engine, actor: Actor, id: string, input: Partial<z.input<typeof incomeSourceSchema>>) {
  assertCan(actor.role, 'income.manage');
  const cur = getIncomeSource(e, id);
  if (!cur) throw new Error(tr('Ingreso no encontrado'));
  if (actor.role === 'member' && cur.memberId !== actor.id) throw new Error(tr('Solo puedes editar tus propios ingresos.'));
  const v = incomeSourceSchema.parse({ ...cur, ...input });
  e.run('UPDATE income_sources SET name=?, config=?, currency=?, account_id=?, category_id=?, start_date=? WHERE id=?', [v.name, JSON.stringify(v.config), v.currency, v.accountId ?? null, v.categoryId ?? null, v.startDate, id]);
}
export function deleteIncomeSource(e: Engine, actor: Actor, id: string) {
  assertCan(actor.role, 'income.manage');
  e.run('UPDATE income_sources SET active = 0 WHERE id = ?', [id]);
}

export function receivedKeys(e: Engine, sourceId: string): Set<string> {
  return new Set(e.all<{ period_key: string }>('SELECT period_key FROM transactions WHERE income_source_id = ? AND period_key IS NOT NULL', [sourceId]).map((r) => r.period_key));
}

export interface IncomeSummary {
  source: IncomeSource;
  estimate: ReturnType<typeof estimateIncome>;
  next: PayOccurrence | null;
  pending: PayOccurrence[];
  upcoming: PayOccurrence[];
  receivedYear: number;
  receivedMonth: number;
  receivedCount: number;
  monthlyHistory: Array<{ month: string; amount: number }>;
}

export function incomeSummary(e: Engine, s: IncomeSource, ref: ISODate = today()): IncomeSummary {
  const months = lastMonths(6, ref);
  const hist = months.map((m) => ({ month: m, amount: Number(e.scalar("SELECT IFNULL(SUM(amount),0) FROM transactions WHERE income_source_id = ? AND substr(date,1,7) = ? AND type = 'income'", [s.id, m])) }));
  const estimate = estimateIncome(s.config, hist.slice(0, -1).map((h) => h.amount));
  const keys = receivedKeys(e, s.id);
  const since = s.startDate > addDays(ref, -62) ? s.startDate : addDays(ref, -62);
  const pending = payOccurrences(s.config, since, ref).filter((o) => !keys.has(o.periodKey));
  const upcoming = payOccurrences(s.config, addDays(ref, 1), addDays(ref, 90)).filter((o) => !keys.has(o.periodKey));
  const year = ref.slice(0, 4);
  return {
    source: s, estimate, pending, upcoming,
    next: nextPayment(s.config, ref, keys),
    receivedYear: Number(e.scalar("SELECT IFNULL(SUM(amount),0) FROM transactions WHERE income_source_id = ? AND substr(date,1,4) = ? AND type='income'", [s.id, year])),
    receivedMonth: hist.at(-1)!.amount,
    receivedCount: Number(e.scalar("SELECT count(*) FROM transactions WHERE income_source_id = ? AND substr(date,1,4) = ? AND type='income'", [s.id, year])),
    monthlyHistory: hist,
  };
}

/** Register an expected payment as actually received (creates a real income transaction). */
export function markPaymentReceived(e: Engine, actor: Actor, s: IncomeSource, occ: PayOccurrence, opts: { amount?: number; date?: ISODate; accountId?: string } = {}) {
  const date = opts.date ?? today();
  if (date > today()) throw new Error(tr('No puedes registrar como recibido un pago con fecha futura.'));
  const accountId = opts.accountId ?? s.accountId;
  if (!accountId) throw new Error(tr('Selecciona la cuenta donde recibiste el pago.'));
  const cat = occ.kind === 'decimo' ? (e.get<{ id: string }>('SELECT id FROM categories WHERE name IN (?, ?)', [tr('Décimo tercer mes'), 'Décimo tercer mes'])?.id ?? s.categoryId) : s.categoryId;
  return createTransaction(e, actor, {
    type: 'income', description: `${s.name} · ${occ.label}`, amount: opts.amount ?? occ.net, currency: s.currency, date,
    categoryId: cat, accountId, paymentMethod: 'ach', memberId: s.memberId ?? actor.id, scope: 'personal', incomeSourceId: s.id, periodKey: occ.periodKey,
  });
}

// ================================================================= budgets
export const budgetSchema = z.object({ categoryId: z.string().min(1, tr('Selecciona una categoría')), amount: cents.positive(tr('El presupuesto debe ser mayor que cero')), scope: z.enum(['personal', 'family']), memberId: z.string().nullable().optional() });
export interface BudgetView extends Budget { status: BudgetStatus; categoryName: string; icon: string; color: string }

export function listBudgets(e: Engine, sf: ScopeFilter, month: string = monthKey(today())): BudgetView[] {
  const memberCond = sf.scope === 'family' ? "b.scope = 'family'" : "b.scope = 'personal' AND b.member_id = ?";
  const rows = e.all(`SELECT b.*, c.name AS category_name, c.icon, c.color FROM budgets b JOIN categories c ON c.id = b.category_id WHERE ${memberCond} ORDER BY c.sort`, sf.scope === 'family' ? [] : [sf.memberId]);
  return rows.map((r) => {
    const b = camel<Budget & { categoryName: string; icon: string; color: string }>(r);
    const tsc = scopeWhere(sf, 't');
    const used = Number(e.scalar(`SELECT IFNULL(SUM(CASE WHEN t.type='refund' THEN -t.amount ELSE t.amount END),0) FROM transactions t WHERE t.type IN ('expense','loan_payment','refund') AND substr(t.date,1,7) = ? AND (t.category_id = ? OR t.category_id IN (SELECT id FROM categories WHERE parent_id = ?)) AND ${tsc.sql}`, [month, b.categoryId, b.categoryId, ...tsc.p]));
    return { ...b, status: budgetStatus(b.amount, Math.max(0, used)) };
  });
}
export function upsertBudget(e: Engine, actor: Actor, input: z.input<typeof budgetSchema>) {
  assertCan(actor.role, 'budget.manage');
  const v = budgetSchema.parse({ ...input, memberId: input.scope === 'family' ? null : input.memberId ?? actor.id });
  const existing = e.get<{ id: string }>("SELECT id FROM budgets WHERE category_id = ? AND scope = ? AND IFNULL(member_id,'') = IFNULL(?, '')", [v.categoryId, v.scope, v.memberId ?? null]);
  if (existing) e.run('UPDATE budgets SET amount = ? WHERE id = ?', [v.amount, existing.id]);
  else e.run('INSERT INTO budgets(id, category_id, amount, scope, member_id, created_at) VALUES (?,?,?,?,?,?)', [uid(), v.categoryId, v.amount, v.scope, v.memberId ?? null, nowISO()]);
  log(e, actor, 'upsert', 'budget', v.categoryId, tr('Definió un presupuesto de {v0}', { v0: formatMoney(v.amount) }), v.scope);
}
export function deleteBudget(e: Engine, actor: Actor, id: string) { assertCan(actor.role, 'budget.manage'); e.run('DELETE FROM budgets WHERE id = ?', [id]); }

// ================================================================= goals
export const GOAL_KIND_LABEL: Record<Goal['kind'], string> = { emergency: tr('Fondo de emergencia'), vehicle: tr('Vehículo'), home: tr('Vivienda'), vacation: tr('Vacaciones'), education: tr('Educación'), other: tr('Otro') };
export const goalSchema = z.object({
  name: z.string().trim().min(1, tr('Escribe un nombre')).max(60),
  kind: z.enum(['emergency', 'vehicle', 'home', 'vacation', 'education', 'other']),
  target: cents.positive(tr('La meta debe ser mayor que cero')),
  currency,
  targetDate: isoDate.nullable().optional(),
  color: z.string().optional(),
  scope: z.enum(['personal', 'family']),
});
const GOAL_SQL = 'SELECT g.*, IFNULL((SELECT SUM(amount) FROM goal_contributions c WHERE c.goal_id = g.id),0) AS saved FROM goals g';
export function listGoals(e: Engine, sf: ScopeFilter): Goal[] {
  const s = scopeWhere(sf, 'g');
  return e.all(`${GOAL_SQL} WHERE ${s.sql} ORDER BY g.completed_at IS NOT NULL, g.created_at`, s.p).map((r) => camel<Goal>(r));
}
export function getGoal(e: Engine, id: string): Goal | undefined { const r = e.get(`${GOAL_SQL} WHERE g.id = ?`, [id]); return r ? camel<Goal>(r) : undefined; }
export function createGoal(e: Engine, actor: Actor, input: z.input<typeof goalSchema>): Goal {
  assertCan(actor.role, 'goal.manage');
  const v = goalSchema.parse(input);
  const id = uid();
  e.run('INSERT INTO goals(id, name, kind, target, currency, target_date, color, scope, member_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [id, v.name, v.kind, v.target, v.currency, v.targetDate ?? null, v.color ?? '#1F6B4F', v.scope, actor.id, nowISO()]);
  log(e, actor, 'create', 'goal', id, tr('Creó el objetivo {name}', { name: v.name }), v.scope);
  return getGoal(e, id)!;
}
export function updateGoal(e: Engine, actor: Actor, id: string, input: Partial<z.input<typeof goalSchema>>) {
  assertCan(actor.role, 'goal.manage');
  const cur = getGoal(e, id);
  if (!cur) throw new Error(tr('Objetivo no encontrado'));
  const v = goalSchema.parse({ ...cur, ...input });
  e.run('UPDATE goals SET name=?, kind=?, target=?, currency=?, target_date=?, color=?, scope=? WHERE id=?', [v.name, v.kind, v.target, v.currency, v.targetDate ?? null, v.color ?? cur.color, v.scope, id]);
  syncGoalCompletion(e, id);
}
export function deleteGoal(e: Engine, actor: Actor, id: string) { assertCan(actor.role, 'goal.manage'); e.run('DELETE FROM goals WHERE id = ?', [id]); }

function syncGoalCompletion(e: Engine, id: string): boolean {
  const g = getGoal(e, id)!;
  const done = g.saved >= g.target;
  if (done && !g.completedAt) { e.run('UPDATE goals SET completed_at = ? WHERE id = ?', [nowISO(), id]); return true; }
  if (!done && g.completedAt) e.run('UPDATE goals SET completed_at = NULL WHERE id = ?', [id]);
  return false;
}

/** Add (or withdraw, negative) money to a goal. Returns true when the goal just got completed. */
export function contributeToGoal(e: Engine, actor: Actor, goalId: string, amount: number, date: ISODate = today(), note?: string): boolean {
  assertCan(actor.role, 'goal.contribute');
  const g = getGoal(e, goalId);
  if (!g) throw new Error(tr('Objetivo no encontrado'));
  const a = cents.refine((x) => x !== 0, tr('El importe no puede ser cero')).parse(amount);
  if (g.saved + a < 0) throw new Error(tr('No puedes retirar más de lo ahorrado.'));
  return e.transaction(() => {
    e.run('INSERT INTO goal_contributions(id, goal_id, amount, date, member_id, note, created_at) VALUES (?,?,?,?,?,?,?)', [uid(), goalId, a, isoDate.parse(date), actor.id, note ?? null, nowISO()]);
    log(e, actor, 'contribute', 'goal', goalId, `${a > 0 ? tr('Aportó') : tr('Retiró')} ${formatMoney(Math.abs(a), g.currency)} en ${g.name}`, g.scope);
    return syncGoalCompletion(e, goalId);
  });
}
export function listContributions(e: Engine, goalId: string): Contribution[] {
  return e.all('SELECT * FROM goal_contributions WHERE goal_id = ? ORDER BY date DESC, created_at DESC', [goalId]).map((r) => camel<Contribution>(r));
}
/** Average monthly contributions over the last 3 months (real data). */
export function goalMonthlyPace(e: Engine, goalId: string): number {
  const since = addDays(today(), -90);
  return Math.round(Number(e.scalar('SELECT IFNULL(SUM(amount),0) FROM goal_contributions WHERE goal_id = ? AND date >= ?', [goalId, since])) / 3);
}

// ================================================================= debts
export const DEBT_KIND_LABEL: Record<Debt['kind'], string> = { personal_loan: tr('Préstamo personal'), mortgage: tr('Hipoteca'), auto: tr('Financiamiento de auto'), credit_card: tr('Tarjeta de crédito'), personal_debt: tr('Deuda personal') };
export const debtSchema = z.object({
  name: z.string().trim().min(1, tr('Escribe un nombre')).max(60),
  kind: z.enum(['personal_loan', 'mortgage', 'auto', 'credit_card', 'personal_debt']),
  direction: z.enum(['owe', 'owed']).default('owe'),
  principal: cents.positive(tr('Indica el monto')),
  currency,
  annualRate: z.number().min(0).max(100, tr('Tasa no válida')),
  termMonths: z.number().int().min(1).max(600),
  startDate: isoDate,
  paymentDay: z.number().int().min(1).max(31).nullable().optional(),
  lender: z.string().max(60).nullable().optional(),
  accountId: z.string().nullable().optional(),
  scope: z.enum(['personal', 'family']),
  notes: z.string().max(500).nullable().optional(),
});
export interface DebtView extends Debt { status: DebtStatus }
export function listDebts(e: Engine, sf: ScopeFilter, includeClosed = true): DebtView[] {
  const s = scopeWhere(sf);
  return e.all(`SELECT * FROM debts WHERE ${s.sql} ${includeClosed ? '' : 'AND closed = 0'} ORDER BY closed, created_at`, s.p).map((r) => withDebtStatus(e, camel<Debt>(r)));
}
function withDebtStatus(e: Engine, d: Debt): DebtView {
  const pays = e.all<{ date: string; amount: number }>("SELECT date, amount FROM transactions WHERE debt_id = ? AND type IN ('loan_payment','income')", [d.id]);
  return { ...d, status: applyPayments(d.principal, d.annualRate, pays) };
}
export function getDebt(e: Engine, id: string): DebtView | undefined { const r = e.get('SELECT * FROM debts WHERE id = ?', [id]); return r ? withDebtStatus(e, camel<Debt>(r)) : undefined; }
export function createDebt(e: Engine, actor: Actor, input: z.input<typeof debtSchema>): DebtView {
  assertCan(actor.role, 'debt.manage');
  const v = debtSchema.parse(input);
  const id = uid();
  e.run('INSERT INTO debts(id, name, kind, direction, principal, currency, annual_rate, term_months, start_date, payment_day, lender, account_id, member_id, scope, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [id, v.name, v.kind, v.direction, v.principal, v.currency, v.annualRate, v.termMonths, v.startDate, v.paymentDay ?? null, v.lender ?? null, v.accountId ?? null, actor.id, v.scope, v.notes ?? null, nowISO()]);
  log(e, actor, 'create', 'debt', id, tr('Registró {v0}: {name}', { v0: DEBT_KIND_LABEL[v.kind], name: v.name }), v.scope);
  return getDebt(e, id)!;
}
export function updateDebt(e: Engine, actor: Actor, id: string, input: Partial<z.input<typeof debtSchema>> & { closed?: boolean }) {
  assertCan(actor.role, 'debt.manage');
  const cur = getDebt(e, id);
  if (!cur) throw new Error(tr('Deuda no encontrada'));
  const v = debtSchema.parse({ ...cur, ...input });
  e.run('UPDATE debts SET name=?, kind=?, direction=?, principal=?, currency=?, annual_rate=?, term_months=?, start_date=?, payment_day=?, lender=?, account_id=?, scope=?, notes=?, closed=? WHERE id=?',
    [v.name, v.kind, v.direction, v.principal, v.currency, v.annualRate, v.termMonths, v.startDate, v.paymentDay ?? null, v.lender ?? null, v.accountId ?? null, v.scope, v.notes ?? null, (input.closed ?? cur.closed) ? 1 : 0, id]);
}
export function deleteDebt(e: Engine, actor: Actor, id: string) { assertCan(actor.role, 'debt.manage'); e.run('DELETE FROM debts WHERE id = ?', [id]); }
/** Register a payment ("abono") for a debt — creates a real transaction. */
export function payDebt(e: Engine, actor: Actor, debtId: string, input: { amount: number; date: ISODate; accountId: string }) {
  const d = getDebt(e, debtId);
  if (!d) throw new Error(tr('Deuda no encontrada'));
  if (d.status.balance <= 0) throw new Error(tr('Esta deuda ya está saldada.'));
  const t = createTransaction(e, actor, {
    type: d.direction === 'owed' ? 'income' : 'loan_payment', description: `${d.direction === 'owed' ? tr('Cobro') : tr('Abono')} · ${d.name}`, amount: input.amount, currency: d.currency, date: input.date,
    accountId: input.accountId, categoryId: d.direction === 'owed' ? categoryIdByName(e, 'Otros ingresos', 'income') : categoryIdByName(e, d.kind === 'credit_card' ? 'Tarjetas de crédito' : 'Préstamos', 'expense'),
    paymentMethod: 'transfer', scope: d.scope, debtId,
  });
  const after = getDebt(e, debtId)!;
  if (after.status.balance <= 0) e.run('UPDATE debts SET closed = 1 WHERE id = ?', [debtId]);
  return t;
}

// ================================================================= recurring
export const recurringSchema = z.object({
  kind: z.enum(['income', 'expense']),
  description: z.string().trim().min(1, tr('Escribe una descripción')).max(120),
  amount: cents.positive(tr('Indica el importe')),
  currency,
  categoryId: z.string().nullable().optional(),
  accountId: z.string().min(1, tr('Selecciona una cuenta')),
  paymentMethod: z.enum(['cash', 'debit', 'credit', 'transfer', 'ach', 'yappy', 'check', 'other']).nullable().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  startDate: isoDate,
  endDate: isoDate.nullable().optional(),
  autoPost: z.boolean().default(false),
  scope: z.enum(['personal', 'family']),
});
export function listRecurring(e: Engine, sf?: ScopeFilter): Recurring[] {
  const s = scopeWhere(sf);
  return e.all(`SELECT * FROM recurring WHERE active = 1 AND ${s.sql} ORDER BY start_date`, s.p).map((r) => camel<Recurring>(r));
}
export function createRecurring(e: Engine, actor: Actor, input: z.input<typeof recurringSchema>): Recurring {
  assertCan(actor.role, 'tx.create');
  const v = recurringSchema.parse(input);
  const id = uid();
  e.run('INSERT INTO recurring(id, kind, description, amount, currency, category_id, account_id, payment_method, frequency, start_date, end_date, auto_post, member_id, scope, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [id, v.kind, v.description, v.amount, v.currency, v.categoryId ?? null, v.accountId, v.paymentMethod ?? null, v.frequency, v.startDate, v.endDate ?? null, v.autoPost ? 1 : 0, actor.id, v.scope, nowISO()]);
  log(e, actor, 'create', 'recurring', id, tr('Programó {description} ({v1})', { description: v.description, v1: formatMoney(v.amount, v.currency) }), v.scope);
  return camel<Recurring>(e.get('SELECT * FROM recurring WHERE id = ?', [id])!);
}
export function updateRecurring(e: Engine, actor: Actor, id: string, input: Partial<z.input<typeof recurringSchema>>) {
  assertCan(actor.role, 'tx.create');
  const cur = e.get('SELECT * FROM recurring WHERE id = ?', [id]);
  if (!cur) throw new Error(tr('Programación no encontrada'));
  const v = recurringSchema.parse({ ...camel<Recurring>(cur), ...input });
  e.run('UPDATE recurring SET kind=?, description=?, amount=?, currency=?, category_id=?, account_id=?, payment_method=?, frequency=?, start_date=?, end_date=?, auto_post=?, scope=? WHERE id=?',
    [v.kind, v.description, v.amount, v.currency, v.categoryId ?? null, v.accountId, v.paymentMethod ?? null, v.frequency, v.startDate, v.endDate ?? null, v.autoPost ? 1 : 0, v.scope, id]);
}
export function deleteRecurring(e: Engine, actor: Actor, id: string) { assertCan(actor.role, 'tx.create'); e.run('UPDATE recurring SET active = 0 WHERE id = ?', [id]); }

export interface RecurringOccurrence { rule: Recurring; date: ISODate; posted: boolean }
export function recurringOccurrences(e: Engine, rules: Recurring[], from: ISODate, to: ISODate): RecurringOccurrence[] {
  const out: RecurringOccurrence[] = [];
  for (const r of rules) {
    const posted = new Set(e.all<{ date: string }>('SELECT date FROM transactions WHERE recurring_id = ?', [r.id]).map((x) => x.date));
    for (const d of occurrences({ frequency: r.frequency as RecurFrequency, startDate: r.startDate, endDate: r.endDate }, from, to)) out.push({ rule: r, date: d, posted: posted.has(d) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
export function postRecurring(e: Engine, actor: Actor, r: Recurring, date: ISODate) {
  if (date > today()) throw new Error(tr('No se registran movimientos programados antes de su fecha.'));
  return createTransaction(e, actor, {
    type: r.kind, description: r.description, amount: r.amount, currency: r.currency, date, categoryId: r.categoryId, accountId: r.accountId!,
    paymentMethod: r.paymentMethod, scope: r.scope, memberId: r.memberId ?? actor.id, recurringId: r.id,
  });
}
/** Auto-post due occurrences of rules with autoPost (only dates ≤ today). Returns how many were created. */
export function runAutoPost(e: Engine, actor: Actor, ref: ISODate = today()): number {
  let n = 0;
  for (const occ of recurringOccurrences(e, listRecurring(e).filter((r) => r.autoPost), addDays(ref, -60), ref)) {
    if (occ.posted || !occ.rule.accountId) continue;
    try { postRecurring(e, { id: occ.rule.memberId ?? actor.id, role: 'admin' }, occ.rule, occ.date); n++; } catch { /* skip invalid */ }
  }
  return n;
}

// ================================================================= reminders
export const reminderSchema = z.object({ title: z.string().trim().min(1, tr('Escribe un título')).max(80), date: isoDate, amount: cents.positive().nullable().optional(), currency: currency.nullable().optional(), notes: z.string().max(300).nullable().optional() });
export function listReminders(e: Engine, from?: ISODate, to?: ISODate): Reminder[] {
  return e.all(`SELECT * FROM reminders ${from ? 'WHERE date BETWEEN ? AND ?' : ''} ORDER BY date`, from ? [from, to ?? '9999-12-31'] : []).map((r) => camel<Reminder>(r));
}
export function createReminder(e: Engine, actor: Actor, input: z.input<typeof reminderSchema>) {
  assertCan(actor.role, 'tx.create');
  const v = reminderSchema.parse(input);
  e.run('INSERT INTO reminders(id, title, date, amount, currency, notes, member_id, created_at) VALUES (?,?,?,?,?,?,?,?)', [uid(), v.title, v.date, v.amount ?? null, v.currency ?? null, v.notes ?? null, actor.id, nowISO()]);
}
export function toggleReminder(e: Engine, id: string, done: boolean) { e.run('UPDATE reminders SET done = ? WHERE id = ?', [done ? 1 : 0, id]); }
export function deleteReminder(e: Engine, actor: Actor, id: string) { assertCan(actor.role, 'tx.create'); e.run('DELETE FROM reminders WHERE id = ?', [id]); }

// ================================================================= family balances
export function createSettlement(e: Engine, actor: Actor, input: { fromMemberId: string; toMemberId: string; amount: number; date: ISODate; note?: string; currency?: Currency }) {
  assertCan(actor.role, 'tx.create');
  if (input.fromMemberId === input.toMemberId) throw new Error(tr('Selecciona dos integrantes distintos.'));
  cents.positive(tr('Indica el importe')).parse(input.amount);
  e.run('INSERT INTO settlements(id, from_member_id, to_member_id, amount, currency, date, note, created_at) VALUES (?,?,?,?,?,?,?,?)', [uid(), input.fromMemberId, input.toMemberId, input.amount, input.currency ?? 'PAB', input.date, input.note ?? null, nowISO()]);
  log(e, actor, 'settle', 'settlement', null, tr('Registró una liquidación de {v0}', { v0: formatMoney(input.amount, input.currency ?? 'PAB') }), 'family');
}
export function listSettlements(e: Engine): Settlement[] { return e.all('SELECT * FROM settlements ORDER BY date DESC').map((r) => camel<Settlement>(r)); }

export function familyBalances(e: Engine) {
  const rows = e.all<{ id: string; member_id: string; split_member: string; split_amount: number }>(
    "SELECT t.id, t.member_id, s.member_id AS split_member, s.amount AS split_amount FROM transactions t JOIN transaction_splits s ON s.transaction_id = t.id WHERE t.scope = 'family' AND t.type = 'expense'");
  const byTx = new Map<string, { payerId: string; shares: Array<{ memberId: string; amount: number }> }>();
  for (const r of rows) {
    const x = byTx.get(r.id) ?? { payerId: r.member_id, shares: [] };
    x.shares.push({ memberId: r.split_member, amount: r.split_amount });
    byTx.set(r.id, x);
  }
  const settlements = listSettlements(e).map((s) => ({ fromId: s.fromMemberId, toId: s.toMemberId, amount: s.amount }));
  const net = netBalances([...byTx.values()], settlements);
  return { net, transfers: simplifyDebts(net) };
}

export type { Scope };
