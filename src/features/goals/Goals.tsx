import { useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { useApp } from '../../store/app';
import { useCan, useMutate, useProfile, useQuery, useScope, useEngine } from '../../hooks/useDb';
import { listGoals, createGoal, updateGoal, deleteGoal, contributeToGoal, listContributions, goalMonthlyPace, GOAL_KIND_LABEL } from '../../db/repo/planning';
import { Button, Card, EmptyState, Field, Input, Modal, Money, MoneyInput, PageHeader, Select, Badge, useConfirm, EstimateTag, Stat, useMotionOK } from '../../components/ui';
import { Icon } from '../../icons';
import { monthsToGoal } from '../../domain/insights';
import { centsToInput, formatMoney, parseMoney, pct, type Currency } from '../../lib/money';
import { addMonths, diffDays, formatDate, today } from '../../lib/dates';
import type { Goal, GoalKind } from '../../db/types';
import { tr } from '../../lib/i18n';

const KIND_ICON: Record<GoalKind, string> = { emergency: 'emergency', vehicle: 'vehicle', home: 'home', vacation: 'vacation', education: 'education', other: 'goal' };
const COLORS = ['#1FA971', '#1F4B39', '#3C6E9E', '#8A5CA8', '#C2643E', '#B88A2B', '#2F8A84'];

function Ring({ value, color, size = 120 }: { value: number; color: string; size?: number }) {
  const ok = useMotionOK();
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const v = Math.min(100, Math.max(0, value));
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth={10} fill="none" />
      <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={c}
        initial={ok ? { strokeDashoffset: c } : false} animate={{ strokeDashoffset: c - (v / 100) * c }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }} />
    </svg>
  );
}

export function celebrate() {
  if (useApp.getState().reducedMotion) return;
  const end = Date.now() + 900;
  const colors = ['#2FBF85', '#12291F', '#A8C2A3', '#C98A1E', '#ffffff'];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export default function Goals() {
  const profile = useProfile();
  const sf = useScope();
  const e = useEngine();
  const canManage = useCan('goal.manage');
  const canContribute = useCan('goal.contribute');
  const mutate = useMutate();
  const confirm = useConfirm();
  const goals = useQuery((en) => listGoals(en, sf), [sf]);
  const [form, setForm] = useState<{ open: boolean; g?: Goal }>({ open: false });
  const [contrib, setContrib] = useState<Goal | null>(null);
  const [detail, setDetail] = useState<Goal | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<GoalKind>('emergency');
  const [target, setTarget] = useState('');
  const [currency, setCurrency] = useState<Currency>(profile.primaryCurrency);
  const [date, setDate] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [amt, setAmt] = useState('');
  const [withdraw, setWithdraw] = useState(false);
  const contributions = useQuery((en) => (detail ? listContributions(en, detail.id) : []), [detail?.id]);
  const totalTarget = goals.reduce((a, g) => a + g.target, 0);
  const totalSaved = goals.reduce((a, g) => a + g.saved, 0);

  const openForm = (g?: Goal) => { setName(g?.name ?? ''); setKind(g?.kind ?? 'emergency'); setTarget(g ? centsToInput(g.target) : ''); setCurrency(g?.currency ?? profile.primaryCurrency); setDate(g?.targetDate ?? addMonths(today(), 12)); setColor(g?.color ?? COLORS[goals.length % COLORS.length]); setForm({ open: true, g }); };
  const saveGoal = () => {
    const input = { name: name || GOAL_KIND_LABEL[kind], kind, target: parseMoney(target), currency, targetDate: date || null, color, scope: sf.scope };
    if (mutate((en, a) => (form.g ? updateGoal(en, a, form.g.id, input) : createGoal(en, a, input)), form.g ? tr('Objetivo actualizado') : tr('Objetivo creado')) !== undefined) setForm({ open: false });
  };
  const saveContrib = () => {
    const g = contrib!;
    const v = parseMoney(amt);
    const done = mutate((en, a) => contributeToGoal(en, a, g.id, withdraw ? -v : v));
    if (done === undefined) return;
    if (done) { celebrate(); useApp.getState().toast({ kind: 'celebrate', title: tr('¡Objetivo cumplido: {name}!', { name: g.name }), body: tr('Alcanzaste {v0}. ¡Felicidades!', { v0: formatMoney(g.target, g.currency) }) }); }
    else useApp.getState().toast({ kind: 'success', title: withdraw ? tr('Retiro registrado') : tr('Aportación registrada'), body: `${formatMoney(v, g.currency)} · ${g.name}` });
    setContrib(null);
  };

  return (
    <div>
      <PageHeader title={tr('Objetivos de ahorro')} subtitle={tr('Metas claras, progreso visible')} actions={canManage && <Button icon="plus" onClick={() => openForm()}>{tr('Nuevo objetivo')}</Button>} />
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-5 mb-6">
          <Card className="p-5"><Stat label={tr('Ahorrado en objetivos')} value={<Money animated cents={totalSaved} currency={profile.primaryCurrency} className="text-emerald" />} /></Card>
          <Card className="p-5" delay={0.04}><Stat label={tr('Meta total')} value={<Money animated cents={totalTarget} currency={profile.primaryCurrency} />} /></Card>
          <Card className="p-5" delay={0.08}><Stat label={tr('Completados')} value={`${goals.filter((g) => g.completedAt).length} de ${goals.length}`} /></Card>
        </div>
      )}
      {goals.length ? (
        <div className="grid grid-cols-3 gap-5">
          {goals.map((g, i) => {
            const p = pct(g.saved, g.target);
            const pace = goalMonthlyPace(e, g.id);
            const months = monthsToGoal(g.target - g.saved, pace);
            const daysLeft = g.targetDate ? diffDays(g.targetDate, today()) : null;
            const needed = g.targetDate && daysLeft && daysLeft > 0 ? Math.ceil((g.target - g.saved) / Math.max(1, daysLeft / 30.4)) : null;
            return (
              <Card key={g.id} delay={i * 0.05} className="p-5 relative overflow-hidden">
                {g.completedAt && <div className="absolute top-4 right-4"><Badge tone="green"><Icon name="check" size={12} strokeWidth={2.4} />{tr('Cumplido')}</Badge></div>}
                <div className="flex items-center gap-4">
                  <div className="relative"><Ring value={p} color={g.color} size={104} /><span className="absolute inset-0 grid place-items-center"><span className="text-center"><Icon name={KIND_ICON[g.kind]} size={20} active className="mx-auto" style={{ color: g.color }} /><span className="block text-[15px] font-semibold num mt-0.5">{p.toFixed(0)}%</span></span></span></div>
                  <div className="min-w-0">
                    <p className="text-[11.5px] text-muted">{GOAL_KIND_LABEL[g.kind]}</p>
                    <p className="text-[16px] font-semibold tracking-[-0.02em] truncate">{g.name}</p>
                    <Money animated cents={g.saved} currency={g.currency} className="text-[20px] font-semibold block mt-1" />
                    <p className="text-[11.5px] text-muted">{tr('de')}{' '}<Money cents={g.target} currency={g.currency} /></p>
                  </div>
                </div>
                <div className="mt-4 rounded-[14px] bg-surface-2 px-3 py-2.5 text-[11.5px] text-ink-2 space-y-1">
                  {g.targetDate && <p className="flex justify-between"><span className="text-muted">{tr('Fecha objetivo')}</span><span>{formatDate(g.targetDate)}</span></p>}
                  {!g.completedAt && needed && needed > 0 && <p className="flex justify-between"><span className="text-muted">{tr('Necesitas al mes')}</span><Money cents={needed} currency={g.currency} className="font-semibold" /></p>}
                  {!g.completedAt && <p className="flex justify-between items-center"><span className="text-muted flex items-center gap-1">{tr('Al ritmo actual')}{' '}<EstimateTag /></span><span>{pace > 0 && Number.isFinite(months) ? `${months} meses` : tr('Sin aportes recientes')}</span></p>}
                </div>
                <div className="flex gap-2 mt-4">
                  {canContribute && <Button size="sm" icon="plus" className="flex-1" onClick={() => { setAmt(''); setWithdraw(false); setContrib(g); }}>{tr('Aportar')}</Button>}
                  <Button size="sm" variant="secondary" onClick={() => setDetail(g)}>{tr('Historial')}</Button>
                  {canManage && <Button size="sm" variant="ghost" icon="edit" onClick={() => openForm(g)} aria-label={tr('Editar')} />}
                </div>
              </Card>
            );
          })}
        </div>
      ) : <Card><EmptyState icon="goal" title={tr('Crea tu primer objetivo')} body={tr('Fondo de emergencia, vehículo, vivienda, vacaciones o educación. Registra aportaciones y mira tu progreso.')} action={canManage && <Button icon="plus" onClick={() => openForm()}>{tr('Nuevo objetivo')}</Button>} /></Card>}

      <Modal open={form.open} onClose={() => setForm({ open: false })} title={form.g ? tr('Editar objetivo') : tr('Nuevo objetivo')} icon="goal" width={520}
        footer={<>{form.g && <Button variant="ghost" icon="trash" className="mr-auto !text-coral" onClick={() => confirm.ask({ title: tr('¿Eliminar objetivo?'), body: tr('Se eliminará junto con su historial de aportaciones.'), onConfirm: () => { mutate((en, a) => deleteGoal(en, a, form.g!.id), tr('Objetivo eliminado')); setForm({ open: false }); } })}>{tr('Eliminar')}</Button>}<Button variant="ghost" onClick={() => setForm({ open: false })}>{tr('Cancelar')}</Button><Button onClick={saveGoal}>{tr('Guardar')}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('Tipo')}><Select value={kind} onChange={(ev) => setKind(ev.target.value as GoalKind)}>{Object.entries(GOAL_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label={tr('Nombre')}><Input value={name} onChange={(ev) => setName(ev.target.value)} placeholder={GOAL_KIND_LABEL[kind]} /></Field>
          <Field label={tr('Meta')}><MoneyInput autoFocus currency={currency} value={target} onChange={setTarget} aria-label={tr('Meta')} /></Field>
          <Field label={tr('Moneda')}><Select value={currency} onChange={(ev) => setCurrency(ev.target.value as Currency)}><option value="PAB">{tr('PAB')}</option><option value="USD">{tr('USD')}</option></Select></Field>
          <Field label={tr('Fecha objetivo')} className="col-span-2"><Input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} /></Field>
          <div className="col-span-2 flex gap-2">{COLORS.map((c) => <button key={c} type="button" onClick={() => setColor(c)} className={`size-8 rounded-full ${color === c ? 'ring-4 ring-emerald/30 scale-110' : ''}`} style={{ background: c }} aria-label={c} />)}</div>
        </div>
      </Modal>
      <Modal open={!!contrib} onClose={() => setContrib(null)} title={contrib ? `${withdraw ? tr('Retirar de') : tr('Aportar a')} ${contrib.name}` : ''} icon="savings" width={420}
        footer={<><Button variant="ghost" onClick={() => setContrib(null)}>{tr('Cancelar')}</Button><Button variant={withdraw ? 'danger' : 'emerald'} onClick={saveContrib}>{withdraw ? tr('Retirar') : tr('Aportar')}</Button></>}>
        <div className="space-y-3">
          <div className="flex gap-2"><Button size="sm" variant={!withdraw ? 'primary' : 'secondary'} onClick={() => setWithdraw(false)}>{tr('Aportación')}</Button><Button size="sm" variant={withdraw ? 'primary' : 'secondary'} onClick={() => setWithdraw(true)}>{tr('Retiro')}</Button></div>
          <Field label={tr('Importe')}><MoneyInput autoFocus currency={contrib?.currency} value={amt} onChange={setAmt} aria-label={tr('Importe')} /></Field>
          {contrib && <p className="text-[12px] text-muted">{tr('Te faltan')}{' '}<Money cents={Math.max(0, contrib.target - contrib.saved)} currency={contrib.currency} className="font-semibold text-ink-2" />{' '}{tr('para completar el objetivo.')}</p>}
        </div>
      </Modal>
      <Modal open={!!detail} onClose={() => setDetail(null)} title={tr('Aportaciones · {v0}', { v0: detail?.name ?? '' })} icon="savings" width={480}>
        <ul className="divide-y divide-line/60 pb-3">
          {contributions.map((c) => <li key={c.id} className="flex justify-between py-2.5 text-[13px]"><span className="text-ink-2">{formatDate(c.date)}</span><Money cents={c.amount} currency={detail!.currency} sign className={c.amount < 0 ? 'text-coral font-semibold' : 'text-emerald font-semibold'} /></li>)}
          {!contributions.length && <p className="text-[12.5px] text-muted py-6 text-center">{tr('Aún no hay aportaciones.')}</p>}
        </ul>
      </Modal>
      {confirm.node}
    </div>
  );
}
