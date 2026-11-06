import { useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { useActor, useCan, useEngine, useMutate, useProfile, useQuery } from '../../hooks/useDb';
import { listMembers, createMember, updateMember, removeMember, setMemberPin, listActivity, setProfile } from '../../db/repo/core';
import { familyBalances, createSettlement, listGoals } from '../../db/repo/planning';
import { totals, monthlySeries } from '../../db/repo/analytics';
import { Avatar, Button, Card, CardHeader, EmptyState, Field, Input, Modal, Money, PageHeader, Select, Stat, useConfirm, MoneyInput, Progress, useMotionOK } from '../../components/ui';
import { IncomeExpenseBars } from '../../components/charts';
import { Icon } from '../../icons';
import { ALL_ROLES, ROLE_DESCRIPTION, ROLE_LABEL, ROLE_MATRIX, type Role, type Action } from '../../domain/permissions';
import { formatMoney, parseMoney, pct } from '../../lib/money';
import { formatDate, periodRange, today } from '../../lib/dates';
import type { Member } from '../../db/types';
import { tr } from '../../lib/i18n';

const EMOJIS = ['', '👩', '👨', '👧', '👦', '👵', '👴', '🐶', '🐱', '⭐'];
const ACTION_LABEL: Partial<Record<Action, string>> = { 'tx.create': tr('Registrar movimientos'), 'tx.editAny': tr('Editar movimientos de otros'), 'account.manage': tr('Gestionar cuentas'), 'budget.manage': tr('Presupuestos'), 'goal.manage': tr('Gestionar objetivos'), 'goal.contribute': tr('Aportar a objetivos'), 'debt.manage': tr('Préstamos y deudas'), 'member.manage': tr('Integrantes y roles'), 'security.manage': tr('Seguridad'), 'backup.manage': tr('Copias de seguridad'), 'report.export': tr('Exportar informes') };

export default function Family() {
  const profile = useProfile();
  const actor = useActor();
  const canManage = useCan('member.manage');
  const canSettle = useCan('tx.create');
  const mutate = useMutate();
  const confirm = useConfirm();
  const ok = useMotionOK();
  const engine = useEngine();
  const members = useQuery((e) => listMembers(e));
  const fsf = { scope: 'family' as const, memberId: actor.id };
  const month = periodRange('month');
  const t = useQuery((e) => totals(e, month, fsf));
  const series = useQuery((e) => monthlySeries(e, 6, fsf));
  const bal = useQuery((e) => familyBalances(e));
  const goals = useQuery((e) => listGoals(e, fsf));
  const activity = useQuery((e) => listActivity(e, { scope: 'family', limit: 25 }));
  const byMember = useQuery((e) => e.all<{ member_id: string; amount: number }>("SELECT member_id, SUM(amount) AS amount FROM transactions WHERE scope='family' AND type IN ('expense','loan_payment') AND date BETWEEN ? AND ? GROUP BY member_id", [month.from, month.to]));
  const incomeByMember = useQuery((e) => e.all<{ member_id: string; amount: number }>("SELECT member_id, SUM(amount) AS amount FROM transactions WHERE scope='family' AND type = 'income' AND date BETWEEN ? AND ? GROUP BY member_id", [month.from, month.to]));
  const [form, setForm] = useState<{ open: boolean; m?: Member }>({ open: false });
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('adult');
  const [emoji, setEmoji] = useState('');
  const [pin, setPin] = useState('');
  const [settle, setSettle] = useState<{ fromId: string; toId: string; amount: string } | null>(null);
  const cur = profile.primaryCurrency;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '—';
  const colorOf = (id: string) => members.find((m) => m.id === id)?.color ?? '#999';

  const openForm = (m?: Member) => { setName(m?.name ?? ''); setRole(m?.role ?? 'adult'); setEmoji(m?.emoji ?? ''); setPin(''); setForm({ open: true, m }); };
  const save = async () => {
    const r = mutate((e, a) => (form.m ? (updateMember(e, a, form.m.id, { name, role, emoji: emoji || null }), form.m) : createMember(e, a, { name, role, emoji: emoji || null })), form.m ? tr('Integrante actualizado') : tr('Integrante añadido'));
    if (!r) return;
    if (pin) {
      try { await setMemberPin(engine, actor, r.id, pin); } catch (err) { return void mutate(() => { throw err; }); }
    }
    setForm({ open: false });
  };

  if (profile.mode === 'individual') {
    return (
      <Card><EmptyState icon="family" title={tr('Activa las finanzas familiares')} body={tr('Convierte tu perfil en pareja o familia para añadir integrantes, compartir gastos y ver el dashboard del hogar. Tus finanzas personales seguirán siendo privadas.')}
        action={canManage && <div className="flex gap-2"><Button variant="secondary" onClick={() => mutate((e) => setProfile(e, { mode: 'couple' }), tr('Modo pareja activado'))}>{tr('Pareja')}</Button><Button onClick={() => mutate((e) => setProfile(e, { mode: 'family' }), tr('Modo familia activado'))}>{tr('Familia')}</Button></div>} /></Card>
    );
  }

  const share = byMember.map((r) => ({ name: nameOf(r.member_id), value: r.amount, color: colorOf(r.member_id) }));

  return (
    <div>
      <PageHeader title={profile.householdName || tr('Mi hogar')} subtitle={tr('Finanzas compartidas, responsabilidades claras')} actions={canManage && <Button icon="plus" onClick={() => openForm()}>{tr('Añadir integrante')}</Button>} />
      <div className="grid grid-cols-4 gap-5 mb-5">
        <Card className="p-5"><Stat label={tr('Ingresos del hogar (mes)')} value={<Money animated cents={t.income} currency={cur} className="text-emerald" />} /></Card>
        <Card className="p-5" delay={0.04}><Stat label={tr('Gastos compartidos (mes)')} value={<Money animated cents={t.expense} currency={cur} />} /></Card>
        <Card className="p-5" delay={0.08}><Stat label={tr('Balance del hogar')} value={<Money animated cents={t.net} currency={cur} sign />} /></Card>
        <Card className="p-5" delay={0.12}><Stat label={tr('Integrantes')} value={members.length} sub={<span className="flex -space-x-2 mt-1">{members.map((m) => <Avatar key={m.id} name={m.name} color={m.color} emoji={m.emoji} size={24} />)}</span>} /></Card>
      </div>
      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-7" delay={0.1}><CardHeader title={tr('Ingresos y gastos del hogar')} subtitle={tr('Solo movimientos marcados como Hogar')} /><div className="px-3 pb-3"><IncomeExpenseBars data={series} currency={cur} height={200} /></div></Card>
        <Card className="col-span-5" delay={0.14}>
          <CardHeader title={tr('Distribución de responsabilidades')} subtitle={tr('Quién pagó los gastos compartidos este mes')} />
          {share.length ? (
            <div className="flex items-center gap-4 p-5">
              <div className="size-[150px]"><ResponsiveContainer><PieChart><Pie data={share} dataKey="value" innerRadius="62%" outerRadius="100%" paddingAngle={3} cornerRadius={6} stroke="none" isAnimationActive={ok}>{share.map((s, i) => <Cell key={i} fill={s.color} />)}</Pie><Tooltip formatter={(v) => formatMoney(Number(v), cur)} /></PieChart></ResponsiveContainer></div>
              <ul className="flex-1 space-y-2.5">{share.map((s) => <li key={s.name} className="text-[12.5px]"><div className="flex justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span><span className="font-semibold num">{pct(s.value, t.expense || 1).toFixed(0)}%</span></div><Progress value={pct(s.value, t.expense || 1)} color={s.color} height={4} className="mt-1" /></li>)}</ul>
            </div>
          ) : <EmptyState icon="handshake" title={tr('Sin gastos compartidos')} body={tr('Marca un gasto como “Hogar” para repartirlo entre los integrantes.')} />}
        </Card>
        <Card className="col-span-5" delay={0.18}>
          <CardHeader title={tr('Deudas entre integrantes')} subtitle={tr('Calculado a partir de los gastos repartidos')} />
          <div className="p-3 space-y-2">
            {bal.transfers.map((xfer, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[14px] bg-surface-2 px-3 py-2.5">
                <Avatar name={nameOf(xfer.fromId)} color={colorOf(xfer.fromId)} size={28} />
                <p className="flex-1 text-[12.5px]"><b>{nameOf(xfer.fromId)}</b>{' '}{tr('debe a')}{' '}<b>{nameOf(xfer.toId)}</b></p>
                <Money cents={xfer.amount} currency={cur} className="font-semibold text-[13px]" />
                {canSettle && <Button size="sm" variant="secondary" onClick={() => setSettle({ fromId: xfer.fromId, toId: xfer.toId, amount: (xfer.amount / 100).toFixed(2) })}>{tr('Saldar')}</Button>}
              </div>
            ))}
            {!bal.transfers.length && <div className="flex items-center gap-3 px-2 py-3"><span className="grid place-items-center size-9 rounded-full bg-emerald-soft text-emerald"><Icon name="check" size={16} strokeWidth={2.4} /></span><p className="text-[12.5px] text-muted">{tr('Están a mano. Nadie debe nada.')}</p></div>}
          </div>
        </Card>
        <Card className="col-span-7" delay={0.2}>
          <CardHeader title={tr('Integrantes y permisos')} />
          <div className="p-3 grid grid-cols-2 gap-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-[16px] border border-line/70 p-3">
                <Avatar name={m.name} color={m.color} emoji={m.emoji} size={38} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold truncate">{m.name} {m.id === actor.id && <span className="text-muted font-normal">{tr('(tú)')}</span>}</p>
                  <p className="text-[11.5px] text-muted">{ROLE_LABEL[m.role]}{m.isOwner ? ' · Titular' : ''}{m.hasPin ? ' · PIN' : ''}</p>
                  <p className="text-[11px] text-ink-2 mt-0.5">{tr('Aportó este mes:')}{' '}<Money cents={incomeByMember.find((x) => x.member_id === m.id)?.amount ?? 0} currency={cur} /></p>
                </div>
                {canManage && <Button size="sm" variant="ghost" icon="edit" onClick={() => openForm(m)} aria-label={tr('Editar {name}', { name: m.name })} />}
              </div>
            ))}
          </div>
          <div className="px-5 pb-5">
            <table className="w-full text-[11.5px]">
              <thead><tr className="text-muted"><th className="text-left font-medium py-1">{tr('Permiso')}</th>{ALL_ROLES.map((r) => <th key={r} className="font-medium">{ROLE_LABEL[r]}</th>)}</tr></thead>
              <tbody>{(Object.keys(ACTION_LABEL) as Action[]).map((a) => <tr key={a} className="border-t border-line/50"><td className="py-1.5 text-ink-2">{ACTION_LABEL[a]}</td>{ALL_ROLES.map((r) => <td key={r} className="text-center">{ROLE_MATRIX[r].includes(a) ? <Icon name="check" size={14} strokeWidth={2.4} className="inline text-emerald" /> : <span className="text-line">—</span>}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </Card>
        <Card className="col-span-5" delay={0.22}>
          <CardHeader title={tr('Objetivos del hogar')} />
          <div className="p-5 pt-3 space-y-3">
            {goals.map((g) => <div key={g.id}><div className="flex justify-between text-[12.5px]"><span>{g.name}</span><span className="text-muted num">{pct(g.saved, g.target).toFixed(0)}%</span></div><Progress value={pct(g.saved, g.target)} color={g.color} className="mt-1" /></div>)}
            {!goals.length && <p className="text-[12.5px] text-muted">{tr('Crea objetivos compartidos desde Objetivos con la vista “Hogar”.')}</p>}
          </div>
        </Card>
        <Card className="col-span-7" delay={0.24}>
          <CardHeader title={tr('Historial del hogar')} />
          <ul className="p-3 max-h-[300px] overflow-y-auto">
            {activity.map((a) => <li key={a.id} className="flex items-center gap-3 px-2 py-2 text-[12.5px]"><Avatar name={nameOf(a.memberId ?? '')} color={colorOf(a.memberId ?? '')} size={24} /><span className="flex-1 text-ink-2"><b className="text-ink">{nameOf(a.memberId ?? '')}</b> · {a.summary}</span><span className="text-muted text-[11px]">{formatDate(a.createdAt.slice(0, 10), 'day')}</span></li>)}
            {!activity.length && <p className="text-[12.5px] text-muted p-3">{tr('Sin actividad todavía.')}</p>}
          </ul>
        </Card>
      </div>

      <Modal open={form.open} onClose={() => setForm({ open: false })} title={form.m ? tr('Editar a {name}', { name: form.m.name }) : tr('Nuevo integrante')} icon="family" width={520}
        footer={<>{form.m && !form.m.isOwner && form.m.id !== actor.id && <Button variant="ghost" icon="trash" className="mr-auto !text-coral" onClick={() => confirm.ask({ title: tr('¿Retirar a {name}?', { name: form.m!.name }), body: tr('Sus movimientos se conservan en el historial.'), onConfirm: () => { mutate((e, a) => removeMember(e, a, form.m!.id), tr('Integrante retirado')); setForm({ open: false }); } })}>{tr('Retirar')}</Button>}<Button variant="ghost" onClick={() => setForm({ open: false })}>{tr('Cancelar')}</Button><Button onClick={() => void save()}>{tr('Guardar')}</Button></>}>
        <div className="space-y-3">
          <Field label={tr('Nombre')}><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label={tr('Rol')}><Select value={role} disabled={form.m?.isOwner} onChange={(e) => setRole(e.target.value as Role)}>{ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
          <p className="text-[12px] text-muted -mt-1">{ROLE_DESCRIPTION[role]}</p>
          <div><p className="text-[12px] font-medium text-ink-2 mb-1.5">{tr('Avatar')}</p><div className="flex gap-1.5">{EMOJIS.map((em) => <button key={em || 'none'} type="button" onClick={() => setEmoji(em)} className={`grid place-items-center size-9 rounded-full border text-[16px] ${emoji === em ? 'border-emerald ring-4 ring-emerald/15' : 'border-line'}`}>{em || <Icon name="user" size={14} />}</button>)}</div></div>
          <Field label={tr('PIN de acceso (opcional, 4-6 dígitos)')} hint={tr('Protege el cambio de integrante en este equipo.')}><Input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></Field>
        </div>
      </Modal>
      <Modal open={!!settle} onClose={() => setSettle(null)} title={tr('Registrar liquidación')} icon="handshake" width={420}
        footer={<><Button variant="ghost" onClick={() => setSettle(null)}>{tr('Cancelar')}</Button><Button variant="emerald" onClick={() => { if (mutate((e, a) => createSettlement(e, a, { fromMemberId: settle!.fromId, toMemberId: settle!.toId, amount: parseMoney(settle!.amount), date: today(), currency: cur }), tr('Liquidación registrada')) !== undefined) setSettle(null); }}>{tr('Registrar')}</Button></>}>
        {settle && <><p className="text-[13px] text-ink-2 mb-3"><b>{nameOf(settle.fromId)}</b>{' '}{tr('paga a')}{' '}<b>{nameOf(settle.toId)}</b></p><MoneyInput currency={cur} value={settle.amount} onChange={(v) => setSettle({ ...settle, amount: v })} aria-label={tr('Importe')} /></>}
      </Modal>
      {confirm.node}
    </div>
  );
}

