
import { tr } from './i18n';/**
 * Money helpers. All amounts are stored as integer cents to avoid floating
 * point errors. PAB (Balboa) and USD trade at a fixed 1:1 parity, but the
 * currency code is always preserved so both can be displayed separately.
 */
export type Currency = 'PAB' | 'USD';

export const CURRENCIES: Record<Currency, { code: Currency; symbol: string; name: string; country: string }> = {
  PAB: { code: 'PAB', symbol: 'B/.', name: tr('Balboa'), country: tr('Panamá') },
  USD: { code: 'USD', symbol: '$', name: tr('Dólar estadounidense'), country: tr('Estados Unidos') },
};

/** Fixed parity PAB:USD = 1:1 (Panamanian monetary system). */
export const PARITY: Record<Currency, number> = { PAB: 1, USD: 1 };

const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatMoney(cents: number, currency: Currency = 'PAB', opts: { compact?: boolean; sign?: boolean } = {}): string {
  const sym = CURRENCIES[currency]?.symbol ?? currency;
  const neg = cents < 0;
  const abs = Math.abs(cents) / 100;
  const body = opts.compact && abs >= 10000 ? compact(abs) : opts.compact && Number.isInteger(abs) ? nf0.format(abs) : nf.format(abs);
  const sep = currency === 'PAB' ? ' ' : '';
  const sign = neg ? '−' : opts.sign && cents > 0 ? '+' : '';
  return `${sign}${sym}${sep}${body}`;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

/** Parse user input like "1,500.50", "B/. 20", "$3" into cents. Returns NaN if invalid. */
export function parseMoney(input: string | number): number {
  if (typeof input === 'number') return Math.round(input * 100);
  const cleaned = input.replace(/B\/\.|\$|PAB|USD|\s|,/gi, '').trim();
  if (cleaned === '' || !/^-?\d*(\.\d{0,2})?$/.test(cleaned) || cleaned === '-' || cleaned === '.') return NaN;
  return Math.round(parseFloat(cleaned) * 100);
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Convert between currencies using the fixed parity. */
export function convert(cents: number, from: Currency, to: Currency): number {
  return Math.round((cents * PARITY[from]) / PARITY[to]);
}

export interface CurrencyTotals { PAB: number; USD: number }
export const zeroTotals = (): CurrencyTotals => ({ PAB: 0, USD: 0 });

/** Combined total expressed in `display` currency (1:1 parity). */
export function combined(t: CurrencyTotals, display: Currency = 'PAB'): number {
  return convert(t.PAB, 'PAB', display) + convert(t.USD, 'USD', display);
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}
