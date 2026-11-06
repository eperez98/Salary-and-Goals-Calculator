import { describe, expect, it } from 'vitest';
import { estimateIncome, nextPayment, payOccurrences, pendingPayments, PANAMA_DEDUCTIONS, applyDeductions } from './salary';

describe('estimateIncome — quincenal', () => {
  it('B/. 1,500 per quincena → 3,000 monthly and 36,000 yearly', () => {
    const e = estimateIncome({ frequency: 'semimonthly', amount1: 150000, sameAmount: true });
    expect(e.payments.map((p) => p.gross)).toEqual([150000, 150000]);
    expect(e.monthlyGross).toBe(300000);
    expect(e.annualGross).toBe(3600000);
    expect(e.paymentsPerYear).toBe(24);
  });

  it('supports different amounts for each quincena', () => {
    const e = estimateIncome({ frequency: 'semimonthly', amount1: 150000, amount2: 120000, sameAmount: false });
    expect(e.payments[1].gross).toBe(120000);
    expect(e.monthlyGross).toBe(270000);
    expect(e.annualGross).toBe(3240000);
  });

  it('applies Panamanian deductions (CSS 9.75 % + SE 1.25 %)', () => {
    const e = estimateIncome({ frequency: 'semimonthly', amount1: 100000, sameAmount: true, deductions: PANAMA_DEDUCTIONS });
    expect(e.payments[0].deductions).toBe(11000);
    expect(e.payments[0].net).toBe(89000);
    expect(e.monthlyNet).toBe(178000);
  });

  it('estimates décimo tercer mes (1/12 of yearly salary, CSS 7.25 %)', () => {
    const e = estimateIncome({ frequency: 'semimonthly', amount1: 150000, sameAmount: true, includeDecimo: true, deductions: PANAMA_DEDUCTIONS });
    expect(e.decimoGross).toBe(300000);
    expect(e.decimoNet).toBe(300000 - 21750);
    expect(e.annualGross).toBe(3600000 + 300000);
  });
});

describe('estimateIncome — other frequencies', () => {
  it('weekly ×52', () => {
    const e = estimateIncome({ frequency: 'weekly', amount1: 50000 });
    expect(e.annualGross).toBe(2600000);
    expect(e.monthlyGross).toBe(Math.round(2600000 / 12));
  });
  it('biweekly ×26', () => expect(estimateIncome({ frequency: 'biweekly', amount1: 100000 }).annualGross).toBe(2600000));
  it('monthly ×12', () => expect(estimateIncome({ frequency: 'monthly', amount1: 250000 }).annualGross).toBe(3000000));
  it('hourly: rate × hours × 52', () => {
    const e = estimateIncome({ frequency: 'hourly', amount1: 0, hourlyRate: 1000, hoursPerWeek: 40, schedule: 'semimonthly' });
    expect(e.annualGross).toBe(2080000);
    expect(e.payments[0].gross).toBe(Math.round(2080000 / 24));
  });
  it('variable income averages real history', () => {
    const e = estimateIncome({ frequency: 'variable', amount1: 0 }, [100000, 200000, 0, 300000]);
    expect(e.basedOnHistory).toBe(true);
    expect(e.monthlyNet).toBe(200000);
  });
  it('deductions never exceed gross', () => expect(applyDeductions(1000, [{ name: 'x', type: 'fixed', value: 5000 }])).toBe(1000));
});

describe('pay schedule', () => {
  const cfg = { frequency: 'semimonthly' as const, amount1: 150000, sameAmount: true, payDay1: 15, payDay2: 30 };

  it('generates both quincenas per month and clamps February', () => {
    const occ = payOccurrences(cfg, '2026-02-01', '2026-03-31');
    expect(occ.map((o) => o.date)).toEqual(['2026-02-15', '2026-02-28', '2026-03-15', '2026-03-30']);
    expect(occ[0].periodKey).toBe('2026-02-Q1');
  });

  it('moves weekend pay dates to the previous business day when enabled', () => {
    // 15 Nov 2026 is a Sunday
    const occ = payOccurrences({ ...cfg, adjustBusinessDay: true }, '2026-11-01', '2026-11-30');
    expect(occ[0].date).toBe('2026-11-13');
    expect(occ[0].nominalDate).toBe('2026-11-15');
  });

  it('next payment skips received periods and never marks future as received', () => {
    const n = nextPayment(cfg, '2026-11-06');
    expect(n?.date).toBe('2026-11-15');
    const pending = pendingPayments(cfg, '2026-10-01', '2026-11-06', new Set(['2026-10-Q1']));
    expect(pending.map((p) => p.periodKey)).toEqual(['2026-10-Q2']);
  });

  it('décimo installments on 15 Apr, Aug and Dec', () => {
    const occ = payOccurrences({ ...cfg, includeDecimo: true }, '2026-01-01', '2026-12-31').filter((o) => o.kind === 'decimo');
    expect(occ.map((o) => o.date)).toEqual(['2026-04-15', '2026-08-15', '2026-12-15']);
    expect(occ[0].gross).toBe(100000);
  });

  it('weekly schedule on Fridays', () => {
    const occ = payOccurrences({ frequency: 'weekly', amount1: 1000, weekday: 5 }, '2026-11-01', '2026-11-30');
    expect(occ.map((o) => o.date)).toEqual(['2026-11-06', '2026-11-13', '2026-11-20', '2026-11-27']);
  });

  it('biweekly from anchor', () => {
    const occ = payOccurrences({ frequency: 'biweekly', amount1: 1000, anchorDate: '2026-11-06' }, '2026-11-01', '2026-12-31');
    expect(occ.map((o) => o.date)).toEqual(['2026-11-06', '2026-11-20', '2026-12-04', '2026-12-18']);
  });
});
