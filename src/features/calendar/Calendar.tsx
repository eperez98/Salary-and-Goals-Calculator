import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { useActor, useCan, useMutate, useProfile, useQuery, useScope } from '../../hooks/useDb';
import { listRecurring, recurringOccurrences, createRecurring, deleteRecurring, postRecurring, listReminders, createReminder, toggleReminder, deleteReminder, listIncomeSources, listDebts } from '../../db/repo/planning';
import { listAccounts, listCategories, listTransactions } from '../../db/repo/finance';
import { payOccurrences } from '../../domain/salary';
import { RECUR_LABEL, monthlyEquivalent, type RecurFrequency } from '../../domain/recurrence';
import { Button, Card, CardHeader, EmptyState, Field, Input, Modal, Money, MoneyInput, PageHeader, Select, Toggle, Badge, IconButton, EstimateTag, useConfirm } from '../../components/ui';
import { Icon } from '../../icons';
import { addMonths, daysInMonth, formatDate, formatMonth, monthKey, today, weekdayShort } from '../../lib/dates';
import { formatMoney, parseMoney, type Currency } from '../../lib/money';
import { tr } from '../../lib/i18n';

interface Ev { date: string; title: string; amount: number; currency: Currency; kind: 'income' | 'expense' | 'debt' | 'reminder' | 'tx'; estimated: boolean; done?: boolean; onClick?: () => void; onDelete?: () => void }
const KIND_STYLE: Record<Ev['kind'], string> = { income: 'bg-emerald-soft text-emerald', expense: 'bg-coral-soft text-coral', debt: 'bg-amber-soft text-amber', reminder: 'bg-blue-soft text-blue', tx: 'bg-surface-3 text-ink-2' };

export default function Calendar() {
  const profile = useProfile();
  const actor = useActor();
  const sf = useScope();
  const canCreate = useCan('tx.create');
  const mutate = useMutate();
  const confirm = useConfirm();
  const [month, setMonth] = useState(monthKey(today()));
  const [selected, setSelected] = useState(today());
  const [recOpen, setRecOpen] = useState(false);
  const [remOpen, setRemOpen] = useState(false);
  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth(Number(month.slice(0, 4)), Number(month.slice(5)) - 1)).padStart(2, '0')}`;
  const rules = useQuery((e) => listRecurring(e, sf), [sf]);
  const accounts = useQuery((e) => listAccounts(e, { visibleTo: profile.mode === 'individual' ? undefined : actor.id }), [actor.id]);
  const cats = useQuery((e) => listCategories(e));

  const events = useQuery((e) => {
    const out: Ev[] = [];
    for (const o of recurringOccurrences(e, listRecurring(e, sf), from, to)) out.push({ date: o.date, title: o.rule.description, amount: o.rule.amount, currency: o.rule.currency, kind: o.rule.kind === 'income' ? 'income' : 'expense', estimated: !o.posted, done: o.posted, onClick: !o.posted && o.date <= today() ? () => mutate((en, a) => postRecurring(en, a, o.rule, o.date), tr('Pago registrado')) : undefined });
    if (sf.scope === 'personal') for (const s of listIncomeSources(e, actor.id)) {
      const keys = new Set(e.all<{ period_key: string }>('SELECT period_key FROM transactions WHERE income_source_id = ?', [s.id]).map((r) => r.period_key));
      for (const o of payOccurrences(s.config, from, to)) out.push({ date: o.date, title: `${s.name} · ${o.label}`, amount: o.net, currency: s.currency, kind: 'income', estimated: !keys.has(o.periodKey), done: keys.has(o.periodKey) });
    }
    for (const d of listDebts(e, sf, false)) if (d.paymentDay && d.direction === 'owe') {
      const day = Math.min(d.paymentDay, Number(to.slice(8)));
      out.push({ date: `${month}-${String(day).padStart(2, '0')}`, title: tr('Cuota · {name}', { name: d.name }), amount: 0, currency: d.currency, kind: 'debt', estimated: true });
    }
    for (const r of listReminders(e, from, to)) out.push({ date: r.date, title: r.title, amount: r.amount ?? 0, currency: (r.currency as Currency) ?? 'PAB', kind: 'reminder', estimated: false, done: r.done, onClick: () => mutate((en) => toggleReminder(en, r.id, !r.done)), onDelete: () => mutate((en, a) => deleteReminder(en, a, r.id), tr('Recordatorio eliminado')) });
    return out;
  }, [month, sf, actor.id]);
  const dayTx = useQuery((e) => listTransactions(e, { from: selected, to: selected, scope: sf }), [selected, sf]);

  const grid = useMemo(() => {
    const first = new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1);
    const offset = (first.getDay() + 6) % 7;
    const n = daysInMonth(first.getFullYear(), first.getMonth());
    const cells: Array<string | null> = Array(offset).fill(null);
    for (let d = 1; d <= n; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`);
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [month]);

  const selectedEvents = events.filter((e) => e.date === selected);
  const monthlyCommitted = rules.filter((r) => r.kind === 'expense').reduce((a, r) => a + monthlyEquivalent(r.amount, r.frequency as RecurFrequency), 0);

  // recurring form state
  const [rk, setRk] = useState<'expense' | 'income'>('expense');
  const [rd, setRd] = useState('');
  const [ra, setRa] = useState('');
  const [rf, setRf] = useState<RecurFrequency>('monthly');
  const [rs, setRs] = useState(today());
  const [racc, setRacc] = useState('');
  const [rcat, setRcat] = useState('');
  const [rauto, setRauto] = useState(false);
  const [mt, setMt] = useState('');
  const [md, setMd] = useState(today());
  const [ma, setMa] = useState('');

  return (
    <div>
      <PageHeader title={tr('Calendario financiero')} subtitle={tr('Cobros, cuotas, servicios y recordatorios')} actions={canCreate && <><Button variant="secondary" icon="bell" onClick={() => { setMt(''); setMd(selected); setMa(''); setRemOpen(true); }}>{tr('Recordatorio')}</Button><Button icon="repeat" onClick={() => { setRd(''); setRa(''); setRacc(accounts[0]?.id ?? ''); setRcat(''); setRs(selected); setRecOpen(true); }}>{tr('Pago recurrente')}</Button></>} />
      <div className="grid grid-cols-12 gap-5">
        <Card hover={false} className="col-span-8 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[18px] font-semibold tracking-[-0.03em]">{formatMonth(month)}</h3>
            <div className="flex gap-1"><IconButton icon="chevronLeft" label={tr('Anterior')} onClick={() => setMonth(monthKey(addMonths(from, -1)))} /><Button size="sm" variant="secondary" onClick={() => { setMonth(monthKey(today())); setSelected(today()); }}>{tr('Hoy')}</Button><IconButton icon="chevronRight" label={tr('Siguiente')} onClick={() => setMonth(monthKey(addMonths(from, 1)))} /></div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-[11px] text-muted mb-1.5">{[1, 2, 3, 4, 5, 6, 0].map((w) => <div key={w} className="text-center uppercase tracking-wide">{weekdayShort(w)}</div>)}</div>
          <motion.div key={month} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-7 gap-1.5">
            {grid.map((d, i) => {
              if (!d) return <div key={i} />;
              const evs = events.filter((e) => e.date === d);
              return (
                <button key={d} onClick={() => setSelected(d)} className={clsx('min-h-[86px] flex flex-col items-stretch justify-start rounded-[14px] p-1.5 text-left border transition', d === selected ? 'border-emerald bg-emerald-soft/40' : 'border-line/60 hover:bg-surface-2', d === today() && 'ring-2 ring-brand-2/30')}>
                  <span className={clsx('inline-grid place-items-center size-6 rounded-full text-[12px] font-semibold num', d === today() && 'bg-brand text-brand-ink')}>{Number(d.slice(8))}</span>
                  <div className="space-y-0.5 mt-0.5">
                    {evs.slice(0, 3).map((e, j) => <div key={j} className={clsx('truncate rounded-[6px] px-1 py-px text-[10px] font-medium', KIND_STYLE[e.kind], e.done && 'opacity-50 line-through')}>{e.title}</div>)}
                    {evs.length > 3 && <div className="text-[10px] text-muted px-1">+{evs.length - 3}{' '}{tr('más')}</div>}
                  </div>
                </button>
              );
            })}
          </motion.div>
          <div className="flex gap-4 mt-4 text-[11px] text-muted">{[['income', tr('Ingresos')], ['expense', tr('Pagos')], ['debt', tr('Cuotas')], ['reminder', tr('Recordatorios')]].map(([k, l]) => <span key={k} className="flex items-center gap-1.5"><span className={clsx('size-2.5 rounded-full', KIND_STYLE[k as Ev['kind']].split(' ')[0])} />{l}</span>)}</div>
        </Card>
        <div className="col-span-4 space-y-5">
          <Card hover={false}>
            <CardHeader title={formatDate(selected, 'long')} subtitle={tr('{events} eventos · {txs} movimientos', { events: selectedEvents.length, txs: dayTx.length })} />
            <ul className="p-3 space-y-1.5">
              {selectedEvents.map((e, i) => (
                <li key={i} className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 bg-surface-2">
                  <span className={clsx('size-2 rounded-full', KIND_STYLE[e.kind].split(' ')[0])} />
                  <span className={clsx('flex-1 text-[12.5px] truncate', e.done && 'line-through text-muted')}>{e.title}</span>
                  {e.amount > 0 && <Money cents={e.amount} currency={e.currency} className="text-[12px] font-semibold" />}
                  {e.done ? <Badge tone="green" className="!h-5">{tr('Hecho')}</Badge> : e.estimated && <EstimateTag />}
                  {e.onClick && <IconButton icon="check" label={tr('Confirmar')} size={26} onClick={e.onClick} />}
                  {e.onDelete && <IconButton icon="trash" label={tr('Eliminar')} size={26} onClick={e.onDelete} />}
                </li>
              ))}
              {dayTx.map((t) => <li key={t.id} className="flex justify-between text-[12px] px-2.5 py-1.5"><span className="truncate text-ink-2">{t.description}</span><Money cents={t.amount} currency={t.currency} /></li>)}
              {!selectedEvents.length && !dayTx.length && <p className="text-[12.5px] text-muted px-2 py-3">{tr('Nada programado este día.')}</p>}
            </ul>
          </Card>
          <Card hover={false}>
            <CardHeader title={tr('Pagos recurrentes')} subtitle={tr('Compromiso mensual: {v0}', { v0: formatMoney(monthlyCommitted, profile.primaryCurrency) })} />
            <ul className="p-3 space-y-1">
              {rules.map((r) => (
                <li key={r.id} className="group flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 hover:bg-surface-2">
                  <Icon name={r.kind === 'income' ? 'income' : 'repeat'} size={16} className={r.kind === 'income' ? 'text-emerald' : 'text-muted'} />
                  <div className="flex-1 min-w-0"><p className="text-[12.5px] font-medium truncate">{r.description}</p><p className="text-[11px] text-muted">{RECUR_LABEL[r.frequency as RecurFrequency]}{r.autoPost ? tr(' · automático') : ' · confirmar'}</p></div>
                  <Money cents={r.amount} currency={r.currency} className="text-[12.5px] font-semibold" />
                  {canCreate && <span className="opacity-0 group-hover:opacity-100"><IconButton icon="trash" label={tr('Eliminar')} size={26} onClick={() => confirm.ask({ title: tr('¿Eliminar “{description}”?', { description: r.description }), body: tr('Los movimientos ya registrados se conservan.'), onConfirm: () => mutate((e, a) => deleteRecurring(e, a, r.id), tr('Programación eliminada')) })} /></span>}
                </li>
              ))}
              {!rules.length && <EmptyState icon="repeat" title={tr('Sin pagos recurrentes')} body={tr('Alquiler, luz, internet, streaming… Monto te los recordará.')} className="!py-6" />}
            </ul>
          </Card>
        </div>
      </div>
      <Modal open={recOpen} onClose={() => setRecOpen(false)} title={tr('Nuevo pago recurrente')} icon="repeat" width={540}
        footer={<><Button variant="ghost" onClick={() => setRecOpen(false)}>{tr('Cancelar')}</Button><Button onClick={() => { const acc = accounts.find((a) => a.id === racc); if (mutate((e, a) => createRecurring(e, a, { kind: rk, description: rd, amount: parseMoney(ra), currency: acc?.currency ?? 'PAB', accountId: racc, categoryId: rcat || null, frequency: rf, startDate: rs, autoPost: rauto, scope: sf.scope }), tr('Pago recurrente programado'))) setRecOpen(false); }}>{tr('Programar')}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('Tipo')}><Select value={rk} onChange={(e) => { setRk(e.target.value as 'income' | 'expense'); setRcat(''); }}><option value="expense">{tr('Gasto')}</option><option value="income">{tr('Ingreso')}</option></Select></Field>
          <Field label={tr('Frecuencia')}><Select value={rf} onChange={(e) => setRf(e.target.value as RecurFrequency)}>{Object.entries(RECUR_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label={tr('Descripción')} className="col-span-2"><Input autoFocus value={rd} onChange={(e) => setRd(e.target.value)} placeholder={tr('Ej. Alquiler, ENSA, Cable Onda, Netflix')} /></Field>
          <Field label={tr('Importe')}><MoneyInput currency={accounts.find((a) => a.id === racc)?.currency} value={ra} onChange={setRa} aria-label={tr('Importe')} /></Field>
          <Field label={tr('Primera fecha')}><Input type="date" value={rs} onChange={(e) => setRs(e.target.value)} /></Field>
          <Field label={tr('Cuenta')}><Select value={racc} onChange={(e) => setRacc(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</Select></Field>
          <Field label={tr('Categoría')}><Select value={rcat} onChange={(e) => setRcat(e.target.value)}><option value="">—</option>{cats.filter((c) => c.kind === rk && !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <div className="col-span-2"><Toggle checked={rauto} onChange={setRauto} label={tr('Registrar automáticamente')} description={tr('Al llegar la fecha (nunca antes), se crea el movimiento. Si está desactivado, te pediremos confirmación.')} /></div>
        </div>
      </Modal>
      <Modal open={remOpen} onClose={() => setRemOpen(false)} title={tr('Nuevo recordatorio')} icon="bell" width={440}
        footer={<><Button variant="ghost" onClick={() => setRemOpen(false)}>{tr('Cancelar')}</Button><Button onClick={() => { if (mutate((e, a) => createReminder(e, a, { title: mt, date: md, amount: ma ? parseMoney(ma) : null, currency: profile.primaryCurrency }), tr('Recordatorio creado')) !== undefined) setRemOpen(false); }}>{tr('Crear')}</Button></>}>
        <div className="space-y-3">
          <Field label={tr('Título')}><Input autoFocus value={mt} onChange={(e) => setMt(e.target.value)} placeholder={tr('Ej. Renovar marbete')} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label={tr('Fecha')}><Input type="date" value={md} onChange={(e) => setMd(e.target.value)} /></Field><Field label={tr('Importe (opcional)')}><MoneyInput currency={profile.primaryCurrency} value={ma} onChange={setMa} aria-label={tr('Importe')} /></Field></div>
        </div>
      </Modal>
      {confirm.node}
    </div>
  );
}
