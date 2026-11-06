import { Engine } from '../engine';
import { listAccounts, isLiability, isLiquid } from './finance';
import { listBudgets, listDebts, listGoals, listIncomeSources, incomeSummary, listRecurring, recurringOccurrences, listReminders } from './planning';
import { lastMonths, addDays, today, type ISODate, type Range, monthKey, formatMonth, monthShort } from '../../lib/dates';
import { zeroTotals, type Currency, type CurrencyTotals } from '../../lib/money';
import { findDuplicates, highSpendCategories, projectSavings, savingsRate, type TxLite } from '../../domain/insights';
import type { ScopeFilter, Transaction } from '../types';

const scopeSql = (sf?: ScopeFilter) => !sf ? { sql: '1=1', p: [] as string[] } : sf.scope === 'family' ? { sql: "scope = 'family'", p: [] as string[] } : { sql: "scope = 'personal' AND member_id = ?", p: [sf.memberId] };

const INCOME_TYPES = "('income')";
const EXPENSE_EXPR = "SUM(CASE WHEN type IN ('expense','loan_payment') THEN amount WHEN type = 'refund' THEN -amount ELSE 0 END)";

export interface Totals { income: number; expense: number; net: number; byCurrency: { income: CurrencyTotals; expense: CurrencyTotals } }

export function totals(e: Engine, r: Range, sf?: ScopeFilter): Totals {
  const s = scopeSql(sf);
  const rows = e.all<{ currency: Currency; income: number; expense: number }>(
    `SELECT currency, IFNULL(SUM(CASE WHEN type IN ${INCOME_TYPES} THEN amount ELSE 0 END),0) AS income, IFNULL(${EXPENSE_EXPR},0) AS expense
     FROM transactions WHERE date BETWEEN ? AND ? AND ${s.sql} GROUP BY currency`, [r.from, r.to, ...s.p]);
  const inc = zeroTotals(), exp = zeroTotals();
  rows.forEach((x) => { inc[x.currency] += x.income; exp[x.currency] += x.expense; });
  const income = inc.PAB + inc.USD, expense = exp.PAB + exp.USD;
  return { income, expense, net: income - expense, byCurrency: { income: inc, expense: exp } };
}

export interface CategorySlice { categoryId: string; name: string; color: string; icon: string; amount: number }
/** Expenses grouped by top-level category. */
export function expensesByCategory(e: Engine, r: Range, sf?: ScopeFilter, kind: 'expense' | 'income' = 'expense'): CategorySlice[] {
  const s = scopeSql(sf);
  const typeCond = kind === 'expense' ? "t.type IN ('expense','loan_payment','refund')" : "t.type = 'income'";
  const amt = kind === 'expense' ? "SUM(CASE WHEN t.type='refund' THEN -t.amount ELSE t.amount END)" : 'SUM(t.amount)';
  return e.all<{ category_id: string; name: string; color: string; icon: string; amount: number }>(
    `SELECT IFNULL(p.id, IFNULL(c.id,'none')) AS category_id, IFNULL(p.name, IFNULL(c.name,'Sin categoría')) AS name, IFNULL(p.color, IFNULL(c.color,'#9AA39E')) AS color, IFNULL(p.icon, IFNULL(c.icon,'other')) AS icon, ${amt} AS amount
     FROM transactions t LEFT JOIN categories c ON c.id = t.category_id LEFT JOIN categories p ON p.id = c.parent_id
     WHERE ${typeCond} AND t.date BETWEEN ? AND ? AND ${s.sql.replace(/scope|member_id/g, (m) => 't.' + m)} GROUP BY 1 HAVING amount > 0 ORDER BY amount DESC`,
    [r.from, r.to, ...s.p]).map((x) => ({ categoryId: x.category_id, name: x.name, color: x.color, icon: x.icon, amount: x.amount }));
}

export interface MonthPoint { month: string; label: string; income: number; expense: number; net: number }
export function monthlySeries(e: Engine, months: number, sf?: ScopeFilter, ref: ISODate = today()): MonthPoint[] {
  const s = scopeSql(sf);
  const keys = lastMonths(months, ref);
  const rows = e.all<{ m: string; income: number; expense: number }>(
    `SELECT substr(date,1,7) AS m, IFNULL(SUM(CASE WHEN type IN ${INCOME_TYPES} THEN amount ELSE 0 END),0) AS income, IFNULL(${EXPENSE_EXPR},0) AS expense
     FROM transactions WHERE substr(date,1,7) BETWEEN ? AND ? AND ${s.sql} GROUP BY m`, [keys[0], keys.at(-1)!, ...s.p]);
  const map = new Map(rows.map((r) => [r.m, r]));
  return keys.map((k) => {
    const r = map.get(k);
    const income = r?.income ?? 0, expense = r?.expense ?? 0;
    return { month: k, label: monthShort(Number(k.slice(5)) - 1), income, expense, net: income - expense };
  });
}

export function balances(e: Engine, visibleTo?: string, sharedOnly = false) {
  const accs = listAccounts(e, { visibleTo, sharedOnly });
  const available = zeroTotals(), netWorth = zeroTotals(), debt = zeroTotals();
  for (const a of accs) {
    if (isLiquid(a)) available[a.currency] += a.balance;
    netWorth[a.currency] += a.balance;
    if (isLiability(a) && a.balance < 0) debt[a.currency] += -a.balance;
  }
  return { accounts: accs, available, netWorth, cardDebt: debt };
}

export interface UpcomingItem { date: ISODate; title: string; amount: number; currency: Currency; kind: 'income' | 'expense' | 'debt' | 'reminder'; estimated: boolean; ref?: string }

/** Upcoming payments & income in the next `days` days (salaries are estimates until received). */
export function upcoming(e: Engine, sf: ScopeFilter, days = 30, ref: ISODate = today()): UpcomingItem[] {
  const to = addDays(ref, days);
  const items: UpcomingItem[] = [];
  for (const o of recurringOccurrences(e, listRecurring(e, sf), ref, to)) if (!o.posted) items.push({ date: o.date, title: o.rule.description, amount: o.rule.amount, currency: o.rule.currency, kind: o.rule.kind, estimated: true, ref: o.rule.id });
  if (sf.scope === 'personal') {
    for (const s of listIncomeSources(e, sf.memberId)) {
      for (const occ of incomeSummary(e, s, ref).upcoming.filter((u) => u.date <= to)) items.push({ date: occ.date, title: `${s.name} · ${occ.label}`, amount: occ.net, currency: s.currency, kind: 'income', estimated: true, ref: s.id });
    }
  }
  for (const d of listDebts(e, sf, false)) {
    if (!d.paymentDay || d.direction !== 'owe') continue;
    for (let i = 0; i <= Math.ceil(days / 28); i++) {
      const base = new Date(Number(ref.slice(0, 4)), Number(ref.slice(5, 7)) - 1 + i, 1);
      const dim = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      const date = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d.paymentDay, dim)).padStart(2, '0')}`;
      const paidThisMonth = Number(e.scalar('SELECT count(*) FROM transactions WHERE debt_id = ? AND substr(date,1,7) = ?', [d.id, date.slice(0, 7)]));
      if (date >= ref && date <= to && !paidThisMonth) items.push({ date, title: tr('Cuota · {name}', { name: d.name }), amount: Math.min(d.status.balance, cuota(d)), currency: d.currency, kind: 'debt', estimated: true, ref: d.id });
    }
  }
  for (const r of listReminders(e, ref, to)) if (!r.done) items.push({ date: r.date, title: r.title, amount: r.amount ?? 0, currency: (r.currency as Currency) ?? 'PAB', kind: 'reminder', estimated: false, ref: r.id });
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

import { monthlyPayment } from '../../domain/amortization';
import { tr } from '../../lib/i18n';
function cuota(d: { principal: number; annualRate: number; termMonths: number }) { return monthlyPayment(d.principal, d.annualRate, d.termMonths); }

export type AlertLevel = 'info' | 'success' | 'warning' | 'danger';
export interface Alert { key: string; level: AlertLevel; title: string; body: string; kind: 'budget' | 'duplicate' | 'income' | 'debt' | 'recurring' | 'insight' | 'goal' | 'backup'; estimated?: boolean }

export function alerts(e: Engine, sf: ScopeFilter, ref: ISODate = today()): Alert[] {
  const out: Alert[] = [];
  const dismissed = new Set(e.all<{ key: string }>('SELECT key FROM dismissed_alerts').map((r) => r.key));
  const month = monthKey(ref);
  for (const b of listBudgets(e, sf, month)) {
    if (b.status.level === 'ok') continue;
    const th = b.status.level === 'exceeded' ? 100 : b.status.level === 'warning' ? 90 : 70;
    out.push({ key: `budget:${b.id}:${month}:${th}`, kind: 'budget', level: th === 100 ? 'danger' : th === 90 ? 'warning' : 'info', title: tr('{categoryName}: {v1} % del presupuesto', { categoryName: b.categoryName, v1: Math.round(b.status.pct) }), body: th === 100 ? tr('Has agotado el presupuesto de este mes.') : tr('Has alcanzado el {th} % de tu presupuesto mensual.', { th }) });
  }
  const s = scopeSql(sf);
  const recent = e.all<TxLite & { account_id: string; category_id: string }>(`SELECT id, type, description, amount, date, account_id, category_id FROM transactions WHERE date >= ? AND ${s.sql}`, [addDays(ref, -30), ...s.p])
    .map((t) => ({ ...t, accountId: t.account_id, categoryId: t.category_id }));
  for (const [a, b] of findDuplicates(recent)) out.push({ key: `dup:${a.id}:${b.id}`, kind: 'duplicate', level: 'warning', title: tr('Posible gasto duplicado'), body: tr('"{description}" aparece dos veces con el mismo importe ({date} y {date2}).', { description: b.description, date: a.date, date2: b.date }) });
  if (sf.scope === 'personal') {
    for (const src of listIncomeSources(e, sf.memberId)) {
      const sum = incomeSummary(e, src, ref);
      for (const p of sum.pending) out.push({ key: `income:${src.id}:${p.periodKey}`, kind: 'income', level: 'info', title: tr('¿Recibiste {v0}?', { v0: p.label.toLowerCase() }), body: tr('{name} estaba previsto para el {date}. Confírmalo para contarlo como dinero recibido.', { name: src.name, date: p.date }), estimated: true });
    }
  }
  for (const o of recurringOccurrences(e, listRecurring(e, sf).filter((r) => !r.autoPost), addDays(ref, -30), ref)) if (!o.posted) out.push({ key: `rec:${o.rule.id}:${o.date}`, kind: 'recurring', level: 'info', title: tr('Pendiente: {description}', { description: o.rule.description }), body: tr('Programado para el {date}. Confirma si ya se pagó.', { date: o.date }) });
  for (const u of upcoming(e, sf, 3, ref).filter((u) => u.kind === 'debt' || (u.kind === 'expense'))) out.push({ key: `soon:${u.ref}:${u.date}`, kind: 'debt', level: 'warning', title: tr('Pago próximo: {title}', { title: u.title }), body: tr('Vence el {date}.', { date: u.date }) });
  // high spend insight (real data)
  const cur = new Map(expensesByCategory(e, { from: `${month}-01`, to: ref }, sf).map((c) => [c.categoryId, c.amount]));
  const hist = new Map<string, number[]>();
  for (const m of lastMonths(4, ref).slice(0, 3)) for (const c of expensesByCategory(e, { from: `${m}-01`, to: `${m}-31` }, sf)) hist.set(c.categoryId, [...(hist.get(c.categoryId) ?? []), c.amount]);
  const names = new Map(expensesByCategory(e, { from: '0000-01-01', to: '9999-12-31' }, sf).map((c) => [c.categoryId, c.name]));
  for (const h of highSpendCategories(cur, hist).slice(0, 2)) out.push({ key: `high:${h.categoryId}:${month}`, kind: 'insight', level: 'warning', title: tr('Gasto elevado en {v0}', { v0: names.get(h.categoryId) ?? tr('una categoría') }), body: tr('Llevas un {v0} % más que tu promedio de los últimos meses (datos reales).', { v0: Math.round(h.changePct) }) });
  return out.filter((a) => !dismissed.has(a.key));
}
export function dismissAlert(e: Engine, key: string) { e.run('INSERT OR IGNORE INTO dismissed_alerts(key, created_at) VALUES (?, ?)', [key, new Date().toISOString()]); }

export interface MonthlySummary { month: string; label: string; income: number; expense: number; net: number; savingsRate: number; topCategory: string | null; vsPrevExpensePct: number | null; txCount: number }
export function monthlySummary(e: Engine, sf: ScopeFilter, month: string): MonthlySummary {
  const r = { from: `${month}-01`, to: `${month}-31` };
  const t = totals(e, r, sf);
  const prevKey = lastMonths(2, `${month}-01`)[0];
  const p = totals(e, { from: `${prevKey}-01`, to: `${prevKey}-31` }, sf);
  const cats = expensesByCategory(e, r, sf);
  const s = scopeSql(sf);
  return {
    month, label: formatMonth(month), income: t.income, expense: t.expense, net: t.net, savingsRate: savingsRate(t.income, t.expense),
    topCategory: cats[0]?.name ?? null, vsPrevExpensePct: p.expense ? ((t.expense - p.expense) / p.expense) * 100 : null,
    txCount: Number(e.scalar(`SELECT count(*) FROM transactions WHERE substr(date,1,7) = ? AND ${s.sql}`, [month, ...s.p])),
  };
}

export function savingsProjection(e: Engine, sf: ScopeFilter, ref: ISODate = today()) {
  const series = monthlySeries(e, 4, sf, ref).slice(0, 3); // complete months only
  return projectSavings(series.map((m) => m.net));
}

export function goalsOverview(e: Engine, sf: ScopeFilter) { return listGoals(e, sf); }

export type { Transaction };
