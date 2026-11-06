import { useState } from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { useApp } from '../../store/app';
import { useActor, useCan, useMutate, useProfile, useQuery } from '../../hooks/useDb';
import { listAccounts, createAccount, updateAccount, archiveAccount, deleteAccount, ACCOUNT_TYPE_LABEL, listTransactions, listCategories, isLiability } from '../../db/repo/finance';
import { listMembers } from '../../db/repo/core';
import { balances } from '../../db/repo/analytics';
import { Button, Card, EmptyState, Field, Input, Modal, Money, MoneyInput, PageHeader, Select, Badge, useConfirm, Progress, Stat, IconButton, ease } from '../../components/ui';
import { Icon } from '../../icons';
import { TxRow } from '../transactions/TxRow';
import { centsToInput, combined, parseMoney, type Currency } from '../../lib/money';
import type { Account, AccountType } from '../../db/types';
import { tr } from '../../lib/i18n';

const TYPE_ICON: Record<AccountType, string> = { savings: 'savings', checking: 'bank', cash: 'cash', credit_card: 'card', debit_card: 'card', investment: 'investment' };
const COLORS = ['#1F4B39', '#12291F', '#2F8A84', '#3C6E9E', '#4F5D75', '#8A5CA8', '#A84B6B', '#C2643E', '#B88A2B'];

function AccountForm({ open, onClose, account }: { open: boolean; onClose: () => void; account: Account | null }) {
  const profile = useProfile();
  const actor = useActor();
  const members = useQuery((e) => listMembers(e));
  const mutate = useMutate();
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'savings');
  const [currency, setCurrency] = useState<Currency>(account?.currency ?? profile.primaryCurrency);
  const [initial, setInitial] = useState(account ? centsToInput(Math.abs(account.initialBalance)) : '');
  const [limit, setLimit] = useState(account?.creditLimit ? centsToInput(account.creditLimit) : '');
  const [institution, setInstitution] = useState(account?.institution ?? '');
  const [color, setColor] = useState(account?.color ?? COLORS[0]);
  const [owner, setOwner] = useState<string>(account ? account.ownerMemberId ?? '' : profile.mode === 'individual' ? '' : actor.id);
  const [err, setErr] = useState('');
  const save = () => {
    const ib = parseMoney(initial || '0');
    if (Number.isNaN(ib)) return setErr(tr('Saldo no válido'));
    const input = { name, type, currency, initialBalance: type === 'credit_card' ? -Math.abs(ib) : ib, creditLimit: type === 'credit_card' && limit ? parseMoney(limit) : null, institution: institution || null, color, ownerMemberId: owner || null };
    const r = mutate((e, a) => (account ? updateAccount(e, a, account.id, input) : createAccount(e, a, input)), account ? tr('Cuenta actualizada') : tr('Cuenta creada'));
    if (r !== undefined) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={account ? tr('Editar cuenta') : tr('Nueva cuenta o tarjeta')} icon="bank" width={560}
      footer={<><Button variant="ghost" onClick={onClose}>{tr('Cancelar')}</Button><Button onClick={save}>{account ? tr('Guardar') : tr('Crear cuenta')}</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={tr('Nombre')} className="col-span-2" error={err}><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('Ej. Banco General Ahorros')} /></Field>
        <Field label={tr('Tipo')}><Select value={type} onChange={(e) => setType(e.target.value as AccountType)}>{Object.entries(ACCOUNT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label={tr('Moneda')}><Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}><option value="PAB">{tr('Balboa (PAB)')}</option><option value="USD">{tr('Dólar (USD)')}</option></Select></Field>
        <Field label={tr('Institución')}><Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder={tr('Ej. Banistmo')} /></Field>
        <Field label={type === 'credit_card' ? tr('Saldo adeudado actual') : tr('Saldo inicial')}><MoneyInput currency={currency} value={initial} onChange={setInitial} aria-label={tr('Saldo inicial')} /></Field>
        {type === 'credit_card' && <Field label={tr('Límite de crédito')}><MoneyInput currency={currency} value={limit} onChange={setLimit} aria-label={tr('Límite')} /></Field>}
        {profile.mode !== 'individual' && (
          <Field label={tr('Titular')} hint={tr('Las cuentas del hogar son visibles para todos.')}><Select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">{tr('Hogar (compartida)')}</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
        )}
        <div className="col-span-2">
          <p className="text-[12px] font-medium text-ink-2 mb-1.5">{tr('Color')}</p>
          <div className="flex gap-2">{COLORS.map((c) => <button key={c} type="button" onClick={() => setColor(c)} className={clsx('size-8 rounded-full transition', color === c && 'ring-4 ring-emerald/30 scale-110')} style={{ background: c }} aria-label={c} />)}</div>
        </div>
      </div>
    </Modal>
  );
}

export function AccountCard({ a, onClick, index }: { a: Account; onClick: () => void; index: number }) {
  const liab = isLiability(a);
  const used = liab && a.creditLimit ? (Math.abs(Math.min(0, a.balance)) / a.creditLimit) * 100 : 0;
  return (
    <motion.button onClick={onClick} initial={{ opacity: 0, y: 16, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: index * 0.05, duration: 0.5, ease }} whileHover={{ y: -4 }}
      className={clsx('relative text-left rounded-[22px] p-5 h-[172px] overflow-hidden text-white shadow-card', a.archived && 'opacity-50')}
      style={{ background: `linear-gradient(140deg, ${a.color} 0%, color-mix(in srgb, ${a.color} 60%, #000) 100%)` }}>
      <div className="absolute -right-10 -top-10 size-40 rounded-full border border-white/15" />
      <div className="absolute -right-2 top-14 size-24 rounded-full bg-white/5" />
      <div className="relative flex items-start justify-between">
        <div><p className="text-[11px] text-white/65">{ACCOUNT_TYPE_LABEL[a.type]}{a.institution ? ` · ${a.institution}` : ''}</p><p className="text-[15px] font-semibold mt-0.5 truncate max-w-[220px]">{a.name}</p></div>
        <span className="grid place-items-center size-9 rounded-[12px] bg-white/15 backdrop-blur"><Icon name={TYPE_ICON[a.type]} size={18} active /></span>
      </div>
      <div className="absolute left-5 right-5 bottom-5">
        <p className="text-[11px] text-white/65">{liab ? tr('Saldo adeudado') : tr('Saldo actual')}</p>
        <div className="flex items-end justify-between">
          <Money animated cents={liab ? Math.abs(a.balance) : a.balance} currency={a.currency} className="text-[24px] font-semibold tracking-[-0.04em]" />
          <span className="text-[11px] font-semibold bg-white/15 rounded-full px-2 py-0.5">{a.currency}</span>
        </div>
        {liab && a.creditLimit ? <div className="mt-2"><Progress value={used} height={4} color="#fff" track="rgb(255 255 255 / 0.2)" /><p className="text-[10.5px] text-white/65 mt-1">{used.toFixed(0)}{' '}{tr('% del límite usado')}</p></div> : null}
      </div>
    </motion.button>
  );
}

export default function Accounts() {
  const profile = useProfile();
  const actor = useActor();
  const canManage = useCan('account.manage');
  const mutate = useMutate();
  const confirm = useConfirm();
  const openTx = useApp((s) => s.openTx);
  const visibleTo = profile.mode === 'individual' ? undefined : actor.id;
  const accounts = useQuery((e) => listAccounts(e, { includeArchived: true, visibleTo }), [visibleTo]);
  const bal = useQuery((e) => balances(e, visibleTo), [visibleTo]);
  const cats = useQuery((e) => listCategories(e, undefined, true));
  const [editing, setEditing] = useState<Account | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const sel = accounts.find((a) => a.id === selected) ?? null;
  const txs = useQuery((e) => (selected ? listTransactions(e, { accountId: selected, limit: 30 }) : []), [selected]);
  const cur = profile.primaryCurrency;

  return (
    <div>
      <PageHeader title={tr('Cuentas y tarjetas')} subtitle={tr('Saldos por moneda, siempre al día')} actions={canManage && <Button icon="plus" onClick={() => { setEditing(null); setFormOpen(true); }}>{tr('Nueva cuenta')}</Button>} />
      <div className="grid grid-cols-4 gap-5 mb-6">
        <Card className="p-5"><Stat label={tr('Disponible (PAB)')} value={<Money animated cents={bal.available.PAB} currency="PAB" />} /></Card>
        <Card className="p-5" delay={0.04}><Stat label={tr('Disponible (USD)')} value={<Money animated cents={bal.available.USD} currency="USD" />} /></Card>
        <Card className="p-5" delay={0.08}><Stat label={tr('Deuda en tarjetas')} value={<Money animated cents={combined(bal.cardDebt, cur)} currency={cur} className="text-coral" />} /></Card>
        <Card className="p-5" delay={0.12}><Stat label={tr('Patrimonio neto')} value={<Money animated cents={combined(bal.netWorth, cur)} currency={cur} />} sub={tr('Paridad PAB:USD 1:1')} /></Card>
      </div>
      {accounts.length ? (
        <div className="grid grid-cols-3 gap-5" style={{ perspective: 1000 }}>
          {accounts.map((a, i) => <AccountCard key={a.id} a={a} index={i} onClick={() => setSelected(a.id)} />)}
          {canManage && (
            <motion.button whileHover={{ y: -4 }} onClick={() => { setEditing(null); setFormOpen(true); }} className="rounded-[22px] h-[172px] border-2 border-dashed border-line text-muted hover:text-ink hover:border-ink-2/30 grid place-items-center">
              <span className="text-center"><Icon name="plus" size={24} className="mx-auto" /><span className="block text-[13px] mt-2">{tr('Añadir cuenta o tarjeta')}</span></span>
            </motion.button>
          )}
        </div>
      ) : <Card><EmptyState icon="bank" title={tr('Sin cuentas')} body={tr('Registra tus cuentas de ahorro, corrientes, efectivo, tarjetas e inversiones.')} action={canManage && <Button icon="plus" onClick={() => setFormOpen(true)}>{tr('Nueva cuenta')}</Button>} /></Card>}

      <Modal open={!!sel} onClose={() => setSelected(null)} title={sel?.name ?? ''} subtitle={sel ? `${ACCOUNT_TYPE_LABEL[sel.type]} · ${sel.currency}${sel.archived ? ' · Archivada' : ''}` : ''} width={640} icon={sel ? TYPE_ICON[sel.type] : undefined}
        footer={sel && canManage && <>
          <Button variant="ghost" icon="trash" className="mr-auto !text-coral" onClick={() => confirm.ask({ title: tr('¿Eliminar cuenta?'), body: tr('Solo se pueden eliminar cuentas sin movimientos. Si tiene historial, archívala.'), onConfirm: () => { if (mutate((e, a) => deleteAccount(e, a, sel.id), tr('Cuenta eliminada')) !== undefined) setSelected(null); } })}>{tr('Eliminar')}</Button>
          <Button variant="secondary" onClick={() => mutate((e, a) => archiveAccount(e, a, sel.id, !sel.archived), sel.archived ? tr('Cuenta reactivada') : tr('Cuenta archivada'))}>{sel.archived ? tr('Reactivar') : tr('Archivar')}</Button>
          <Button icon="edit" onClick={() => { setEditing(sel); setFormOpen(true); }}>{tr('Editar')}</Button>
        </>}>
        {sel && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Stat label={tr('Saldo inicial')} value={<Money cents={sel.initialBalance} currency={sel.currency} />} />
              <Stat label={tr('Movimientos')} value={<Money cents={sel.balance - sel.initialBalance} currency={sel.currency} sign />} />
              <Stat label={tr('Saldo actual')} value={<Money cents={sel.balance} currency={sel.currency} className={sel.balance < 0 ? 'text-coral' : 'text-emerald'} />} />
            </div>
            <div className="flex items-center justify-between mb-1"><p className="text-[13px] font-semibold">{tr('Últimos movimientos')}</p><IconButton icon="plus" label={tr('Nuevo movimiento')} onClick={() => openTx()} size={30} /></div>
            <div className="-mx-2">{txs.map((t, i) => <TxRow key={t.id} tx={t} categories={cats} accounts={accounts} index={i} onClick={() => openTx(undefined, t)} />)}</div>
            {!txs.length && <p className="text-[12.5px] text-muted py-6 text-center">{tr('Esta cuenta aún no tiene movimientos.')}</p>}
            {sel.type === 'credit_card' && <p className="mt-3"><Badge tone="blue">{tr('Consejo')}</Badge> <span className="text-[12px] text-muted">{tr('Usa “Pago de tarjeta” para abonar desde tu cuenta bancaria sin duplicar el gasto.')}</span></p>}
          </>
        )}
      </Modal>
      {formOpen && <AccountForm open={formOpen} onClose={() => setFormOpen(false)} account={editing} />}
      {confirm.node}
    </div>
  );
}
