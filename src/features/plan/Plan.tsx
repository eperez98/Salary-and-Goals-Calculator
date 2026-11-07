import { useCallback } from 'react';
import { Card, PageHeader } from '../../components/ui';
import { useActor, useCan, useMutate, useProfile, useQuery } from '../../hooks/useDb';
import { getExpensePlan, memberMonthlyIncome, saveExpensePlan } from '../../db/repo/planning';
import { ExpensePlanner } from './ExpensePlanner';
import type { PlanItem } from '../../domain/plan';
import { tr } from '../../lib/i18n';

export default function Plan() {
  const actor = useActor();
  const profile = useProfile();
  const canEdit = useCan('income.manage');
  const mutate = useMutate();
  const saved = useQuery((e) => getExpensePlan(e, actor.id), [actor.id]);
  const income = useQuery((e) => memberMonthlyIncome(e, actor.id), [actor.id]);
  const save = useCallback((items: PlanItem[]) => { if (canEdit) mutate((e, a) => saveExpensePlan(e, a, items), tr('Plan mensual guardado')); }, [canEdit, mutate]);
  return (
    <>
      <PageHeader title={tr('Plan mensual')} subtitle={tr('Tus gastos fijos frente a tu ingreso: cuánto te queda y cuánto puedes ahorrar')} />
      <Card hover={false} className="p-6 max-w-[760px]">
        <ExpensePlanner key={actor.id} income={income} currency={profile.primaryCurrency} initial={saved} startAtSummary={saved.length > 0} onFinish={save} />
      </Card>
    </>
  );
}
