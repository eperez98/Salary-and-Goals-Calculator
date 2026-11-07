import { describe, expect, it } from 'vitest';
import { planSummary } from './plan';

describe('planSummary', () => {
  it('subtracts expenses from income and reports what can be saved', () => {
    const s = planSummary(300000, [{ name: 'Alquiler', amount: 90000 }, { name: 'Comida', amount: 60000 }]);
    expect(s).toEqual({ income: 300000, expenses: 150000, remaining: 150000, canSave: 150000, savingsRate: 50 });
  });

  it('reports a deficit with nothing to save', () => {
    const s = planSummary(100000, [{ name: 'Alquiler', amount: 120000 }]);
    expect(s.remaining).toBe(-20000);
    expect(s.canSave).toBe(0);
    expect(s.savingsRate).toBe(0);
  });

  it('ignores negative amounts and handles no income', () => {
    expect(planSummary(0, [{ name: 'x', amount: -500 }])).toMatchObject({ expenses: 0, remaining: 0, canSave: 0, savingsRate: 0 });
  });
});
