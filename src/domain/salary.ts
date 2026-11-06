/**
 * Salary & income engine — tuned for Panamá (quincenas, décimo tercer mes,
 * CSS / Seguro Educativo) but generic enough for weekly, monthly, hourly and
 * variable income.
 *
 * Key rule: everything computed here is an ESTIMATE. Money only counts as
 * "received" when a real transaction exists for the payment period.
 */
import { addDays, clampedDate, fromISO, previousBusinessDay, toISO, type ISODate } from '../lib/dates';
import { tr } from '../lib/i18n';

export type Frequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'hourly' | 'variable' | 'other';
export type PaySchedule = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: tr('Semanal'),
  biweekly: tr('Bisemanal (cada 2 semanas)'),
  semimonthly: tr('Quincenal'),
  monthly: tr('Mensual'),
  hourly: tr('Por horas'),
  variable: tr('Variable / freelance'),
  other: tr('Otro'),
};

export interface Deduction {
  name: string;
  type: 'percent' | 'fixed';
  /** percent: 9.75 means 9.75 %. fixed: cents per payment. */
  value: number;
  preset?: 'css' | 'se';
}

/** Panamanian employee withholding presets (estimates; verify with your payslip). */
export const PANAMA_DEDUCTIONS: Deduction[] = [
  { name: tr('Caja de Seguro Social (CSS)'), type: 'percent', value: 9.75, preset: 'css' },
  { name: tr('Seguro Educativo'), type: 'percent', value: 1.25, preset: 'se' },
];

export interface IncomeConfig {
  frequency: Frequency;
  /** Gross per payment (cents). For semimonthly: 1st quincena. For hourly: unused. */
  amount1: number;
  /** Semimonthly 2nd quincena gross (cents). Ignored when sameAmount. */
  amount2?: number;
  sameAmount?: boolean;
  hourlyRate?: number; // cents per hour
  hoursPerWeek?: number;
  /** Pay schedule for hourly income. */
  schedule?: PaySchedule;
  payDay1?: number; // semimonthly/monthly: day of month (default 15 / 30)
  payDay2?: number;
  weekday?: number; // weekly: 0-6 (default Friday = 5)
  anchorDate?: ISODate; // biweekly first pay date
  adjustBusinessDay?: boolean;
  deductions?: Deduction[];
  includeDecimo?: boolean;
}

export interface PaymentBreakdown { label: string; gross: number; deductions: number; net: number }

export interface IncomeEstimate {
  paymentsPerYear: number;
  payments: PaymentBreakdown[];
  monthlyGross: number;
  monthlyNet: number;
  annualGross: number;
  annualNet: number;
  /** Décimo tercer mes (estimated, gross/net per year). */
  decimoGross: number;
  decimoNet: number;
  /** True when the figures come from real history (variable income). */
  basedOnHistory: boolean;
}

export function applyDeductions(gross: number, deductions: Deduction[] = [], forDecimo = false): number {
  let total = 0;
  for (const d of deductions) {
    if (forDecimo) {
      // Décimo: CSS withholding is 7.25 %, Seguro Educativo does not apply,
      // custom deductions are not applied.
      if (d.preset === 'css') total += Math.round(gross * 0.0725);
      continue;
    }
    total += d.type === 'percent' ? Math.round((gross * d.value) / 100) : Math.round(d.value);
  }
  return Math.min(total, gross);
}

function scheduleOf(c: IncomeConfig): PaySchedule | null {
  switch (c.frequency) {
    case 'weekly': case 'biweekly': case 'semimonthly': case 'monthly': return c.frequency;
    case 'hourly': return c.schedule ?? 'semimonthly';
    default: return null;
  }
}

const PER_YEAR: Record<PaySchedule, number> = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };

function breakdown(label: string, gross: number, deductions?: Deduction[]): PaymentBreakdown {
  const ded = applyDeductions(gross, deductions);
  return { label, gross, deductions: ded, net: gross - ded };
}

/**
 * Estimate income. `history` (monthly totals in cents, real received money)
 * is used for variable/other income.
 */
export function estimateIncome(c: IncomeConfig, history: number[] = []): IncomeEstimate {
  const ded = c.deductions ?? [];
  let payments: PaymentBreakdown[] = [];
  let annualGross = 0;
  let annualNet = 0;
  let perYear = 0;
  let basedOnHistory = false;

  if (c.frequency === 'semimonthly') {
    const q1 = breakdown(tr('Primera quincena'), c.amount1, ded);
    const q2 = breakdown(tr('Segunda quincena'), c.sameAmount === false ? (c.amount2 ?? c.amount1) : c.amount1, ded);
    payments = [q1, q2];
    perYear = 24;
    annualGross = (q1.gross + q2.gross) * 12;
    annualNet = (q1.net + q2.net) * 12;
  } else if (c.frequency === 'hourly') {
    const sched = scheduleOf(c)!;
    perYear = PER_YEAR[sched];
    const yearGross = Math.round((c.hourlyRate ?? 0) * (c.hoursPerWeek ?? 0) * 52);
    const per = Math.round(yearGross / perYear);
    const b = breakdown(tr('Pago estimado'), per, ded);
    payments = [b];
    annualGross = yearGross;
    annualNet = yearGross - b.deductions * perYear;
  } else if (c.frequency === 'weekly' || c.frequency === 'biweekly' || c.frequency === 'monthly') {
    perYear = PER_YEAR[c.frequency];
    const b = breakdown(c.frequency === 'monthly' ? tr('Pago mensual') : tr('Pago'), c.amount1, ded);
    payments = [b];
    annualGross = b.gross * perYear;
    annualNet = b.net * perYear;
  } else {
    // variable / other: average of real history (net amounts already received)
    const months = history.filter((v) => v > 0);
    basedOnHistory = months.length > 0;
    const avg = months.length ? Math.round(months.reduce((a, b) => a + b, 0) / months.length) : c.amount1;
    perYear = 12;
    payments = [{ label: basedOnHistory ? tr('Promedio mensual real') : tr('Estimado mensual'), gross: avg, deductions: 0, net: avg }];
    annualGross = avg * 12;
    annualNet = avg * 12;
  }

  let decimoGross = 0;
  let decimoNet = 0;
  if (c.includeDecimo && c.frequency !== 'variable' && c.frequency !== 'other') {
    decimoGross = Math.round(annualGross / 12);
    decimoNet = decimoGross - applyDeductions(decimoGross, ded, true);
  }

  return {
    paymentsPerYear: perYear,
    payments,
    monthlyGross: Math.round(annualGross / 12),
    monthlyNet: Math.round(annualNet / 12),
    annualGross: annualGross + decimoGross,
    annualNet: annualNet + decimoNet,
    decimoGross,
    decimoNet,
    basedOnHistory,
  };
}

export interface PayOccurrence {
  /** Stable key used to match a real received transaction (e.g. 2026-11-Q1). */
  periodKey: string;
  nominalDate: ISODate;
  /** Actual expected date (after business-day adjustment). */
  date: ISODate;
  label: string;
  gross: number;
  net: number;
  kind: 'salary' | 'decimo';
}

/** Generate expected payments between `from` and `to` (inclusive). */
export function payOccurrences(c: IncomeConfig, from: ISODate, to: ISODate): PayOccurrence[] {
  const est = estimateIncome(c);
  const out: PayOccurrence[] = [];
  const sched = scheduleOf(c);
  const adj = (s: ISODate) => (c.adjustBusinessDay ? previousBusinessDay(s) : s);
  const push = (periodKey: string, nominal: ISODate, label: string, p: PaymentBreakdown, kind: PayOccurrence['kind'] = 'salary') => {
    const date = adj(nominal);
    if (date >= from && date <= to) out.push({ periodKey, nominalDate: nominal, date, label, gross: p.gross, net: p.net, kind });
  };
  const start = fromISO(from);
  const end = fromISO(to);
  // iterate months with a one-month margin for business-day shifts
  const months: Array<[number, number]> = [];
  for (let y = start.getFullYear(), m = start.getMonth() - 1; y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth() + 1); m++) {
    if (m > 11) { m = 0; y++; }
    if (m < 0) { months.push([y - 1, 11]); continue; }
    months.push([y, m]);
  }

  if (sched === 'semimonthly') {
    const d1 = c.payDay1 ?? 15;
    const d2 = c.payDay2 ?? 30;
    for (const [y, m] of months) {
      const mk = `${y}-${String(m + 1).padStart(2, '0')}`;
      push(`${mk}-Q1`, toISO(clampedDate(y, m, d1)), tr('Primera quincena'), est.payments[0]);
      push(`${mk}-Q2`, toISO(clampedDate(y, m, d2)), tr('Segunda quincena'), est.payments[1] ?? est.payments[0]);
    }
  } else if (sched === 'monthly') {
    const d1 = c.payDay1 ?? 30;
    for (const [y, m] of months) {
      const mk = `${y}-${String(m + 1).padStart(2, '0')}`;
      push(mk, toISO(clampedDate(y, m, d1)), tr('Salario mensual'), est.payments[0]);
    }
  } else if (sched === 'weekly' || sched === 'biweekly') {
    const step = sched === 'weekly' ? 7 : 14;
    let cur: ISODate;
    if (sched === 'biweekly' && c.anchorDate) {
      cur = c.anchorDate;
      while (cur > addDays(from, -3)) cur = addDays(cur, -step);
    } else {
      const wd = c.weekday ?? 5;
      cur = addDays(from, -7);
      while (fromISO(cur).getDay() !== wd) cur = addDays(cur, 1);
    }
    for (let i = 0; i < 400 && cur <= addDays(to, 3); i++, cur = addDays(cur, step)) {
      push(cur, cur, sched === 'weekly' ? tr('Pago semanal') : tr('Pago bisemanal'), est.payments[0]);
    }
  }

  if (c.includeDecimo && est.decimoGross > 0) {
    const part: PaymentBreakdown = {
      label: tr('Décimo tercer mes'),
      gross: Math.round(est.decimoGross / 3),
      deductions: 0,
      net: Math.round(est.decimoNet / 3),
    };
    const years = new Set(months.map(([y]) => y));
    for (const y of years) {
      ([[3, 1], [7, 2], [11, 3]] as const).forEach(([m, n]) =>
        push(`${y}-D${n}`, toISO(new Date(y, m, 15)), tr('Décimo tercer mes ({n}/3)', { n }), part, 'decimo'),
      );
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.periodKey.localeCompare(b.periodKey));
}

/** Next expected payment on or after `ref` that has not been received. */
export function nextPayment(c: IncomeConfig, ref: ISODate, receivedKeys: Set<string> = new Set()): PayOccurrence | null {
  const occ = payOccurrences(c, addDays(ref, -45), addDays(ref, 400));
  return occ.find((o) => o.date >= ref && !receivedKeys.has(o.periodKey)) ?? null;
}

/** Expected payments whose date has passed but were not registered as received. */
export function pendingPayments(c: IncomeConfig, since: ISODate, ref: ISODate, receivedKeys: Set<string>): PayOccurrence[] {
  return payOccurrences(c, since, ref).filter((o) => !receivedKeys.has(o.periodKey));
}
