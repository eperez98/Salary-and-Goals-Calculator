/**
 * Smart insights computed ONLY from real registered data. Every insight states
 * whether it is a fact (based on history) or an estimate/projection.
 */
import { diffDays, type ISODate } from '../lib/dates';

export interface TxLite { id: string; type: string; description: string; amount: number; date: ISODate; accountId: string | null; categoryId: string | null }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/** Pairs of probably duplicated expenses: same amount, account and type, ≤1 day apart, similar description. */
export function findDuplicates(txs: TxLite[], windowDays = 1): Array<[TxLite, TxLite]> {
  const out: Array<[TxLite, TxLite]> = [];
  const exp = txs.filter((t) => t.type === 'expense').sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 0; i < exp.length; i++) {
    for (let j = i + 1; j < exp.length; j++) {
      const a = exp[i], b = exp[j];
      if (diffDays(b.date, a.date) > windowDays) break;
      if (a.amount !== b.amount || a.accountId !== b.accountId) continue;
      const na = norm(a.description), nb = norm(b.description);
      if (na === nb || (na.length > 3 && nb.length > 3 && (na.includes(nb) || nb.includes(na)))) out.push([a, b]);
    }
  }
  return out;
}

export interface CategoryTrend { categoryId: string; current: number; average: number; changePct: number }

/**
 * Categories whose spending this period is notably above their average of
 * previous periods. `history` = per-category arrays of previous period totals.
 */
export function highSpendCategories(current: Map<string, number>, history: Map<string, number[]>, minChangePct = 25, minAmount = 2000): CategoryTrend[] {
  const out: CategoryTrend[] = [];
  for (const [cat, cur] of current) {
    const h = (history.get(cat) ?? []).filter((v) => v > 0);
    if (!h.length || cur < minAmount) continue;
    const avg = h.reduce((a, b) => a + b, 0) / h.length;
    const change = ((cur - avg) / avg) * 100;
    if (change >= minChangePct) out.push({ categoryId: cat, current: cur, average: Math.round(avg), changePct: change });
  }
  return out.sort((a, b) => b.changePct - a.changePct);
}

export interface SavingsProjection { monthlyAverage: number; months: number; projected12: number; basedOnMonths: number }

/** Projection based on the average real net savings of the given months. */
export function projectSavings(monthlyNet: number[], months = 12): SavingsProjection {
  const used = monthlyNet.filter((v, i) => v !== 0 || i === monthlyNet.length - 1);
  const avg = used.length ? Math.round(used.reduce((a, b) => a + b, 0) / used.length) : 0;
  return { monthlyAverage: avg, months, projected12: avg * months, basedOnMonths: used.length };
}

/** Months to reach a goal at the given monthly contribution. */
export function monthsToGoal(remaining: number, monthly: number): number {
  if (remaining <= 0) return 0;
  if (monthly <= 0) return Infinity;
  return Math.ceil(remaining / monthly);
}

export function savingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0;
  return ((income - expenses) / income) * 100;
}
