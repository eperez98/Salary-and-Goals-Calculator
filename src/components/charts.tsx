import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { formatMoney, type Currency } from '../lib/money';
import { useMotionOK } from './ui';
import type { MonthPoint, CategorySlice } from '../db/repo/analytics';
import { tr } from '../lib/i18n';

function TipBox({ active, payload, label, currency }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; payload: Record<string, unknown> }>; label?: string; currency: Currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[14px] bg-surface/95 backdrop-blur border border-line shadow-pop px-3 py-2.5 text-[12px]">
      {label && <p className="font-semibold text-ink mb-1 capitalize">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-ink-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />{p.name}
          <span className="ml-auto pl-4 font-semibold text-ink num">{formatMoney(p.value, currency)}</span>
        </p>
      ))}
    </div>
  );
}

export function IncomeExpenseBars({ data, currency, height = 220 }: { data: MonthPoint[]; currency: Currency; height?: number }) {
  const ok = useMotionOK();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barGap={4} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
        <YAxis hide />
        <Tooltip cursor={{ fill: 'var(--surface-3)', radius: 12 }} content={<TipBox currency={currency} />} />
        <Bar name={tr('Ingresos')} dataKey="income" fill="var(--brand-2)" radius={[10, 10, 10, 10]} maxBarSize={26} isAnimationActive={ok} animationDuration={1100} />
        <Bar name={tr('Gastos')} dataKey="expense" fill="var(--sage)" radius={[10, 10, 10, 10]} maxBarSize={26} isAnimationActive={ok} animationDuration={1100} animationBegin={150} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NetArea({ data, currency, height = 200 }: { data: MonthPoint[]; currency: Currency; height?: number }) {
  const ok = useMotionOK();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--emerald)" stopOpacity={0.35} /><stop offset="1" stopColor="var(--emerald)" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
        <YAxis hide />
        <Tooltip content={<TipBox currency={currency} />} />
        <Area name={tr('Ahorro neto')} type="monotone" dataKey="net" stroke="var(--emerald)" strokeWidth={2.5} fill="url(#netFill)" isAnimationActive={ok} animationDuration={1400} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({ data, currency, size = 180 }: { data: CategorySlice[]; currency: Currency; size?: number }) {
  const ok = useMotionOK();
  const total = data.reduce((a, d) => a + d.amount, 0);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={data.length > 1 ? 2 : 0} cornerRadius={6} stroke="none" isAnimationActive={ok} animationDuration={1100}>
            {data.map((d) => <Cell key={d.categoryId} fill={d.color} />)}
          </Pie>
          <Tooltip content={<TipBox currency={currency} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
        <div><p className="text-[10.5px] text-muted">{tr('Total')}</p><p className="text-[15px] font-semibold num">{formatMoney(total, currency, { compact: true })}</p></div>
      </div>
    </div>
  );
}
