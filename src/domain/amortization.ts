/** Loan maths (French / constant-installment amortization). Amounts in cents. */
import { addMonths, type ISODate } from '../lib/dates';

export function monthlyPayment(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) return principal;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return Math.round(principal / months);
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
}

export interface AmortRow { n: number; date: ISODate; payment: number; interest: number; principal: number; balance: number }

export function amortizationSchedule(principal: number, annualRatePct: number, months: number, firstDate: ISODate): AmortRow[] {
  const r = annualRatePct / 100 / 12;
  const pay = monthlyPayment(principal, annualRatePct, months);
  const rows: AmortRow[] = [];
  let bal = principal;
  for (let n = 1; n <= months && bal > 0; n++) {
    const interest = Math.round(bal * r);
    let princ = pay - interest;
    if (n === months || princ > bal) princ = bal;
    bal -= princ;
    rows.push({ n, date: addMonths(firstDate, n - 1), payment: princ + interest, interest, principal: princ, balance: bal });
  }
  return rows;
}

export interface PaymentRecord { date: ISODate; amount: number }
export interface DebtStatus {
  balance: number;
  paidPrincipal: number;
  paidInterest: number;
  paidTotal: number;
  payments: Array<PaymentRecord & { interest: number; principal: number; balance: number }>;
  progressPct: number;
}

/**
 * Apply real payments to a loan: each payment first covers the interest
 * accrued for one month on the outstanding balance, the rest reduces principal.
 */
export function applyPayments(principal: number, annualRatePct: number, payments: PaymentRecord[]): DebtStatus {
  const r = annualRatePct / 100 / 12;
  let bal = principal;
  let pp = 0;
  let pi = 0;
  const out: DebtStatus['payments'] = [];
  for (const p of [...payments].sort((a, b) => a.date.localeCompare(b.date))) {
    const interest = Math.min(Math.round(bal * r), p.amount);
    const princ = Math.min(p.amount - interest, bal);
    bal -= princ;
    pp += princ;
    pi += interest;
    out.push({ ...p, interest, principal: princ, balance: bal });
  }
  return { balance: bal, paidPrincipal: pp, paidInterest: pi, paidTotal: pp + pi, payments: out, progressPct: principal ? (pp / principal) * 100 : 0 };
}

export function totalInterest(principal: number, annualRatePct: number, months: number): number {
  return amortizationSchedule(principal, annualRatePct, months, '2000-01-01').reduce((a, r) => a + r.interest, 0);
}

/** Months to pay off a balance with a fixed monthly payment (Infinity if never). */
export function monthsToPayoff(balance: number, annualRatePct: number, payment: number): number {
  const r = annualRatePct / 100 / 12;
  if (payment <= 0) return Infinity;
  if (r === 0) return Math.ceil(balance / payment);
  if (payment <= balance * r) return Infinity;
  return Math.ceil(-Math.log(1 - (r * balance) / payment) / Math.log(1 + r));
}
