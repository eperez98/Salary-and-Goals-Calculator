import { useState } from 'react';
import { motion } from 'motion/react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useActor, useCan, useMutate, useProfile, useQuery } from '../../hooks/useDb';
import { listIncomeSources, incomeSummary, createIncomeSource, updateIncomeSource, deleteIncomeSource, markPaymentReceived, type IncomeSummary } from '../../db/repo/planning';
import { listAccounts } from '../../db/repo/finance';
import { Button, Card, CardHeader, EmptyState, EstimateTag, Field, Input, Modal, Money, MoneyInput, PageHeader, Select, Badge, useConfirm, Stat, useMotionOK, IconButton } from '../../components/ui';
import { IncomeConfigForm, draftFromConfig, draftToConfig, emptyDraft, type IncomeDraft } from './IncomeConfigForm';
import { Icon } from '../../icons';
import { FREQUENCY_LABEL, type PayOccurrence } from '../../domain/salary';
import { centsToInput, formatMoney, parseMoney, type Currency } from '../../lib/money';
import { diffDays, formatDate, monthShort, today } from '../../lib/dates';
import type { IncomeSource } from '../../db/types';
import { lang, tr } from '../../lib/i18n';

function SourceForm({ open, onClose, source }: { open: boolean; onClose: () => void; source: IncomeSource | null }) {
  const profile = useProfile();
  const actor = useActor();
  const accounts = useQuery((e) => listAccounts(e, { visibleTo: profile.mode === 'individual' ? undefined : actor.id }), [actor.id]);
  const mutate = useMutate();
  const [name, setName] = useState(source?.name ?? '');
  const [currency, setCurrency] = useState<Currency>(source?.currency ?? profile.primaryCurrency);
  const [accountId, setAccountId] = useState(source?.accountId ?? accounts[0]?.id ?? '');
  const [startDate, setStartDate] = useState(source?.startDate ?? today());
  const [draft, setDraft] = useState<IncomeDraft>(() => (source ? draftFromConfig(source.config, today()) : emptyDraft(today())));
  const save = () => {
    const input = { name: name || tr('Salario'), currency, accountId: accountId || null, startDate, config: draftToConfig(draft) };
    if (mutate((e, a) => (source ? updateIncomeSource(e, a, source.id, input) : createIncomeSource(e, a, input)), source ? tr('Ingreso actualizado') : tr('Fuente de ingreso creada')) !== undefined) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={source ? tr('Editar fuente de ingreso') : tr('Nueva fuente de ingreso')} icon="salary" width={720}
      footer={<><Button variant="ghost" onClick={onClose}>{tr('Cancelar')}</Button><Button onClick={save}>{tr('Guardar')}</Button></>}>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <Field label={tr('Nombre o empresa')} className="col-span-2"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('Ej. Empresa Ejemplo, S.A.')} /></Field>
        <Field label={tr('Moneda')}><Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}><option value="PAB">{tr('PAB')}</option><option value="USD">{tr('USD')}</option></Select></Field>
        <Field label={tr('Desde')}><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label={tr('Cuenta donde cobras')} className="col-span-4"><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">—</option>{accounts.filter((a) => a.currency === currency).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
      </div>
      <IncomeConfigForm draft={draft} set={(p) => setDraft({ ...draft, ...p })} currency={currency} compact />
    </Modal>
  );
}

function ReceiveModal({ s, occ, onClose }: { s: IncomeSummary; occ: PayOccurrence; onClose: () => void }) {
  const actor = useActor();
  const profile = useProfile();
  const accounts = useQuery((e) => listAccounts(e, { visibleTo: profile.mode === 'individual' ? undefined : actor.id }), [actor.id]);
  const mutate = useMutate();
  const [amount, setAmount] = useState(centsToInput(occ.net));
  const [date, setDate] = useState(occ.date <= today() ? occ.date : today());
  const [accountId, setAccountId] = useState(s.source.accountId ?? accounts[0]?.id ?? '');
  const save = () => {
    const r = mutate((e, a) => markPaymentReceived(e, a, s.source, occ, { amount: parseMoney(amount), date, accountId }), { title: tr('Ingreso recibido'), body: `${occ.label} · ${formatMoney(parseMoney(amount), s.source.currency)}` });
    if (r) onClose();
  };
  return (
    <Modal open onClose={onClose} title={tr('Confirmar {v0}', { v0: lang === 'es' ? occ.label.toLowerCase() : occ.label })} subtitle={tr('{name} · previsto el {v1}', { name: s.source.name, v1: formatDate(occ.date) })} icon="check" width={460}
      footer={<><Button variant="ghost" onClick={onClose}>{tr('Cancelar')}</Button><Button variant="emerald" icon="check" onClick={save}>{tr('Marcar como recibido')}</Button></>}>
      <p className="text-[12.5px] text-muted mb-4">{tr('Ajusta el importe si tu pago real fue distinto al estimado (horas extra, descuentos, etc.).')}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={tr('Importe recibido (neto)')} className="col-span-2"><MoneyInput autoFocus currency={s.source.currency} value={amount} onChange={setAmount} aria-label={tr('Importe recibido')} /></Field>
        <Field label={tr('Fecha de cobro')}><Input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={tr('Cuenta')}><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.filter((a) => a.currency === s.source.currency).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
      </div>
    </Modal>
  );
}

function SourceCard({ s, index, onEdit, onReceive }: { s: IncomeSummary; index: number; onEdit: () => void; onReceive: (o: PayOccurrence) => void }) {
  const ok = useMotionOK();
  const cur = s.source.currency;
  const e = s.estimate;
  const chart = s.monthlyHistory.map((h) => ({ label: monthShort(Number(h.month.slice(5)) - 1), received: h.amount, estimated: h.month >= s.source.startDate.slice(0, 7) ? e.monthlyNet : 0 }));
  return (
    <motion.div initial={ok ? { opacity: 0, y: 16 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="grid grid-cols-12 gap-5">
      <section className="col-span-12 xl:col-span-7 rounded-[24px] hero-surface text-[#F5F3EE] p-6 shadow-pop relative overflow-hidden">
        <div className="absolute -right-20 -bottom-24 size-72 rounded-full border border-white/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[12px] text-white/60">{FREQUENCY_LABEL[s.source.config.frequency]}</p>
            <h3 className="text-[22px] font-semibold tracking-[-0.03em]">{s.source.name}</h3>
          </div>
          <div className="flex items-center gap-2"><EstimateTag /><IconButton icon="edit" label={tr('Editar')} onClick={onEdit} className="!text-white/80 hover:!bg-white/10" /></div>
        </div>
        <div className="relative grid grid-cols-3 gap-5 mt-6">
          {e.payments.map((p) => (
            <div key={p.label}>
              <p className="text-[11px] text-white/55">{p.label}</p>
              <Money animated cents={p.net} currency={cur} className="text-[22px] font-semibold tracking-[-0.03em]" />
              {p.deductions > 0 && <p className="text-[10.5px] text-white/50">{tr('Bruto')}{' '}{formatMoney(p.gross, cur)} · −{formatMoney(p.deductions, cur)}</p>}
            </div>
          ))}
          <div><p className="text-[11px] text-white/55">{tr('Pagos al año')}</p><p className="text-[22px] font-semibold num">{e.paymentsPerYear}</p></div>
        </div>
        <div className="relative grid grid-cols-3 gap-5 mt-6 pt-5 border-t border-white/10">
          <div><p className="text-[11px] text-white/55">{tr('Ingreso mensual estimado')}</p><Money animated cents={e.monthlyNet} currency={cur} className="text-[26px] font-semibold text-[#7DF0BF] tracking-[-0.04em]" /><p className="text-[10.5px] text-white/50">{tr('Bruto')}{' '}{formatMoney(e.monthlyGross, cur)}</p></div>
          <div><p className="text-[11px] text-white/55">{tr('Ingreso anual estimado')}</p><Money animated cents={e.annualNet} currency={cur} className="text-[20px] font-semibold" /><p className="text-[10.5px] text-white/50">{tr('Bruto')}{' '}{formatMoney(e.annualGross, cur)}</p></div>
          <div><p className="text-[11px] text-white/55">{tr('Décimo tercer mes')}</p>{e.decimoGross ? <Money cents={e.decimoNet} currency={cur} className="text-[20px] font-semibold" /> : <p className="text-[13px] text-white/50 mt-1">{tr('No incluido')}</p>}</div>
        </div>
      </section>
      <div className="col-span-12 xl:col-span-5 grid grid-cols-2 gap-5">
        <Card className="p-5"><Stat label={<span className="flex items-center gap-1.5">{tr('Recibido este año')}{' '}<EstimateTag estimated={false} /></span>} value={<Money animated cents={s.receivedYear} currency={cur} className="text-emerald" />} sub={tr('{receivedCount} pagos registrados', { receivedCount: s.receivedCount })} /></Card>
        <Card className="p-5" delay={0.05}><Stat label={tr('Recibido este mes')} value={<Money animated cents={s.receivedMonth} currency={cur} />} sub={tr('Promedio real: {v0}', { v0: formatMoney(Math.round(s.monthlyHistory.filter((h) => h.amount).reduce((a, h) => a + h.amount, 0) / Math.max(1, s.monthlyHistory.filter((h) => h.amount).length)), cur) })} /></Card>
        <Card className="p-5 col-span-2" delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11.5px] text-muted">{tr('Próxima fecha de pago')}</p>
              {s.next ? <p className="text-[19px] font-semibold tracking-[-0.03em] mt-0.5">{formatDate(s.next.date, 'long')}</p> : <p className="text-[14px] text-muted mt-1">{tr('Sin calendario fijo')}</p>}
              {s.next && <p className="text-[12px] text-muted">{s.next.label}{' '}{tr('· en')}{' '}{Math.max(0, diffDays(s.next.date, today()))}{' '}{tr('días')}{s.next.date !== s.next.nominalDate ? tr(' · adelantado por fin de semana') : ''}</p>}
            </div>
            {s.next && <Money cents={s.next.net} currency={cur} className="text-[18px] font-semibold" />}
          </div>
        </Card>
      </div>
      {s.pending.length > 0 && (
        <Card className="col-span-12 p-5 border-amber/40" hover={false}>
          <div className="flex items-center gap-3 mb-3"><span className="grid place-items-center size-9 rounded-[11px] bg-amber-soft text-amber"><Icon name="info" size={18} /></span><div><p className="text-[14px] font-semibold">{tr('Pagos por confirmar')}</p><p className="text-[12px] text-muted">{tr('La fecha ya pasó. Confirma cuando el dinero esté en tu cuenta: solo entonces cuenta como recibido.')}</p></div></div>
          <div className="flex flex-wrap gap-2">{s.pending.map((p) => <Button key={p.periodKey} variant="secondary" size="sm" icon="check" onClick={() => onReceive(p)}>{p.label} · {formatDate(p.date, 'day')} · {formatMoney(p.net, cur)}</Button>)}</div>
        </Card>
      )}
      <Card className="col-span-12 xl:col-span-7" delay={0.12}>
        <CardHeader title={tr('Recibido vs. estimado')} subtitle={tr('Últimos 6 meses (neto)')} />
        <div className="px-3 pb-3 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} barGap={4}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'var(--surface-3)' }} formatter={(v) => formatMoney(Number(v), cur)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 12 }} />
              <Bar dataKey="estimated" name={tr('Estimado')} fill="var(--sage)" radius={[8, 8, 8, 8]} maxBarSize={22} isAnimationActive={ok} />
              <Bar dataKey="received" name={tr('Recibido')} fill="var(--emerald)" radius={[8, 8, 8, 8]} maxBarSize={22} isAnimationActive={ok} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="col-span-12 xl:col-span-5" delay={0.15}>
        <CardHeader title={tr('Calendario de cobros')} subtitle={tr('Próximos 90 días · estimado')} />
        <ul className="p-2 max-h-[200px] overflow-y-auto">
          {s.upcoming.map((o) => (
            <li key={o.periodKey} className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-surface-2 text-[13px]">
              <span className="w-16 text-muted">{formatDate(o.date, 'day')}</span><span className="flex-1 truncate">{o.label}</span>
              {o.kind === 'decimo' && <Badge tone="amber" className="!h-5">{tr('Décimo')}</Badge>}
              <Money cents={o.net} currency={cur} className="font-semibold" />
            </li>
          ))}
          {!s.upcoming.length && <p className="px-3 py-4 text-[12.5px] text-muted">{tr('Ingreso variable: registra cada cobro como un ingreso con esta fuente.')}</p>}
        </ul>
      </Card>
    </motion.div>
  );
}

export default function Income() {
  const actor = useActor();
  const canManage = useCan('income.manage');
  const mutate = useMutate();
  const confirm = useConfirm();
  const sources = useQuery((e) => listIncomeSources(e, actor.id).map((s) => incomeSummary(e, s)), [actor.id]);
  const [form, setForm] = useState<{ open: boolean; source: IncomeSource | null }>({ open: false, source: null });
  const [receive, setReceive] = useState<{ s: IncomeSummary; occ: PayOccurrence } | null>(null);
  const totalMonthly = sources.reduce((a, s) => a + s.estimate.monthlyNet, 0);
  const totalAnnual = sources.reduce((a, s) => a + s.estimate.annualNet, 0);
  const totalYear = sources.reduce((a, s) => a + s.receivedYear, 0);
  const cur = sources[0]?.source.currency ?? 'PAB';

  return (
    <div>
      <PageHeader title={tr('Ingresos y salario')} subtitle={tr('Lo estimado y lo realmente recibido, siempre por separado')} actions={canManage && <Button icon="plus" onClick={() => setForm({ open: true, source: null })}>{tr('Nueva fuente')}</Button>} />
      {sources.length > 1 && (
        <div className="grid grid-cols-3 gap-5 mb-6">
          <Card className="p-5"><Stat label={<span className="flex gap-1.5 items-center">{tr('Mensual estimado (todas)')}{' '}<EstimateTag /></span>} value={<Money animated cents={totalMonthly} currency={cur} />} /></Card>
          <Card className="p-5"><Stat label={<span className="flex gap-1.5 items-center">{tr('Anual estimado')}{' '}<EstimateTag /></span>} value={<Money animated cents={totalAnnual} currency={cur} />} /></Card>
          <Card className="p-5"><Stat label={<span className="flex gap-1.5 items-center">{tr('Recibido en el año')}{' '}<EstimateTag estimated={false} /></span>} value={<Money animated cents={totalYear} currency={cur} className="text-emerald" />} /></Card>
        </div>
      )}
      <div className="space-y-8">
        {sources.map((s, i) => (
          <div key={s.source.id}>
            <SourceCard s={s} index={i} onEdit={() => setForm({ open: true, source: s.source })} onReceive={(occ) => setReceive({ s, occ })} />
            {canManage && <div className="flex justify-end mt-2"><Button variant="ghost" size="sm" icon="trash" className="!text-coral" onClick={() => confirm.ask({ title: tr('¿Eliminar {name}?', { name: s.source.name }), body: tr('Los ingresos ya registrados se conservan; solo se elimina la configuración y las estimaciones.'), onConfirm: () => mutate((e, a) => deleteIncomeSource(e, a, s.source.id), tr('Fuente eliminada')) })}>{tr('Eliminar fuente')}</Button></div>}
          </div>
        ))}
      </div>
      {!sources.length && <Card><EmptyState icon="salary" title={tr('Configura tu salario')} body={tr('Indica si cobras semanal, quincenal, mensual, por horas o variable. Monto calcula tu ingreso mensual y anual estimado y te recuerda confirmar cada cobro.')} action={canManage && <Button icon="plus" onClick={() => setForm({ open: true, source: null })}>{tr('Configurar ingreso')}</Button>} /></Card>}
      {form.open && <SourceForm open onClose={() => setForm({ open: false, source: null })} source={form.source} />}
      {receive && <ReceiveModal s={receive.s} occ={receive.occ} onClose={() => setReceive(null)} />}
      {confirm.node}
    </div>
  );
}
