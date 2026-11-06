
import { tr } from './i18n';import { lang } from './i18n';

/** Date helpers working with local ISO dates (YYYY-MM-DD) to avoid TZ drift. */
export type ISODate = string;

export function toISO(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export const today = (): ISODate => toISO(new Date());

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/** Build a date clamping the day to the month length (e.g. 30 Feb -> 28/29 Feb). */
export function clampedDate(year: number, month0: number, day: number): Date {
  return new Date(year, month0, Math.min(day, daysInMonth(year, month0)));
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  const target = clampedDate(d.getFullYear(), d.getMonth() + n, d.getDate());
  return toISO(target);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86_400_000);
}

export const monthKey = (s: ISODate): string => s.slice(0, 7);

export function startOfMonth(s: ISODate): ISODate { return `${s.slice(0, 7)}-01`; }
export function endOfMonth(s: ISODate): ISODate {
  const d = fromISO(s);
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** Move a date to the previous business day if it falls on a weekend. */
export function previousBusinessDay(s: ISODate): ISODate {
  const d = fromISO(s);
  const wd = d.getDay();
  if (wd === 6) return addDays(s, -1);
  if (wd === 0) return addDays(s, -2);
  return s;
}

const NAMES = {
  es: {
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    monthsShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    weekdays: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    weekdaysShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  },
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
}[lang];
const MONTHS = NAMES.months;
const MONTHS_SHORT = NAMES.monthsShort;

export const monthName = (m0: number) => MONTHS[m0];
export const monthShort = (m0: number) => MONTHS_SHORT[m0];
export const weekdayName = (w: number) => NAMES.weekdays[w];
export const weekdayShort = (w: number) => NAMES.weekdaysShort[w];

export function formatDate(s: ISODate, style: 'short' | 'long' | 'day' = 'short'): string {
  if (!s) return '';
  const d = fromISO(s);
  if (style === 'day') return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  if (style === 'long') return lang === 'en' ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonth(key: string, withYear = true): string {
  const [y, m] = key.split('-').map(Number);
  const name = MONTHS[m - 1];
  return withYear ? `${name[0].toUpperCase()}${name.slice(1)} ${y}` : name;
}

export type PeriodKind = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
export interface Range { from: ISODate; to: ISODate }

/** Range for a period containing `ref`. Weeks start on Monday. */
export function periodRange(kind: PeriodKind, ref: ISODate = today(), custom?: Range): Range {
  const d = fromISO(ref);
  switch (kind) {
    case 'day': return { from: ref, to: ref };
    case 'week': {
      const wd = (d.getDay() + 6) % 7;
      const from = addDays(ref, -wd);
      return { from, to: addDays(from, 6) };
    }
    case 'month': return { from: startOfMonth(ref), to: endOfMonth(ref) };
    case 'quarter': {
      const q0 = Math.floor(d.getMonth() / 3) * 3;
      return { from: toISO(new Date(d.getFullYear(), q0, 1)), to: toISO(new Date(d.getFullYear(), q0 + 3, 0)) };
    }
    case 'year': return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` };
    case 'custom': return custom ?? { from: startOfMonth(ref), to: endOfMonth(ref) };
  }
}

/** The equivalent previous range (same length, immediately before). */
export function previousRange(kind: PeriodKind, r: Range): Range {
  switch (kind) {
    case 'month': { const p = addMonths(r.from, -1); return { from: startOfMonth(p), to: endOfMonth(p) }; }
    case 'quarter': { const p = addMonths(r.from, -3); return { from: p, to: addDays(r.from, -1) }; }
    case 'year': { const y = Number(r.from.slice(0, 4)) - 1; return { from: `${y}-01-01`, to: `${y}-12-31` }; }
    default: {
      const len = diffDays(r.to, r.from) + 1;
      return { from: addDays(r.from, -len), to: addDays(r.from, -1) };
    }
  }
}

/** Last `n` month keys ending with the month of `ref` (oldest first). */
export function lastMonths(n: number, ref: ISODate = today()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(monthKey(addMonths(startOfMonth(ref), -i)));
  return out;
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return tr('Buenos días');
  if (h < 19) return tr('Buenas tardes');
  return tr('Buenas noches');
}
