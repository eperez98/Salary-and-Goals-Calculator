/** Monthly expense plan: fixed monthly expenses vs. the member's net monthly income (all in cents). */
export interface PlanItem { name: string; amount: number }

export interface PlanSummary {
  income: number;
  expenses: number;
  /** Income left after expenses; negative means a monthly deficit. */
  remaining: number;
  /** What could go to savings each month (0 when there is no surplus). */
  canSave: number;
  /** Share of income that `canSave` represents (0-100). */
  savingsRate: number;
}

export function planSummary(income: number, items: PlanItem[]): PlanSummary {
  const expenses = items.reduce((a, i) => a + Math.max(0, i.amount), 0);
  const remaining = income - expenses;
  const canSave = Math.max(0, remaining);
  return { income, expenses, remaining, canSave, savingsRate: income > 0 ? (canSave / income) * 100 : 0 };
}
