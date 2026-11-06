import { useActor, useProfile, useQuery, useScope, useEngine } from '../../hooks/useDb';
import { expensesByCategory, monthlySummary, savingsProjection, alerts } from '../../db/repo/analytics';
import { listGoals, goalMonthlyPace, listIncomeSources, incomeSummary, listRecurring } from '../../db/repo/planning';
import { Card, CardHeader, Money, PageHeader, EstimateTag, Badge, Progress, EmptyState } from '../../components/ui';
import { AlertRow } from '../../components/layout/Notifications';
import { IconTile, Icon } from '../../icons';
import { monthsToGoal } from '../../domain/insights';
import { monthlyEquivalent, type RecurFrequency } from '../../domain/recurrence';
import { addMonths, formatMonth, lastMonths, monthKey, today, formatDate } from '../../lib/dates';
import { formatMoney, pct } from '../../lib/money';
import clsx from 'clsx';
import { tr } from '../../lib/i18n';

export default function Insights() {
  const profile = useProfile();
  const actor = useActor();
  const sf = useScope();
  const e = useEngine();
  const cur = profile.primaryCurrency;
  const thisM = monthKey(today());
  const prevM = lastMonths(2)[0];
  const summary = useQuery((en) => monthlySummary(en, sf, prevM), [sf]);
  const current = useQuery((en) => monthlySummary(en, sf, thisM), [sf]);
  const curCats = useQuery((en) => expensesByCategory(en, { from: `${thisM}-01`, to: `${thisM}-31` }, sf), [sf]);
  const prevCats = useQuery((en) => expensesByCategory(en, { from: `${prevM}-01`, to: `${prevM}-31` }, sf), [sf]);
  const proj = useQuery((en) => savingsProjection(en, sf), [sf]);
  const goals = useQuery((en) => listGoals(en, sf).filter((g) => !g.completedAt), [sf]);
  const al = useQuery((en) => alerts(en, sf).filter((a) => a.kind === 'insight' || a.kind === 'duplicate'), [sf]);
  const est = useQuery((en) => (sf.scope === 'personal' ? listIncomeSources(en, actor.id).reduce((a, s) => a + incomeSummary(en, s).estimate.monthlyNet, 0) : 0), [sf]);
  const committed = useQuery((en) => listRecurring(en, sf).filter((r) => r.kind === 'expense').reduce((a, r) => a + monthlyEquivalent(r.amount, r.frequency as RecurFrequency), 0), [sf]);

  const names = new Set([...curCats.map((c) => c.categoryId), ...prevCats.map((c) => c.categoryId)]);
  const habits = [...names].map((id) => {
    const c = curCats.find((x) => x.categoryId === id); const p = prevCats.find((x) => x.categoryId === id);
    return { id, name: c?.name ?? p?.name ?? '', icon: c?.icon ?? p?.icon ?? 'other', color: c?.color ?? p?.color ?? '#999', cur: c?.amount ?? 0, prev: p?.amount ?? 0 };
  }).sort((a, b) => b.cur - a.cur).slice(0, 8);

  return (
    <div>
      <PageHeader title={tr('Análisis inteligente')} subtitle={tr('Recomendaciones basadas solo en tus datos registrados')} />
      <div className="flex gap-3 mb-5 text-[12px] text-muted items-center"><EstimateTag estimated={false} />{' '}{tr('datos registrados')}{' '}<span className="mx-1">·</span> <EstimateTag />{' '}{tr('proyecciones y estimaciones')}</div>
      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-5 p-6 hero-surface !border-0 text-[#F5F3EE]">
          <div className="flex items-center justify-between"><p className="text-[12px] text-white/60">{tr('Resumen de')}{' '}{summary.label}</p><Badge tone="green" className="!bg-white/10 !text-[#7DF0BF]">{tr('Real')}</Badge></div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div><p className="text-[11px] text-white/55">{tr('Ingresos')}</p><Money cents={summary.income} currency={cur} className="text-[20px] font-semibold" /></div>
            <div><p className="text-[11px] text-white/55">{tr('Gastos')}</p><Money cents={summary.expense} currency={cur} className="text-[20px] font-semibold" /></div>
            <div><p className="text-[11px] text-white/55">{tr('Ahorro')}</p><Money cents={summary.net} currency={cur} sign className="text-[20px] font-semibold text-[#7DF0BF]" /></div>
            <div><p className="text-[11px] text-white/55">{tr('Tasa de ahorro')}</p><p className="text-[20px] font-semibold num">{summary.savingsRate.toFixed(1)} %</p></div>
          </div>
          <p className="text-[12.5px] text-white/70 mt-5 leading-relaxed">
            {summary.txCount === 0 ? tr('No hay movimientos registrados el mes pasado.') : <>{tr('Registraste')}{' '}{summary.txCount}{' '}{tr('movimientos.')}{' '}{summary.topCategory && <>{tr('Tu mayor gasto fue')}{' '}<b className="text-white">{summary.topCategory}</b>. </>}{summary.vsPrevExpensePct != null && <>{tr('Gastaste un')}{' '}{Math.abs(summary.vsPrevExpensePct).toFixed(0)} % {summary.vsPrevExpensePct > 0 ? tr('más') : 'menos'}{' '}{tr('que el mes anterior.')}</>}</>}
          </p>
        </Card>
        <Card className="col-span-7">
          <CardHeader title={tr('Proyección de ahorro')} subtitle={tr('Promedio de tus últimos 3 meses completos')} action={<EstimateTag />} />
          <div className="grid grid-cols-3 gap-4 p-5">
            <div><p className="text-[11.5px] text-muted">{tr('Ahorro mensual promedio')}</p><Money cents={proj.monthlyAverage} currency={cur} sign className={clsx('text-[22px] font-semibold', proj.monthlyAverage < 0 && 'text-coral')} /></div>
            <div><p className="text-[11.5px] text-muted">{tr('En 12 meses podrías tener')}</p><Money cents={proj.projected12} currency={cur} className="text-[22px] font-semibold text-emerald" /></div>
            <div><p className="text-[11.5px] text-muted">{tr('Hacia')}{' '}{formatDate(addMonths(today(), 12), 'short')}</p><p className="text-[13px] mt-1 text-ink-2">{proj.monthlyAverage > 0 ? tr('Mantén el ritmo para llegar.') : tr('Reduce gastos variables para generar ahorro.')}</p></div>
          </div>
          {est > 0 && (
            <div className="mx-5 mb-5 rounded-[16px] bg-surface-2 p-4 text-[12.5px] text-ink-2 grid grid-cols-3 gap-3">
              <div><p className="text-muted text-[11px]">{tr('Ingreso estimado')}</p><Money cents={est} currency={cur} className="font-semibold" /></div>
              <div><p className="text-muted text-[11px]">{tr('Pagos recurrentes')}</p><Money cents={committed} currency={cur} className="font-semibold" /></div>
              <div><p className="text-muted text-[11px]">{tr('Margen mensual libre')}</p><Money cents={est - committed} currency={cur} className="font-semibold text-emerald" /></div>
            </div>
          )}
        </Card>
        <Card className="col-span-7">
          <CardHeader title={tr('Hábitos de consumo')} subtitle={tr('{v0} (en curso) vs. {v1}', { v0: formatMonth(thisM), v1: formatMonth(prevM) })} action={<EstimateTag estimated={false} />} />
          <div className="p-3">
            {habits.map((h) => {
              const d = h.prev ? ((h.cur - h.prev) / h.prev) * 100 : null;
              const max = Math.max(...habits.map((x) => Math.max(x.cur, x.prev)), 1);
              return (
                <div key={h.id} className="flex items-center gap-3 px-2 py-2">
                  <IconTile name={h.icon} color={h.color} size={34} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-[12.5px]"><span className="font-medium truncate">{h.name}</span><span className="num"><Money cents={h.cur} currency={cur} className="font-semibold" /> <span className="text-muted">/ {formatMoney(h.prev, cur)}</span></span></div>
                    <div className="relative mt-1.5"><Progress value={pct(h.prev, max)} color="var(--sage)" height={5} /><div className="absolute inset-0"><Progress value={pct(h.cur, max)} color={h.color} height={5} track="transparent" /></div></div>
                  </div>
                  <span className={clsx('w-14 text-right text-[11.5px] font-semibold', d == null ? 'text-muted' : d > 0 ? 'text-coral' : 'text-emerald')}>{d == null ? 'nuevo' : `${d > 0 ? '+' : ''}${d.toFixed(0)}%`}</span>
                </div>
              );
            })}
            {!habits.length && <EmptyState icon="insights" title={tr('Aún no hay suficientes datos')} body={tr('Con unos días de movimientos podremos comparar tus hábitos mes a mes.')} />}
          </div>
        </Card>
        <div className="col-span-5 space-y-5">
          <Card>
            <CardHeader title={tr('Categorías con gasto elevado y duplicados')} />
            <div className="p-2">{al.map((a) => <AlertRow key={a.key} a={a} />)}{!al.length && <p className="text-[12.5px] text-muted px-3 py-4 flex items-center gap-2"><Icon name="check" size={16} className="text-emerald" />{tr('Sin anomalías detectadas.')}</p>}</div>
          </Card>
          <Card>
            <CardHeader title={tr('Proyección de objetivos')} action={<EstimateTag />} />
            <div className="p-5 pt-3 space-y-3">
              {goals.map((g) => { const pace = goalMonthlyPace(e, g.id); const m = monthsToGoal(g.target - g.saved, pace); return (
                <div key={g.id} className="text-[12.5px]"><div className="flex justify-between"><span className="font-medium">{g.name}</span><span className="text-muted">{pace > 0 && Number.isFinite(m) ? `≈ ${formatMonth(monthKey(addMonths(today(), m)))}` : tr('sin aportes recientes')}</span></div><Progress value={pct(g.saved, g.target)} color={g.color} className="mt-1" height={5} /></div>
              ); })}
              {!goals.length && <p className="text-[12.5px] text-muted">{tr('Sin objetivos activos.')}</p>}
            </div>
          </Card>
          <Card className="p-5"><p className="text-[12px] text-muted">{tr('Este mes')}</p><p className="text-[14px] mt-1">{tr('Llevas')}{' '}<Money cents={current.expense} currency={cur} className="font-semibold" />{' '}{tr('en gastos y')}{' '}<Money cents={current.income} currency={cur} className="font-semibold" />{' '}{tr('en ingresos registrados.')}</p></Card>
        </div>
      </div>
    </div>
  );
}
