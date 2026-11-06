import { useMemo, useState } from 'react';
import { useApp } from '../../store/app';
import { useCan, useEngine, useProfile, useScope, useQuery } from '../../hooks/useDb';
import { useRange } from '../../hooks/useRange';
import { expensesByCategory, monthlySeries, totals, balances } from '../../db/repo/analytics';
import { listDebts, listGoals, DEBT_KIND_LABEL } from '../../db/repo/planning';
import { listTransactions, listCategories, listAccounts, TX_TYPE_LABEL } from '../../db/repo/finance';
import { Button, Card, CardHeader, Money, PageHeader, Stat, EmptyState } from '../../components/ui';
import { IncomeExpenseBars, NetArea, CategoryDonut } from '../../components/charts';
import { Icon } from '../../icons';
import { exportCSV, exportPDF, exportXLSX, type Report } from '../../services/export';
import { formatMoney, pct } from '../../lib/money';
import { lastMonths, monthShort, formatMonth } from '../../lib/dates';
import type { Engine } from '../../db/engine';
import type { ScopeFilter } from '../../db/types';
import clsx from 'clsx';
import { tr } from '../../lib/i18n';

type Kind = 'income' | 'expense' | 'cashflow' | 'savings' | 'debts' | 'categories' | 'monthly' | 'annual';
const KINDS: Array<{ k: Kind; label: string; icon: string }> = [
  { k: 'income', label: tr('Ingresos'), icon: 'income' }, { k: 'expense', label: tr('Gastos'), icon: 'expense' }, { k: 'cashflow', label: tr('Flujo de efectivo'), icon: 'transfer' },
  { k: 'savings', label: tr('Ahorros'), icon: 'savings' }, { k: 'debts', label: tr('Deudas'), icon: 'loan' }, { k: 'categories', label: tr('Gastos por categoría'), icon: 'budget' },
  { k: 'monthly', label: tr('Evolución mensual'), icon: 'reports' }, { k: 'annual', label: tr('Comparación anual'), icon: 'calendar' },
];

function buildReport(e: Engine, kind: Kind, sf: ScopeFilter, range: { from: string; to: string }, label: string, cur: 'PAB' | 'USD'): Report {
  const cats = listCategories(e, undefined, true);
  const accs = listAccounts(e, { includeArchived: true });
  const cname = (id: string | null) => { const c = cats.find((x) => x.id === id); const p = c?.parentId ? cats.find((x) => x.id === c.parentId) : null; return c ? (p ? `${p.name} › ${c.name}` : c.name) : tr('Sin categoría'); };
  const t = totals(e, range, sf);
  const base = { subtitle: label, summary: [{ label: tr('Ingresos'), value: formatMoney(t.income, cur) }, { label: tr('Gastos'), value: formatMoney(t.expense, cur) }, { label: tr('Balance'), value: formatMoney(t.net, cur) }, { label: tr('Tasa de ahorro'), value: `${t.income ? pct(t.net, t.income).toFixed(1) : '0'} %` }] };
  const txTable = (types: string[], name: string) => ({
    name, columns: [{ key: 'date', label: tr('Fecha') }, { key: 'description', label: tr('Descripción') }, { key: 'category', label: tr('Categoría') }, { key: 'account', label: tr('Cuenta') }, { key: 'currency', label: tr('Moneda') }, { key: 'amount', label: tr('Importe'), money: true }],
    rows: listTransactions(e, { ...range, scope: sf, types: types as never, limit: 100000 }).map((x) => ({ date: x.date, description: x.description, category: cname(x.categoryId), account: accs.find((a) => a.id === x.accountId)?.name ?? '', currency: x.currency, amount: x.amount })),
  });
  switch (kind) {
    case 'income': return { ...base, title: tr('Informe de ingresos'), tables: [{ name: tr('Por categoría'), columns: [{ key: 'name', label: tr('Categoría') }, { key: 'amount', label: tr('Total'), money: true }, { key: 'pct', label: '%' }], rows: expensesByCategory(e, range, sf, 'income').map((c) => ({ name: c.name, amount: c.amount, pct: pct(c.amount, t.income).toFixed(1) })) }, txTable(['income'], tr('Detalle de ingresos'))] };
    case 'expense': return { ...base, title: tr('Informe de gastos'), tables: [txTable(['expense', 'loan_payment', 'refund'], tr('Detalle de gastos'))] };
    case 'categories': return { ...base, title: tr('Gastos por categoría'), tables: [{ name: tr('Categorías'), columns: [{ key: 'name', label: tr('Categoría') }, { key: 'amount', label: tr('Total'), money: true }, { key: 'pct', label: tr('% del gasto') }], rows: expensesByCategory(e, range, sf).map((c) => ({ name: c.name, amount: c.amount, pct: pct(c.amount, t.expense).toFixed(1) })) }] };
    case 'cashflow': {
      const rows = listTransactions(e, { ...range, scope: sf, limit: 100000 }).reverse();
      let run = 0;
      return { ...base, title: tr('Flujo de efectivo'), tables: [{ name: tr('Entradas y salidas'), columns: [{ key: 'date', label: tr('Fecha') }, { key: 'type', label: tr('Tipo') }, { key: 'description', label: tr('Descripción') }, { key: 'in', label: tr('Entrada'), money: true }, { key: 'out', label: tr('Salida'), money: true }, { key: 'run', label: tr('Acumulado'), money: true }],
        rows: rows.filter((x) => x.type !== 'transfer' && x.type !== 'card_payment').map((x) => { const inc = ['income', 'refund', 'loan_disbursement'].includes(x.type); run += inc ? x.amount : -x.amount; return { date: x.date, type: TX_TYPE_LABEL[x.type], description: x.description, in: inc ? x.amount : null, out: inc ? null : x.amount, run }; }) }] };
    }
    case 'savings': {
      const goals = listGoals(e, sf);
      const s = monthlySeries(e, 12, sf);
      return { ...base, title: tr('Informe de ahorros'), tables: [
        { name: tr('Ahorro mensual'), columns: [{ key: 'month', label: tr('Mes') }, { key: 'income', label: tr('Ingresos'), money: true }, { key: 'expense', label: tr('Gastos'), money: true }, { key: 'net', label: tr('Ahorro'), money: true }, { key: 'rate', label: tr('Tasa %') }], rows: s.map((m) => ({ month: formatMonth(m.month), income: m.income, expense: m.expense, net: m.net, rate: m.income ? pct(m.net, m.income).toFixed(1) : '0' })) },
        { name: tr('Objetivos'), columns: [{ key: 'name', label: tr('Objetivo') }, { key: 'saved', label: tr('Ahorrado'), money: true }, { key: 'target', label: tr('Meta'), money: true }, { key: 'pct', label: '%' }, { key: 'date', label: tr('Fecha objetivo') }], rows: goals.map((g) => ({ name: g.name, saved: g.saved, target: g.target, pct: pct(g.saved, g.target).toFixed(0), date: g.targetDate ?? '' })) },
      ] };
    }
    case 'debts': {
      const b = balances(e);
      return { ...base, title: tr('Informe de deudas'), summary: [{ label: tr('Deuda en tarjetas'), value: formatMoney(b.cardDebt.PAB + b.cardDebt.USD, cur) }, ...base.summary.slice(0, 2)], tables: [{ name: tr('Préstamos y deudas'), columns: [{ key: 'name', label: tr('Deuda') }, { key: 'kind', label: tr('Tipo') }, { key: 'principal', label: tr('Monto original'), money: true }, { key: 'rate', label: tr('Tasa %') }, { key: 'paid', label: tr('Pagado'), money: true }, { key: 'interest', label: tr('Intereses'), money: true }, { key: 'balance', label: tr('Saldo pendiente'), money: true }],
        rows: listDebts(e, sf).map((d) => ({ name: d.name, kind: DEBT_KIND_LABEL[d.kind], principal: d.principal, rate: d.annualRate, paid: d.status.paidTotal, interest: d.status.paidInterest, balance: d.status.balance })) }] };
    }
    case 'monthly': return { ...base, title: tr('Evolución mensual'), subtitle: tr('Últimos 12 meses'), tables: [{ name: tr('Meses'), columns: [{ key: 'month', label: tr('Mes') }, { key: 'income', label: tr('Ingresos'), money: true }, { key: 'expense', label: tr('Gastos'), money: true }, { key: 'net', label: tr('Balance'), money: true }], rows: monthlySeries(e, 12, sf).map((m) => ({ month: formatMonth(m.month), income: m.income, expense: m.expense, net: m.net })) }] };
    case 'annual': {
      const y = new Date().getFullYear();
      const cur12 = monthlySeries(e, 12, sf, `${y}-12-15`);
      const prev12 = monthlySeries(e, 12, sf, `${y - 1}-12-15`);
      return { ...base, title: tr('Comparación anual {v0} vs {y}', { v0: y - 1, y }), subtitle: `${y - 1} – ${y}`, tables: [{ name: tr('Por mes'), columns: [{ key: 'm', label: tr('Mes') }, { key: 'pi', label: tr('Ingresos {v0}', { v0: y - 1 }), money: true }, { key: 'ci', label: tr('Ingresos {y}', { y }), money: true }, { key: 'pe', label: tr('Gastos {v0}', { v0: y - 1 }), money: true }, { key: 'ce', label: tr('Gastos {y}', { y }), money: true }],
        rows: cur12.map((m, i) => ({ m: monthShort(i), pi: prev12[i].income, ci: m.income, pe: prev12[i].expense, ce: m.expense })) }] };
    }
  }
}

export default function Reports() {
  const profile = useProfile();
  const sf = useScope();
  const e = useEngine();
  const { range, label } = useRange();
  const canExport = useCan('report.export');
  const toast = useApp((s) => s.toast);
  const [kind, setKind] = useState<Kind>('expense');
  const [busy, setBusy] = useState<string | null>(null);
  const cur = profile.primaryCurrency;
  const rev = useApp((s) => s.revision);
  const report = useMemo(() => buildReport(e, kind, sf, range, label, cur), [e, kind, sf, range, label, rev]);
  const series = useQuery((en) => monthlySeries(en, 12, sf), [sf]);
  const cats = useQuery((en) => expensesByCategory(en, range, sf), [range, sf]);
  const annual = useQuery((en) => { const y = new Date().getFullYear(); const c = monthlySeries(en, 12, sf, `${y}-12-15`); const p = monthlySeries(en, 12, sf, `${y - 1}-12-15`); return c.map((m, i) => ({ ...m, label: monthShort(i), income: p[i].expense, expense: m.expense })); }, [sf]);
  void lastMonths;

  const run = async (fmt: 'csv' | 'xlsx' | 'pdf') => {
    setBusy(fmt);
    try {
      const slug = KINDS.find((k) => k.k === kind)!.label.toLowerCase().replace(/\s+/g, '-');
      const p = fmt === 'csv' ? await exportCSV(report, slug) : fmt === 'xlsx' ? await exportXLSX(report, slug) : await exportPDF(report, slug);
      if (p) toast({ kind: 'success', title: tr('Informe exportado'), body: p });
    } catch (err) { toast({ kind: 'error', title: tr('No se pudo exportar'), body: (err as Error).message }); }
    setBusy(null);
  };

  const main = report.tables[0];
  return (
    <div>
      <PageHeader title={tr('Informes')} subtitle={`${label}${sf.scope === 'family' ? ' · Hogar' : ''}`} actions={canExport && <>
        <Button variant="secondary" icon="download" loading={busy === 'csv'} onClick={() => run('csv')}>{tr('CSV')}</Button>
        <Button variant="secondary" icon="download" loading={busy === 'xlsx'} onClick={() => run('xlsx')}>{tr('Excel')}</Button>
        <Button icon="download" loading={busy === 'pdf'} onClick={() => run('pdf')}>{tr('PDF')}</Button>
      </>} />
      <div className="flex flex-wrap gap-2 mb-5">
        {KINDS.map((k) => <button key={k.k} onClick={() => setKind(k.k)} className={clsx('group inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12.5px] font-medium border transition', kind === k.k ? 'bg-brand text-brand-ink border-brand dark:bg-emerald dark:text-[#06140D]' : 'bg-surface border-line text-ink-2 hover:bg-surface-2')}><Icon name={k.icon} size={15} active={kind === k.k} />{k.label}</button>)}
      </div>
      <div className="grid grid-cols-4 gap-5 mb-5">{report.summary?.slice(0, 4).map((s, i) => <Card key={s.label} delay={i * 0.04} className="p-5"><Stat label={s.label} value={s.value} /></Card>)}</div>
      <div className="grid grid-cols-12 gap-5 mb-5">
        <Card className="col-span-8">
          <CardHeader title={kind === 'annual' ? tr('Gastos: año anterior vs actual') : kind === 'savings' || kind === 'cashflow' ? tr('Ahorro neto mensual') : tr('Ingresos y gastos')} subtitle={tr('Últimos 12 meses')} />
          <div className="px-3 pb-3">{kind === 'savings' || kind === 'cashflow' ? <NetArea data={series} currency={cur} height={230} /> : <IncomeExpenseBars data={kind === 'annual' ? annual : series} currency={cur} height={230} />}</div>
        </Card>
        <Card className="col-span-4">
          <CardHeader title={tr('Gastos por categoría')} subtitle={label} />
          {cats.length ? <div className="grid place-items-center p-5"><CategoryDonut data={cats.slice(0, 8)} currency={cur} size={200} /></div> : <EmptyState icon="budget" title={tr('Sin gastos')} />}
        </Card>
      </div>
      {report.tables.map((tb) => (
        <Card key={tb.name} hover={false} className="mb-5">
          <CardHeader title={tb.name} subtitle={`${tb.rows.length} filas`} />
          <div className="p-3 max-h-[420px] overflow-auto">
            <table className="w-full text-[12.5px] num">
              <thead className="sticky top-0 bg-surface text-muted"><tr>{tb.columns.map((c) => <th key={c.key} className={clsx('py-2 px-2 font-medium', c.money ? 'text-right' : 'text-left')}>{c.label}</th>)}</tr></thead>
              <tbody>{tb.rows.slice(0, 500).map((r, i) => <tr key={i} className="border-t border-line/50 hover:bg-surface-2">{tb.columns.map((c) => <td key={c.key} className={clsx('py-2 px-2', c.money && 'text-right')}>{c.money && typeof r[c.key] === 'number' ? <Money cents={r[c.key] as number} currency={cur} /> : String(r[c.key] ?? '')}</td>)}</tr>)}</tbody>
            </table>
            {!tb.rows.length && <p className="text-center text-[12.5px] text-muted py-8">{tr('Sin datos para este periodo.')}</p>}
          </div>
        </Card>
      ))}
      {main && main.rows.length > 500 && <p className="text-[12px] text-muted">{tr('Se muestran 500 filas; la exportación incluye todas.')}</p>}
    </div>
  );
}
