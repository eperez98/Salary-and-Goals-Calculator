import { useMemo, useState } from 'react';
import { useActor, useCan, useMutate, useProfile, useQuery, useScope } from '../../hooks/useDb';
import { listDebts, createDebt, updateDebt, deleteDebt, payDebt, DEBT_KIND_LABEL, type DebtView } from '../../db/repo/planning';
import { listAccounts } from '../../db/repo/finance';
import { Button, Card, EmptyState, Field, Input, Modal, Money, MoneyInput, PageHeader, Select, Badge, Progress, Stat, useConfirm, Segmented } from '../../components/ui';
import { IconTile } from '../../icons';
import { amortizationSchedule, monthlyPayment, totalInterest } from '../../domain/amortization';
import { centsToInput, combined, formatMoney, parseMoney, type Currency } from '../../lib/money';
import { addMonths, formatDate, today } from '../../lib/dates';
import type { DebtKind } from '../../db/types';
import { tr } from '../../lib/i18n';

const KIND_ICON: Record<DebtKind, string> = { personal_loan: 'loan', mortgage: 'home', auto: 'vehicle', credit_card: 'card', personal_debt: 'handshake' };

function DebtForm({ debt, onClose }: { debt: DebtView | null; onClose: () => void }) {
  const profile = useProfile();
  const sf = useScope();
  const mutate = useMutate();
  const [name, setName] = useState(debt?.name ?? '');
  const [kind, setKind] = useState<DebtKind>(debt?.kind ?? 'personal_loan');
  const [direction, setDirection] = useState<'owe' | 'owed'>(debt?.direction ?? 'owe');
  const [principal, setPrincipal] = useState(debt ? centsToInput(debt.principal) : '');
  const [currency, setCurrency] = useState<Currency>(debt?.currency ?? profile.primaryCurrency);
  const [rate, setRate] = useState(String(debt?.annualRate ?? ''));
  const [term, setTerm] = useState(String(debt?.termMonths ?? 12));
  const [start, setStart] = useState(debt?.startDate ?? today());
  const [day, setDay] = useState(String(debt?.paymentDay ?? 15));
  const [lender, setLender] = useState(debt?.lender ?? '');
  const p = parseMoney(principal || '0');
  const cuota = Number.isNaN(p) ? 0 : monthlyPayment(p, Number(rate) || 0, Number(term) || 1);
  const save = () => {
    const input = { name: name || DEBT_KIND_LABEL[kind], kind, direction, principal: p, currency, annualRate: Number(rate) || 0, termMonths: Number(term) || 1, startDate: start, paymentDay: Number(day) || null, lender: lender || null, scope: sf.scope };
    if (mutate((e, a) => (debt ? updateDebt(e, a, debt.id, input) : createDebt(e, a, input)), debt ? tr('Deuda actualizada') : tr('Deuda registrada')) !== undefined) onClose();
  };
  return (
    <Modal open onClose={onClose} title={debt ? tr('Editar préstamo o deuda') : tr('Nuevo préstamo o deuda')} icon="loan" width={580}
      footer={<><Button variant="ghost" onClick={onClose}>{tr('Cancelar')}</Button><Button onClick={save}>{tr('Guardar')}</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={tr('Tipo')}><Select value={kind} onChange={(e) => setKind(e.target.value as DebtKind)}>{Object.entries(DEBT_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label={tr('Nombre')}><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('Ej. Préstamo de auto')} /></Field>
        {kind === 'personal_debt' && <div className="col-span-2"><Segmented value={direction} onChange={setDirection} options={[{ value: 'owe', label: tr('Yo debo') }, { value: 'owed', label: tr('Me deben') }]} /></div>}
        <Field label={tr('Monto original')}><MoneyInput currency={currency} value={principal} onChange={setPrincipal} aria-label={tr('Monto')} /></Field>
        <Field label={tr('Moneda')}><Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}><option value="PAB">{tr('PAB')}</option><option value="USD">{tr('USD')}</option></Select></Field>
        <Field label={tr('Tasa de interés anual (%)')}><Input type="number" step="0.01" min={0} value={rate} onChange={(e) => setRate(e.target.value)} placeholder={tr('Ej. 8.5')} /></Field>
        <Field label={tr('Plazo (meses)')}><Input type="number" min={1} value={term} onChange={(e) => setTerm(e.target.value)} /></Field>
        <Field label={tr('Fecha de inicio')}><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label={tr('Día de pago')}><Input type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} /></Field>
        <Field label={tr('Entidad o persona')} className="col-span-2"><Input value={lender} onChange={(e) => setLender(e.target.value)} placeholder={tr('Ej. Caja de Ahorros')} /></Field>
      </div>
      <div className="mt-4 rounded-[18px] hero-surface text-white p-4 grid grid-cols-3 gap-3">
        <div><p className="text-[11px] text-white/60">{tr('Cuota mensual')}</p><p className="text-[20px] font-semibold num">{formatMoney(cuota, currency)}</p></div>
        <div><p className="text-[11px] text-white/60">{tr('Intereses totales')}</p><p className="text-[16px] font-semibold num">{formatMoney(Number.isNaN(p) ? 0 : totalInterest(p, Number(rate) || 0, Number(term) || 1), currency)}</p></div>
        <div><p className="text-[11px] text-white/60">{tr('Finaliza')}</p><p className="text-[16px] font-semibold">{formatDate(addMonths(start, (Number(term) || 1) - 1))}</p></div>
      </div>
    </Modal>
  );
}

export default function Debts() {
  const profile = useProfile();
  const actor = useActor();
  const sf = useScope();
  const canManage = useCan('debt.manage');
  const canPay = useCan('tx.create');
  const mutate = useMutate();
  const confirm = useConfirm();
  const debts = useQuery((e) => listDebts(e, sf), [sf]);
  const accounts = useQuery((e) => listAccounts(e, { visibleTo: profile.mode === 'individual' ? undefined : actor.id }), [actor.id]);
  const [form, setForm] = useState<{ open: boolean; d: DebtView | null }>({ open: false, d: null });
  const [detail, setDetail] = useState<DebtView | null>(null);
  const [pay, setPay] = useState<DebtView | null>(null);
  const [payAmt, setPayAmt] = useState('');
  const [payAcc, setPayAcc] = useState('');
  const [payDate, setPayDate] = useState(today());
  const det = debts.find((d) => d.id === detail?.id) ?? null;
  const schedule = useMemo(() => (det ? amortizationSchedule(det.principal, det.annualRate, det.termMonths, det.startDate) : []), [det]);
  const owed = { PAB: 0, USD: 0 };
  debts.filter((d) => d.direction === 'owe' && !d.closed).forEach((d) => { owed[d.currency] += d.status.balance; });
  const monthly = debts.filter((d) => !d.closed && d.direction === 'owe').reduce((a, d) => a + monthlyPayment(d.principal, d.annualRate, d.termMonths), 0);
  const cur = profile.primaryCurrency;

  return (
    <div>
      <PageHeader title={tr('Préstamos y deudas')} subtitle={tr('Saldo pendiente, cuotas, intereses y amortización')} actions={canManage && <Button icon="plus" onClick={() => setForm({ open: true, d: null })}>{tr('Nueva deuda')}</Button>} />
      <div className="grid grid-cols-3 gap-5 mb-6">
        <Card className="p-5"><Stat label={tr('Saldo pendiente total')} value={<Money animated cents={combined(owed, cur)} currency={cur} className="text-coral" />} sub={`PAB ${formatMoney(owed.PAB, 'PAB')} · USD ${formatMoney(owed.USD, 'USD')}`} /></Card>
        <Card className="p-5" delay={0.04}><Stat label={tr('Cuotas mensuales')} value={<Money animated cents={monthly} currency={cur} />} /></Card>
        <Card className="p-5" delay={0.08}><Stat label={tr('Intereses pagados')} value={<Money animated cents={debts.reduce((a, d) => a + d.status.paidInterest, 0)} currency={cur} />} /></Card>
      </div>
      {debts.length ? (
        <div className="grid grid-cols-2 gap-5">
          {debts.map((d, i) => {
            const cuota = monthlyPayment(d.principal, d.annualRate, d.termMonths);
            return (
              <Card key={d.id} delay={i * 0.05} className={`p-5 ${d.closed ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                  <IconTile name={KIND_ICON[d.kind]} color={d.direction === 'owed' ? 'var(--emerald)' : 'var(--coral)'} />
                  <div className="flex-1 min-w-0"><p className="text-[14.5px] font-semibold truncate">{d.name}</p><p className="text-[11.5px] text-muted">{DEBT_KIND_LABEL[d.kind]}{d.lender ? ` · ${d.lender}` : ''} · {d.annualRate}{tr('% anual')}</p></div>
                  {d.closed ? <Badge tone="green">{tr('Saldada')}</Badge> : d.direction === 'owed' ? <Badge tone="green">{tr('Me deben')}</Badge> : <Badge tone="red">{tr('Pendiente')}</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <Stat label={tr('Saldo pendiente')} value={<Money animated cents={d.status.balance} currency={d.currency} />} />
                  <Stat label={tr('Cuota')} value={<Money cents={cuota} currency={d.currency} />} sub={d.paymentDay ? tr('Día {paymentDay}', { paymentDay: d.paymentDay }) : undefined} />
                  <Stat label={tr('Pagado')} value={<Money cents={d.status.paidTotal} currency={d.currency} />} sub={tr('Intereses {v0}', { v0: formatMoney(d.status.paidInterest, d.currency) })} />
                </div>
                <Progress value={d.status.progressPct} className="mt-4" color="var(--emerald)" delay={0.2 + i * 0.05} />
                <p className="text-[11px] text-muted mt-1">{d.status.progressPct.toFixed(0)}{' '}{tr('% del capital amortizado ·')}{' '}{d.status.payments.length}{' '}{tr('pagos')}</p>
                <div className="flex gap-2 mt-4">
                  {canPay && !d.closed && <Button size="sm" icon="check" className="flex-1" onClick={() => { setPay(d); setPayAmt(centsToInput(Math.min(cuota, d.status.balance))); setPayAcc(accounts.find((a) => a.currency === d.currency)?.id ?? ''); setPayDate(today()); }}>{d.direction === 'owed' ? tr('Registrar cobro') : tr('Registrar abono')}</Button>}
                  <Button size="sm" variant="secondary" onClick={() => setDetail(d)}>{tr('Amortización')}</Button>
                  {canManage && <Button size="sm" variant="ghost" icon="edit" onClick={() => setForm({ open: true, d })} aria-label={tr('Editar')} />}
                </div>
              </Card>
            );
          })}
        </div>
      ) : <Card><EmptyState icon="loan" title={tr('Sin préstamos ni deudas')} body={tr('Registra préstamos personales, hipotecas, financiamientos de auto, tarjetas o deudas con personas.')} action={canManage && <Button icon="plus" onClick={() => setForm({ open: true, d: null })}>{tr('Registrar deuda')}</Button>} /></Card>}

      {form.open && <DebtForm debt={form.d} onClose={() => setForm({ open: false, d: null })} />}
      <Modal open={!!pay} onClose={() => setPay(null)} title={pay ? `${pay.direction === 'owed' ? tr('Cobro') : tr('Abono')} · ${pay.name}` : ''} icon="loan" width={440}
        footer={<><Button variant="ghost" onClick={() => setPay(null)}>{tr('Cancelar')}</Button><Button variant="emerald" onClick={() => { if (mutate((e, a) => payDebt(e, a, pay!.id, { amount: parseMoney(payAmt), date: payDate, accountId: payAcc }), tr('Pago registrado'))) setPay(null); }}>{tr('Registrar')}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('Importe')} className="col-span-2"><MoneyInput autoFocus currency={pay?.currency} value={payAmt} onChange={setPayAmt} aria-label={tr('Importe')} /></Field>
          <Field label={tr('Fecha')}><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></Field>
          <Field label={tr('Cuenta')}><Select value={payAcc} onChange={(e) => setPayAcc(e.target.value)}>{accounts.filter((a) => a.currency === pay?.currency).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        </div>
        <p className="text-[12px] text-muted mt-3">{tr('Se crea un movimiento real en la cuenta y se separa automáticamente en interés y capital.')}</p>
      </Modal>
      <Modal open={!!det} onClose={() => setDetail(null)} title={tr('Amortización · {v0}', { v0: det?.name ?? '' })} subtitle={det ? `${formatMoney(det.principal, det.currency)} al ${det.annualRate}% · ${det.termMonths} meses` : ''} icon="reports" width={760}
        footer={det && canManage && <Button variant="ghost" icon="trash" className="mr-auto !text-coral" onClick={() => confirm.ask({ title: tr('¿Eliminar deuda?'), body: tr('Los pagos registrados se conservan como movimientos.'), onConfirm: () => { mutate((e, a) => deleteDebt(e, a, det.id), tr('Deuda eliminada')); setDetail(null); } })}>{tr('Eliminar')}</Button>}>
        {det && (
          <>
            {det.status.payments.length > 0 && (
              <div className="mb-4"><p className="text-[13px] font-semibold mb-2">{tr('Pagos realizados')}</p>
                <table className="w-full text-[12px] num"><thead className="text-muted text-left"><tr><th className="py-1">{tr('Fecha')}</th><th className="text-right">{tr('Pago')}</th><th className="text-right">{tr('Interés')}</th><th className="text-right">{tr('Capital')}</th><th className="text-right">{tr('Saldo')}</th></tr></thead>
                  <tbody>{det.status.payments.map((p, i) => <tr key={i} className="border-t border-line/60"><td className="py-1.5">{formatDate(p.date)}</td><td className="text-right">{formatMoney(p.amount, det.currency)}</td><td className="text-right text-coral">{formatMoney(p.interest, det.currency)}</td><td className="text-right text-emerald">{formatMoney(p.principal, det.currency)}</td><td className="text-right font-semibold">{formatMoney(p.balance, det.currency)}</td></tr>)}</tbody></table>
              </div>
            )}
            <p className="text-[13px] font-semibold mb-2">{tr('Tabla de amortización teórica')}</p>
            <div className="max-h-[340px] overflow-y-auto rounded-[14px] border border-line">
              <table className="w-full text-[12px] num"><thead className="sticky top-0 bg-surface-2 text-muted text-left"><tr><th className="px-3 py-2">#</th><th>{tr('Fecha')}</th><th className="text-right">{tr('Cuota')}</th><th className="text-right">{tr('Interés')}</th><th className="text-right">{tr('Capital')}</th><th className="text-right pr-3">{tr('Saldo')}</th></tr></thead>
                <tbody>{schedule.map((r) => <tr key={r.n} className="border-t border-line/60"><td className="px-3 py-1.5 text-muted">{r.n}</td><td>{formatDate(r.date)}</td><td className="text-right">{formatMoney(r.payment, det.currency)}</td><td className="text-right">{formatMoney(r.interest, det.currency)}</td><td className="text-right">{formatMoney(r.principal, det.currency)}</td><td className="text-right pr-3 font-semibold">{formatMoney(r.balance, det.currency)}</td></tr>)}</tbody></table>
            </div>
          </>
        )}
      </Modal>
      {confirm.node}
    </div>
  );
}
