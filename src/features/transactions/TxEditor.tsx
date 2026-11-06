import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { useApp } from '../../store/app';
import { useActor, useEngine, useMutate, useProfile, useQuery } from '../../hooks/useDb';
import { Button, Field, Input, Modal, MoneyInput, Select, Textarea, Toggle, Avatar, Badge, useConfirm, Money } from '../../components/ui';
import { Icon } from '../../icons';
import { listAccounts, listCategories, createTransaction, updateTransaction, deleteTransaction, TX_TYPE_LABEL, PAYMENT_METHOD_LABEL, addAttachment, listAttachments, deleteAttachment, getAttachmentData, MAX_ATTACHMENT_BYTES, getTransaction } from '../../db/repo/finance';
import { listMembers } from '../../db/repo/core';
import { listDebts } from '../../db/repo/planning';
import { canEditTransaction } from '../../domain/permissions';
import { splitEqually } from '../../domain/split';
import { findDuplicates } from '../../domain/insights';
import { centsToInput, parseMoney, formatMoney } from '../../lib/money';
import { addDays, today, formatDate } from '../../lib/dates';
import { openFile, saveFile } from '../../services/files';
import type { Category, PaymentMethod, Scope, TxType } from '../../db/types';
import { tr } from '../../lib/i18n';

const TYPES: Array<{ t: TxType; icon: string }> = [
  { t: 'expense', icon: 'expense' }, { t: 'income', icon: 'income' }, { t: 'transfer', icon: 'transfer' }, { t: 'card_payment', icon: 'card' },
  { t: 'loan_payment', icon: 'loan' }, { t: 'loan_disbursement', icon: 'bank' }, { t: 'refund', icon: 'refresh' },
];

function CategorySelect({ cats, value, onChange, invalid }: { cats: Category[]; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const top = cats.filter((c) => !c.parentId);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} invalid={invalid}>
      <option value="">{tr('Sin categoría')}</option>
      {top.map((c) => {
        const kids = cats.filter((k) => k.parentId === c.id);
        return kids.length ? (
          <optgroup key={c.id} label={c.name}><option value={c.id}>{c.name}{' '}{tr('(general)')}</option>{kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</optgroup>
        ) : <option key={c.id} value={c.id}>{c.name}</option>;
      })}
    </Select>
  );
}

export function TxEditor() {
  const { open, type: initialType, tx } = useApp((s) => s.txEditor);
  const close = useApp((s) => s.closeTx);
  const actor = useActor();
  const profile = useProfile();
  const scopeView = useApp((s) => s.scope);
  const e = useEngine();
  const mutate = useMutate();
  const confirm = useConfirm();
  const accounts = useQuery((en) => listAccounts(en, { visibleTo: profile.mode === 'individual' ? undefined : actor.id }), [actor.id, profile.mode]);
  const members = useQuery((en) => listMembers(en));
  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(today());
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [memberId, setMemberId] = useState(actor.id);
  const [scope, setScope] = useState<Scope>('personal');
  const [splitOn, setSplitOn] = useState(true);
  const [splitMembers, setSplitMembers] = useState<string[]>([]);
  const [customSplit, setCustomSplit] = useState<Record<string, string>>({});
  const [debtId, setDebtId] = useState('');
  const [files, setFiles] = useState<Array<{ name: string; mime: string; data: Uint8Array }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const kind = type === 'income' || type === 'loan_disbursement' ? 'income' : 'expense';
  const cats = useQuery((en) => listCategories(en, kind), [kind]);
  const debts = useQuery((en) => listDebts(en, { scope, memberId: actor.id }, false), [scope, actor.id]);
  const existingAtt = useQuery((en) => (tx ? listAttachments(en, tx.id) : []), [tx?.id]);
  const account = accounts.find((a) => a.id === accountId);
  const currency = account?.currency ?? profile.primaryCurrency;
  const editable = !tx || canEditTransaction(actor.role, actor.id, tx.memberId);

  useEffect(() => {
    if (!open) return;
    setSaved(false); setErrors({}); setFiles([]);
    const full = tx ? getTransaction(e, tx.id) : null;
    if (full) {
      setType(full.type); setAmount(centsToInput(full.amount)); setDesc(full.description); setDate(full.date); setAccountId(full.accountId ?? '');
      setToAccountId(full.toAccountId ?? ''); setCategoryId(full.categoryId ?? ''); setMethod(full.paymentMethod ?? ''); setNotes(full.notes ?? '');
      setMemberId(full.memberId ?? actor.id); setScope(full.scope); setDebtId(full.debtId ?? '');
      setSplitOn(!!full.splits?.length); setSplitMembers(full.splits?.map((s) => s.memberId) ?? members.map((m) => m.id));
      setCustomSplit(Object.fromEntries((full.splits ?? []).map((s) => [s.memberId, centsToInput(s.amount)])));
    } else {
      setType(initialType ?? 'expense'); setAmount(''); setDesc(''); setDate(today()); setAccountId(accounts[0]?.id ?? ''); setToAccountId(''); setCategoryId('');
      setMethod(''); setNotes(''); setMemberId(actor.id); setScope(profile.mode === 'individual' ? 'personal' : scopeView); setDebtId('');
      setSplitOn(true); setSplitMembers(members.map((m) => m.id)); setCustomSplit({});
    }
  }, [open, tx?.id]);

  const cents = parseMoney(amount || '');
  const equalSplit = useMemo(() => (Number.isNaN(cents) ? [] : splitEqually(cents, splitMembers)), [cents, splitMembers]);
  const custom = Object.keys(customSplit).length > 0;
  const splits = scope === 'family' && type === 'expense' && splitOn && profile.mode !== 'individual'
    ? (custom ? splitMembers.map((m) => ({ memberId: m, amount: parseMoney(customSplit[m] || '0') || 0 })) : equalSplit)
    : undefined;

  const duplicate = useMemo(() => {
    if (tx || type !== 'expense' || Number.isNaN(cents) || !accountId) return null;
    const near = e.all<{ id: string; description: string; date: string; amount: number }>("SELECT id, description, date, amount FROM transactions WHERE type='expense' AND account_id = ? AND amount = ? AND date BETWEEN ? AND ?", [accountId, cents, addDays(date, -1), addDays(date, 1)]);
    const d = findDuplicates([...near.map((n) => ({ ...n, type: 'expense', accountId, categoryId: null })), { id: 'new', type: 'expense', description: desc, amount: cents, date, accountId, categoryId: null }]);
    return d.find(([a, b]) => a.id === 'new' || b.id === 'new') ? near[0] : null;
  }, [cents, accountId, date, desc, type, tx]);

  const submit = () => {
    const errs: Record<string, string> = {};
    if (Number.isNaN(cents) || cents <= 0) errs.amount = tr('Indica un importe válido');
    if (!desc.trim()) errs.desc = tr('Escribe una descripción');
    if (!accountId) errs.account = tr('Selecciona una cuenta');
    if ((type === 'transfer' || type === 'card_payment') && !toAccountId) errs.to = tr('Selecciona la cuenta de destino');
    if (splits && splits.reduce((a, s) => a + s.amount, 0) !== cents) errs.split = tr('El reparto suma {v0} y debe sumar {v1}', { v0: formatMoney(splits.reduce((a, s) => a + s.amount, 0), currency), v1: formatMoney(cents, currency) });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const input = {
      type, description: desc, amount: cents, currency, date, accountId, toAccountId: toAccountId || null, categoryId: categoryId || null,
      paymentMethod: (method || null) as PaymentMethod | null, notes: notes || null, memberId, scope, splits, debtId: debtId || null,
    };
    const r = mutate((en, a) => {
      const t = tx ? updateTransaction(en, a, tx.id, input) : createTransaction(en, a, input);
      files.forEach((f) => addAttachment(en, a, t.id, f));
      return t;
    }, tx ? tr('Movimiento actualizado') : { title: `${TX_TYPE_LABEL[type]} registrado`, body: `${desc} · ${formatMoney(cents, currency)}` });
    if (r) { setSaved(true); setTimeout(close, 550); }
  };

  const remove = () => confirm.ask({ title: tr('¿Eliminar este movimiento?'), body: tr('El saldo de la cuenta se recalculará. Esta acción no se puede deshacer.'), onConfirm: () => { if (mutate((en, a) => deleteTransaction(en, a, tx!.id), tr('Movimiento eliminado')) !== undefined) close(); } });

  const pickFile = async () => {
    const f = await openFile([{ name: tr('Comprobantes'), extensions: ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'heic'] }]);
    if (!f) return;
    if (f.data.length > MAX_ATTACHMENT_BYTES) return useApp.getState().toast({ kind: 'error', title: tr('Archivo demasiado grande'), body: tr('El límite es 5 MB.') });
    const ext = f.name.split('.').pop()?.toLowerCase();
    setFiles([...files, { name: f.name, mime: ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`, data: f.data }]);
  };

  const showCategory = type === 'income' || type === 'expense' || type === 'refund' || type === 'loan_payment';
  const tone = kind === 'income' ? 'text-emerald' : type === 'transfer' || type === 'card_payment' ? 'text-blue' : 'text-coral';

  return (
    <Modal open={open} onClose={close} width={640} title={tx ? tr('Editar movimiento') : tr('Nuevo movimiento')} subtitle={tx ? tr('Registrado el {v0}', { v0: formatDate(tx.createdAt.slice(0, 10)) }) : tr('Ingresos, gastos, transferencias y pagos')}
      footer={
        <>
          {tx && editable && <Button variant="ghost" icon="trash" className="mr-auto !text-coral" onClick={remove}>{tr('Eliminar')}</Button>}
          <Button variant="ghost" onClick={close}>{tr('Cancelar')}</Button>
          {editable && <Button onClick={submit} icon={saved ? 'check' : undefined}>{tx ? tr('Guardar cambios') : tr('Registrar')}</Button>}
        </>
      }>
      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-10 grid place-items-center rounded-[26px] bg-surface/85 backdrop-blur-sm">
            <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }} className="grid place-items-center size-20 rounded-full bg-emerald text-white"><Icon name="check" size={38} strokeWidth={2.4} /></motion.span>
          </motion.div>
        )}
      </AnimatePresence>
      {!editable && <p className="mb-4 rounded-[12px] bg-amber-soft text-amber text-[12.5px] px-3 py-2">{tr('Solo lectura: no tienes permiso para editar este movimiento.')}</p>}
      <fieldset disabled={!editable} className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(({ t, icon }) => (
            <button key={t} type="button" onClick={() => { setType(t); setCategoryId(''); }} className={clsx('group inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium border transition', type === t ? 'bg-brand text-brand-ink border-brand dark:bg-emerald dark:text-[#06140D] dark:border-emerald' : 'border-line text-ink-2 hover:bg-surface-2')}>
              <Icon name={icon} size={14} active={type === t} />{TX_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="rounded-[20px] bg-surface-2 border border-line p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-[11.5px] text-muted mb-1">{tr('Importe')}</p>
            <div className="flex items-baseline gap-2">
              <span className={clsx('text-[26px] font-semibold', tone)}>{currency === 'PAB' ? 'B/.' : '$'}</span>
              <input autoFocus inputMode="decimal" aria-label={tr('Importe')} value={amount} onChange={(ev) => setAmount(ev.target.value.replace(/[^\d.,]/g, ''))} placeholder="0.00" className={clsx('num w-full bg-transparent outline-none text-[34px] font-semibold tracking-[-0.04em] placeholder:text-line', tone)} />
            </div>
            {errors.amount && <p className="text-[11.5px] text-coral">{errors.amount}</p>}
          </div>
          <Badge tone="neutral">{currency}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('Descripción')} error={errors.desc} className="col-span-2"><Input value={desc} onChange={(ev) => setDesc(ev.target.value)} placeholder={kind === 'income' ? tr('Ej. Quincena, cliente…') : tr('Ej. Super 99, ENSA, Panapass…')} invalid={!!errors.desc} /></Field>
          <Field label={tr('Fecha')}><Input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} /></Field>
          <Field label={type === 'transfer' || type === 'card_payment' ? tr('Desde la cuenta') : tr('Cuenta')} error={errors.account}>
            <Select value={accountId} onChange={(ev) => setAccountId(ev.target.value)} invalid={!!errors.account}>
              <option value="">{tr('Selecciona…')}</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
            </Select>
          </Field>
          {(type === 'transfer' || type === 'card_payment') && (
            <Field label={type === 'card_payment' ? tr('Tarjeta a pagar') : tr('Hacia la cuenta')} error={errors.to}>
              <Select value={toAccountId} onChange={(ev) => setToAccountId(ev.target.value)} invalid={!!errors.to}>
                <option value="">{tr('Selecciona…')}</option>
                {accounts.filter((a) => a.id !== accountId && (type !== 'card_payment' || a.type === 'credit_card')).map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
              </Select>
            </Field>
          )}
          {showCategory && <Field label={tr('Categoría')}><CategorySelect cats={cats} value={categoryId} onChange={setCategoryId} /></Field>}
          <Field label={tr('Método de pago')}>
            <Select value={method} onChange={(ev) => setMethod(ev.target.value as PaymentMethod)}>
              <option value="">—</option>
              {Object.entries(PAYMENT_METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          {(type === 'loan_payment' || type === 'loan_disbursement') && debts.length > 0 && (
            <Field label={tr('Préstamo o deuda')}><Select value={debtId} onChange={(ev) => setDebtId(ev.target.value)}><option value="">—</option>{debts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
          )}
          {profile.mode !== 'individual' && (
            <>
              <Field label={tr('Ámbito')}><Select value={scope} onChange={(ev) => setScope(ev.target.value as Scope)}><option value="personal">{tr('Personal (solo tú)')}</option><option value="family">{tr('Hogar (compartido)')}</option></Select></Field>
              <Field label={tr('Responsable')}>
                <Select value={memberId} onChange={(ev) => setMemberId(ev.target.value)} disabled={actor.role === 'member'}>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
            </>
          )}
        </div>
        {scope === 'family' && type === 'expense' && profile.mode !== 'individual' && (
          <div className="rounded-[18px] border border-line p-4 space-y-3">
            <Toggle checked={splitOn} onChange={setSplitOn} label={tr('Repartir entre integrantes')} description={tr('Calcula quién debe a quién en el hogar.')} />
            {splitOn && (
              <div className="space-y-2">
                {members.map((m) => {
                  const on = splitMembers.includes(m.id);
                  const eq = equalSplit.find((s) => s.memberId === m.id)?.amount ?? 0;
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <button type="button" onClick={() => { setSplitMembers(on ? splitMembers.filter((x) => x !== m.id) : [...splitMembers, m.id]); setCustomSplit({}); }} className={clsx('flex items-center gap-2 flex-1 rounded-[12px] px-2 py-1.5 transition', on ? 'bg-emerald-soft/60' : 'opacity-50')}>
                        <Avatar name={m.name} color={m.color} emoji={m.emoji} size={24} /><span className="text-[13px] font-medium">{m.name}</span>{m.id === memberId && <Badge tone="dark" className="!h-5">{tr('Pagó')}</Badge>}
                      </button>
                      {on && <div className="w-32"><MoneyInput currency={currency} value={customSplit[m.id] ?? (Number.isNaN(cents) ? '' : centsToInput(eq))} onChange={(v) => setCustomSplit({ ...Object.fromEntries(splitMembers.map((id) => [id, customSplit[id] ?? centsToInput(equalSplit.find((s) => s.memberId === id)?.amount ?? 0)])), [m.id]: v })} aria-label={tr('Parte de {name}', { name: m.name })} /></div>}
                    </div>
                  );
                })}
                {errors.split && <p className="text-[11.5px] text-coral">{errors.split}</p>}
              </div>
            )}
          </div>
        )}
        <Field label={tr('Notas')}><Textarea value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder={tr('Detalles opcionales')} /></Field>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-medium text-ink-2">{tr('Comprobantes')}</p>
            <Button variant="secondary" size="sm" icon="clip" onClick={pickFile} type="button">{tr('Adjuntar')}</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {existingAtt.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-2 h-8 pl-3 pr-1 rounded-full bg-surface-3 text-[12px]">
                <button type="button" className="hover:underline" onClick={() => { const d = getAttachmentData(e, a.id); if (d) void saveFile(d.name, d.data, [{ name: tr('Archivo'), extensions: [d.name.split('.').pop() ?? 'bin'] }], d.mime); }}>{a.name}</button>
                <button type="button" className="grid place-items-center size-6 rounded-full hover:bg-surface text-muted" onClick={() => mutate((en, ac) => deleteAttachment(en, ac, a.id))} aria-label={tr('Quitar')}><Icon name="close" size={12} /></button>
              </span>
            ))}
            {files.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-2 h-8 pl-3 pr-1 rounded-full bg-emerald-soft text-emerald text-[12px]">{f.name}<button type="button" className="grid place-items-center size-6 rounded-full hover:bg-surface" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={tr('Quitar')}><Icon name="close" size={12} /></button></span>
            ))}
            {!existingAtt.length && !files.length && <p className="text-[12px] text-muted">{tr('Facturas o recibos en imagen o PDF (máx. 5 MB).')}</p>}
          </div>
        </div>
        {duplicate && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-[14px] bg-amber-soft text-amber px-3 py-2.5 text-[12.5px]">
            <Icon name="alert" size={16} className="mt-0.5" />
            <span>{tr('Posible duplicado: ya existe “')}{duplicate.description}{tr('” por')}{' '}<Money cents={duplicate.amount} currency={currency} />{' '}{tr('el')}{' '}{formatDate(duplicate.date)}.</span>
          </motion.div>
        )}
      </fieldset>
      {confirm.node}
    </Modal>
  );
}
