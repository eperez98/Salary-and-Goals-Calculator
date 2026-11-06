import { addDays, addMonths, clampedDate, fromISO, toISO, type ISODate } from '../lib/dates';
import { tr } from '../lib/i18n';

export type RecurFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export const RECUR_LABEL: Record<RecurFrequency, string> = {
  weekly: tr('Semanal'),
  biweekly: tr('Cada 2 semanas'),
  monthly: tr('Mensual'),
  quarterly: tr('Trimestral'),
  yearly: tr('Anual'),
};

export interface RecurRule { frequency: RecurFrequency; startDate: ISODate; endDate?: ISODate | null; day?: number | null }

/** Occurrence dates of a recurring rule within [from, to]. */
export function occurrences(rule: RecurRule, from: ISODate, to: ISODate, max = 500): ISODate[] {
  const out: ISODate[] = [];
  const end = rule.endDate && rule.endDate < to ? rule.endDate : to;
  const start = fromISO(rule.startDate);
  const day = rule.day ?? start.getDate();
  for (let i = 0; i < max; i++) {
    let d: ISODate;
    switch (rule.frequency) {
      case 'weekly': d = addDays(rule.startDate, 7 * i); break;
      case 'biweekly': d = addDays(rule.startDate, 14 * i); break;
      case 'monthly': d = toISO(clampedDate(start.getFullYear(), start.getMonth() + i, day)); break;
      case 'quarterly': d = toISO(clampedDate(start.getFullYear(), start.getMonth() + 3 * i, day)); break;
      case 'yearly': d = addMonths(rule.startDate, 12 * i); break;
    }
    if (d > end) break;
    if (d >= from) out.push(d);
  }
  return out;
}

export function monthlyEquivalent(amount: number, f: RecurFrequency): number {
  const perYear = { weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1 }[f];
  return Math.round((amount * perYear) / 12);
}
