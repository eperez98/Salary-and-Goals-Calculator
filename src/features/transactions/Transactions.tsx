import { useMemo, useState } from 'react';
import { useApp } from '../../store/app';
import { useActor, useCan, useMutate, useProfile, useQuery, useScope } from '../../hooks/useDb';
import { useRange } from '../../hooks/useRange';
import { listTransactions, listCategories, listAccounts, countTransactions, TX_TYPE_LABEL, PAYMENT_METHOD_LABEL } from '../../db/repo/finance';
import { listMembers } from '../../db/repo/core';
import { totals } from '../../db/repo/analytics';
import { Button, Card, EmptyState, Input, Money, PageHeader, Select, Modal, Field, Stat } from '../../components/ui';
import { TxRow } from './TxRow';
import { Icon } from '../../icons';
import { formatDate } from '../../lib/dates';
import { exportCSV, exportXLSX } from '../../services/export';
import { importTransactionsCSV } from '../../services/backup';
import { openFile } from '../../services/files';
import type { TxType } from '../../db/types';
import { tr } from '../../lib/i18n';

const PAGE = 60;

export default function Transactions() {
  const profile = useProfile();
  const actor = useActor();
  const sf = useScope();
  const { range, label } = useRange();
  const openTx = useApp((s) => s.openTx);
  const toast = useApp((s) => s.toast);
  const canCreate = useCan('tx.create');
  const canExport = useCan('report.export');
  const mutate = useMutate();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TxType | ''>('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [importOpen, setImportOpen] = useState(false);
  const [importAcc, setImportAcc] = useState('');

  const filter = useMemo(() => ({ from: range.from, to: range.to, search: search.trim() || undefined, types: type ? [type] : undefined, accountId: accountId || undefined, categoryId: categoryId || undefined, memberId: memberId || undefined, scope: sf }), [range, search, type, accountId, categoryId, memberId, sf]);
  const txs = useQuery((e) => listTransactions(e, { ...filter, limit }), [filter, limit]);
  const count = useQuery((e) => countTransactions(e, filter), [filter]);
  const t = useQuery((e) => totals(e, range, sf), [range, sf]);
  const cats = useQuery((e) => listCategories(e, undefined, true));
  const accounts = useQuery((e) => listAccounts(e, { includeArchived: true, visibleTo: profile.mode === 'individual' ? undefined : actor.id }), [actor.id]);
  const members = useQuery((e) => listMembers(e, true));
  const cur = profile.primaryCurrency;

  const groups = useMemo(() => {
    const m = new Map<string, typeof txs>();
    txs.forEach((x) => m.set(x.date, [...(m.get(x.date) ?? []), x]));
    return [...m];
  }, [txs]);

  const doExport = async (fmt: 'csv' | 'xlsx') => {
    const all = useApp.getState().engine ? listTransactions(useApp.getState().engine!, { ...filter, limit: 100000 }) : [];
    const report = {
      title: tr('Movimientos'), subtitle: label,
      tables: [{ name: tr('Movimientos'), columns: [{ key: 'date', label: tr('Fecha') }, { key: 'type', label: tr('Tipo') }, { key: 'description', label: tr('Descripción') }, { key: 'category', label: tr('Categoría') }, { key: 'account', label: tr('Cuenta') }, { key: 'method', label: tr('Método') }, { key: 'member', label: tr('Responsable') }, { key: 'currency', label: tr('Moneda') }, { key: 'amount', label: tr('Importe'), money: true }, { key: 'notes', label: tr('Notas') }],
        rows: all.map((x) => ({ date: x.date, type: TX_TYPE_LABEL[x.type], description: x.description, category: cats.find((c) => c.id === x.categoryId)?.name ?? '', account: accounts.find((a) => a.id === x.accountId)?.name ?? '', method: x.paymentMethod ? PAYMENT_METHOD_LABEL[x.paymentMethod] : '', member: members.find((m) => m.id === x.memberId)?.name ?? '', currency: x.currency, amount: ['expense', 'loan_payment'].includes(x.type) ? -x.amount : x.amount, notes: x.notes ?? '' })) }],
    };
    const r = fmt === 'csv' ? await exportCSV(report, 'movimientos') : await exportXLSX(report, 'movimientos');
    if (r) toast({ kind: 'success', title: tr('Exportación completada'), body: r });
  };

  const doImport = async () => {
    const f = await openFile([{ name: 'CSV', extensions: ['csv', 'txt'] }]);
    if (!f) return;
    const res = mutate((e, a) => importTransactionsCSV(e, a, new TextDecoder().decode(f.data), importAcc));
    if (res) { toast({ kind: res.imported ? 'success' : 'error', title: tr('{imported} movimientos importados', { imported: res.imported }), body: res.skipped ? tr('{skipped} filas omitidas. {v1}', { skipped: res.skipped, v1: res.errors.join(' · ') }) : undefined }); setImportOpen(false); }
  };

  const hasFilters = search || type || accountId || categoryId || memberId;

  return (
    <div>
      <PageHeader title={tr('Movimientos')} subtitle={`${label} · ${count} registros`} actions={<>
        {canCreate && <Button variant="secondary" icon="upload" onClick={() => { setImportAcc(accounts[0]?.id ?? ''); setImportOpen(true); }}>{tr('Importar CSV')}</Button>}
        {canExport && <><Button variant="secondary" icon="download" onClick={() => doExport('csv')}>{tr('CSV')}</Button><Button variant="secondary" icon="download" onClick={() => doExport('xlsx')}>{tr('Excel')}</Button></>}
        {canCreate && <Button icon="plus" onClick={() => openTx()}>{tr('Nuevo')}</Button>}
      </>} />
      <div className="grid grid-cols-3 gap-5 mb-5">
        <Card className="p-5"><Stat label={tr('Ingresos del periodo')} value={<Money animated cents={t.income} currency={cur} className="text-emerald" />} /></Card>
        <Card className="p-5" delay={0.05}><Stat label={tr('Gastos del periodo')} value={<Money animated cents={t.expense} currency={cur} />} /></Card>
        <Card className="p-5" delay={0.1}><Stat label={tr('Balance')} value={<Money animated cents={t.net} currency={cur} sign className={t.net < 0 ? 'text-coral' : ''} />} /></Card>
      </div>
      <Card hover={false} className="p-4 mb-5">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto] gap-2.5 items-center">
          <div className="relative"><Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><Input className="pl-9" placeholder={tr('Buscar descripción o notas…')} value={search} onChange={(e) => { setSearch(e.target.value); setLimit(PAGE); }} aria-label={tr('Buscar')} /></div>
          <Select value={type} onChange={(e) => setType(e.target.value as TxType)} aria-label={tr('Tipo')}><option value="">{tr('Todos los tipos')}</option>{Object.entries(TX_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label={tr('Cuenta')}><option value="">{tr('Todas las cuentas')}</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label={tr('Categoría')}><option value="">{tr('Todas las categorías')}</option>{cats.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)} aria-label={tr('Responsable')} disabled={profile.mode === 'individual'}><option value="">{tr('Todos')}</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
          <Button variant="ghost" size="sm" icon="close" disabled={!hasFilters} onClick={() => { setSearch(''); setType(''); setAccountId(''); setCategoryId(''); setMemberId(''); }}>{tr('Limpiar')}</Button>
        </div>
      </Card>
      <Card hover={false} className="p-2">
        {groups.map(([date, items]) => (
          <div key={date} className="mb-1">
            <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-muted uppercase tracking-[0.06em]">{formatDate(date, 'long')}</p>
            {items.map((x, i) => <TxRow key={x.id} tx={x} categories={cats} accounts={accounts} members={profile.mode === 'individual' ? undefined : members} index={i} showDate={false} onClick={() => openTx(undefined, x)} />)}
          </div>
        ))}
        {!txs.length && <EmptyState icon={hasFilters ? 'search' : 'transactions'} title={hasFilters ? tr('Sin resultados') : tr('Sin movimientos en este periodo')} body={hasFilters ? tr('Prueba con otros filtros o cambia el periodo.') : tr('Registra ingresos, gastos o transferencias para verlos aquí.')} action={canCreate && !hasFilters ? <Button icon="plus" onClick={() => openTx()}>{tr('Registrar movimiento')}</Button> : undefined} />}
        {txs.length < count && <div className="p-3 text-center"><Button variant="secondary" onClick={() => setLimit(limit + PAGE)}>{tr('Mostrar más (')}{count - txs.length})</Button></div>}
      </Card>
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title={tr('Importar movimientos desde CSV')} icon="upload" width={480}
        footer={<><Button variant="ghost" onClick={() => setImportOpen(false)}>{tr('Cancelar')}</Button><Button disabled={!importAcc} icon="upload" onClick={doImport}>{tr('Elegir archivo')}</Button></>}>
        <p className="text-[13px] text-ink-2 leading-relaxed">{tr('El archivo debe tener columnas')}{' '}<b>{tr('fecha')}</b>, <b>{tr('descripción')}</b>{' '}{tr('e')}{' '}<b>{tr('importe')}</b>{' '}{tr('(opcionalmente')}{' '}<b>{tr('categoría')}</b>{' '}{tr('y')}{' '}<b>{tr('tipo')}</b>{tr('). Los importes negativos se registran como gastos. Formatos de fecha: AAAA-MM-DD o DD/MM/AAAA.')}</p>
        <Field label={tr('Cuenta de destino')} className="mt-4"><Select value={importAcc} onChange={(e) => setImportAcc(e.target.value)}>{accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</Select></Field>
      </Modal>
    </div>
  );
}
