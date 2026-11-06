
import { tr } from '../lib/i18n';export type BudgetLevel = 'ok' | 'notice' | 'warning' | 'exceeded';

export interface BudgetStatus { assigned: number; used: number; available: number; pct: number; level: BudgetLevel }

/** Thresholds: 70 % notice, 90 % warning, 100 % exceeded. */
export const BUDGET_THRESHOLDS = [70, 90, 100] as const;

export function budgetStatus(assigned: number, used: number): BudgetStatus {
  const pct = assigned > 0 ? (used / assigned) * 100 : used > 0 ? 100 : 0;
  const level: BudgetLevel = pct >= 100 ? 'exceeded' : pct >= 90 ? 'warning' : pct >= 70 ? 'notice' : 'ok';
  return { assigned, used, available: assigned - used, pct, level };
}

export const BUDGET_LEVEL_LABEL: Record<BudgetLevel, string> = {
  ok: tr('En control'),
  notice: tr('Alcanzó el 70 %'),
  warning: tr('Alcanzó el 90 %'),
  exceeded: tr('Presupuesto agotado'),
};
