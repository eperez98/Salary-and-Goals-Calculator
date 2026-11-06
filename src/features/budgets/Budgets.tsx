import { useState } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { useActor, useCan, useMutate, useProfile, useQuery, useScope } from '../../hooks/useDb';
import { listBudgets, upsertBudget, deleteBudget, type BudgetView } from '../../db/repo/planning';
import { listCategories } from '../../db/repo/finance';
import { Button, Card, EmptyState, Field, Modal, Money, MoneyInput, PageHeader, Select, Progress, Badge, Stat, useConfirm, IconButton, useMotionOK } from '../../components/ui';
import { IconTile } from '../../icons';
import { BUDGET_LEVEL_LABEL } from '../../domain/budget';
import { centsToInput, parseMoney, pct } from '../../lib/money';
import { addMonths, formatMonth, monthKey, today } from '../../lib/dates';
import { tr } from '../../lib/i18n';

const LEVEL_COLOR = { ok: 'var(--emerald)', notice: 'var(--blue)', warning: 'var(--amber)', exceeded: 'var(--coral)' } as const;
const LEVEL_TONE = { ok: 'green', notice: 'blue', warning: 'amber', exceeded: 'red' } as const;

export default function Budgets() {
  const profile = useProfile();
  const sf = useScope();
  const actor = useActor();
  const canManage = useCan('budget.manage');
  const mutate = useMutate();
  const confirm = useConfirm();
  const ok = useMotionOK();
  const [month, setMonth] = useState(monthKey(today()));
  const budgets = useQuery((e) => listBudgets(e, sf, month), [sf, month]);
  const cats = useQuery((e) => listCategories(e, 'expense').filter((c) => !c.parentId));
  const [edit, setEdit] = useState<{ open: boolean; b?: BudgetView }>({ open: false });
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const cur = profile.primaryCurrency;
  const assigned = budgets.reduce((a, b) => a + b.amount, 0);
  const used = budgets.reduce((a, b) => a + b.status.used, 0);

  const open = (b?: BudgetView) => { setCategoryId(b?.categoryId ?? cats.find((c) => !budgets.some((x) => x.categoryId === c.id))?.id ?? ''); setAmount(b ? centsToInput(b.amount) : ''); setEdit({ open: true, b }); };
  const save = () => {
    if (mutate((e, a) => upsertBudget(e, a, { categoryId, amount: parseMoney(amount), scope: sf.scope, memberId: sf.scope === 'personal' ? actor.id : null }), tr('Presupuesto guardado')) !== undefined) setEdit({ open: false });
  };

  return (
    <div>
      <PageHeader title={tr('Presupuestos')} subtitle={sf.scope === 'family' ? tr('Límites mensuales por categoría del hogar') : tr('Límites mensuales por categoría')} actions={<>
        <div className="flex items-center gap-1 rounded-full bg-surface border border-line px-1">
          <IconButton icon="chevronLeft" label={tr('Mes anterior')} size={32} onClick={() => setMonth(monthKey(addMonths(`${month}-01`, -1)))} />
          <span className="text-[13px] font-medium w-32 text-center">{formatMonth(month)}</span>
          <IconButton icon="chevronRight" label={tr('Mes siguiente')} size={32} onClick={() => setMonth(monthKey(addMonths(`${month}-01`, 1)))} />
        </div>
        {canManage && <Button icon="plus" onClick={() => open()}>{tr('Nuevo presupuesto')}</Button>}
      </>} />
      <div className="grid grid-cols-4 gap-5 mb-6">
        <Card className="p-5"><Stat label={tr('Asignado')} value={<Money animated cents={assigned} currency={cur} />} /></Card>
        <Card className="p-5" delay={0.04}><Stat label={tr('Utilizado')} value={<Money animated cents={used} currency={cur} />} /></Card>
        <Card className="p-5" delay={0.08}><Stat label={tr('Disponible')} value={<Money animated cents={assigned - used} currency={cur} className={assigned - used < 0 ? 'text-coral' : 'text-emerald'} />} /></Card>
        <Card className="p-5" delay={0.12}><Stat label={tr('Consumido')} value={`${pct(used, assigned).toFixed(0)} %`} sub={<Progress value={pct(used, assigned)} height={5} className="mt-2" color={pct(used, assigned) >= 90 ? 'var(--coral)' : 'var(--emerald)'} />} /></Card>
      </div>
      {budgets.length ? (
        <div className="grid grid-cols-3 gap-5">
          {budgets.map((b, i) => (
            <Card key={b.id} delay={i * 0.04} className={clsx('p-5', b.status.level === 'exceeded' && 'border-coral/40')} onClick={canManage ? () => open(b) : undefined} as={canManage ? 'button' : 'section'}>
              <div className="flex items-center gap-3">
                <IconTile name={b.icon} color={b.color} />
                <div className="flex-1 min-w-0"><p className="text-[14px] font-semibold truncate">{b.categoryName}</p><Badge tone={LEVEL_TONE[b.status.level]} className="!h-5 mt-0.5">{BUDGET_LEVEL_LABEL[b.status.level]}</Badge></div>
                <motion.span key={b.status.pct} initial={ok ? { scale: 1.3 } : false} animate={{ scale: 1 }} className="text-[20px] font-semibold num" style={{ color: LEVEL_COLOR[b.status.level] }}>{Math.round(b.status.pct)}%</motion.span>
              </div>
              <div className="relative mt-4">
                <Progress value={b.status.pct} color={LEVEL_COLOR[b.status.level]} height={10} delay={i * 0.05} />
                {[70, 90].map((t) => <span key={t} className="absolute top-0 h-[10px] w-px bg-surface" style={{ left: `${t}%` }} />)}
              </div>
              <div className="grid grid-cols-3 mt-3 text-[11.5px]">
                <div><p className="text-muted">{tr('Asignado')}</p><Money cents={b.amount} currency={cur} className="font-semibold" /></div>
                <div><p className="text-muted">{tr('Usado')}</p><Money cents={b.status.used} currency={cur} className="font-semibold" /></div>
                <div className="text-right"><p className="text-muted">{tr('Disponible')}</p><Money cents={b.status.available} currency={cur} className={clsx('font-semibold', b.status.available < 0 && 'text-coral')} /></div>
              </div>
            </Card>
          ))}
        </div>
      ) : <Card><EmptyState icon="budget" title={tr('Sin presupuestos')} body={tr('Define cuánto quieres gastar al mes en cada categoría. Te avisaremos al llegar al 70 %, 90 % y 100 %.')} action={canManage && <Button icon="plus" onClick={() => open()}>{tr('Crear presupuesto')}</Button>} /></Card>}
      <Modal open={edit.open} onClose={() => setEdit({ open: false })} title={edit.b ? tr('Presupuesto · {categoryName}', { categoryName: edit.b.categoryName }) : tr('Nuevo presupuesto mensual')} icon="budget" width={440}
        footer={<>{edit.b && <Button variant="ghost" icon="trash" className="mr-auto !text-coral" onClick={() => confirm.ask({ title: tr('¿Eliminar presupuesto?'), onConfirm: () => { mutate((e, a) => deleteBudget(e, a, edit.b!.id), tr('Presupuesto eliminado')); setEdit({ open: false }); } })}>{tr('Eliminar')}</Button>}<Button variant="ghost" onClick={() => setEdit({ open: false })}>{tr('Cancelar')}</Button><Button onClick={save}>{tr('Guardar')}</Button></>}>
        <div className="space-y-3">
          <Field label={tr('Categoría')}><Select value={categoryId} disabled={!!edit.b} onChange={(e) => setCategoryId(e.target.value)}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field label={tr('Límite mensual')} hint={tr('Se aplica cada mes e incluye sus subcategorías.')}><MoneyInput autoFocus currency={cur} value={amount} onChange={setAmount} aria-label={tr('Límite mensual')} /></Field>
        </div>
      </Modal>
      {confirm.node}
    </div>
  );
}
