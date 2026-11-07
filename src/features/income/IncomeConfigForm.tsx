import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChoiceCard, Field, Input, MoneyInput, Select, Toggle, Money, EstimateTag } from '../../components/ui';
import { estimateIncome, FREQUENCY_LABEL, PANAMA_DEDUCTIONS, type Frequency, type IncomeConfig } from '../../domain/salary';
import { parseMoney, centsToInput, type Currency } from '../../lib/money';
import { weekdayName } from '../../lib/dates';
import { tr } from '../../lib/i18n';

export interface IncomeDraft {
  frequency: Frequency; amount1: string; amount2: string; sameAmount: boolean; hourlyRate: string; hoursPerWeek: string; schedule: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  payDay1: number; payDay2: number; weekday: number; anchorDate: string; adjustBusinessDay: boolean; panamaDeductions: boolean; extraDeductionName: string; extraDeduction: string; includeDecimo: boolean;
}

export const FREQ_ICON: Record<Frequency, string> = { weekly: 'calendar', biweekly: 'repeat', semimonthly: 'salary', monthly: 'bank', hourly: 'freelance', variable: 'investment', other: 'other' };
export const FREQ_DESC: Record<Frequency, string> = {
  weekly: tr('Cobro cada semana'), biweekly: tr('Cada 14 días'), semimonthly: tr('Dos pagos al mes (15 y 30)'), monthly: tr('Un pago al mes'), hourly: tr('Tarifa por hora trabajada'), variable: tr('Ingresos que cambian cada mes'), other: tr('Otra forma de cobro'),
};

export function emptyDraft(today: string): IncomeDraft {
  return { frequency: 'semimonthly', amount1: '', amount2: '', sameAmount: true, hourlyRate: '', hoursPerWeek: '40', schedule: 'semimonthly', payDay1: 15, payDay2: 30, weekday: 5, anchorDate: today, adjustBusinessDay: true, panamaDeductions: false, extraDeductionName: '', extraDeduction: '', includeDecimo: false };
}

export function draftFromConfig(c: IncomeConfig, today: string): IncomeDraft {
  const d = emptyDraft(today);
  const custom = c.deductions?.find((x) => !x.preset);
  return {
    ...d, frequency: c.frequency, amount1: c.amount1 ? centsToInput(c.amount1) : '', amount2: c.amount2 ? centsToInput(c.amount2) : '', sameAmount: c.sameAmount !== false,
    hourlyRate: c.hourlyRate ? centsToInput(c.hourlyRate) : '', hoursPerWeek: String(c.hoursPerWeek ?? 40), schedule: c.schedule ?? 'semimonthly',
    payDay1: c.payDay1 ?? (c.frequency === 'monthly' ? 30 : 15), payDay2: c.payDay2 ?? 30, weekday: c.weekday ?? 5, anchorDate: c.anchorDate ?? today,
    adjustBusinessDay: !!c.adjustBusinessDay, panamaDeductions: !!c.deductions?.some((x) => x.preset), extraDeductionName: custom?.name ?? '', extraDeduction: custom ? centsToInput(custom.value) : '', includeDecimo: !!c.includeDecimo,
  };
}

export function draftToConfig(d: IncomeDraft): IncomeConfig {
  const n = (s: string) => { const v = parseMoney(s); return Number.isNaN(v) ? 0 : v; };
  const deductions = [...(d.panamaDeductions ? PANAMA_DEDUCTIONS : [])];
  if (d.extraDeductionName.trim() && n(d.extraDeduction) > 0) deductions.push({ name: d.extraDeductionName.trim(), type: 'fixed', value: n(d.extraDeduction) });
  return {
    frequency: d.frequency, amount1: n(d.amount1), amount2: d.sameAmount ? undefined : n(d.amount2), sameAmount: d.sameAmount,
    hourlyRate: d.frequency === 'hourly' ? n(d.hourlyRate) : undefined, hoursPerWeek: d.frequency === 'hourly' ? Number(d.hoursPerWeek) || 0 : undefined,
    schedule: d.frequency === 'hourly' ? d.schedule : undefined,
    payDay1: d.frequency === 'semimonthly' || d.frequency === 'monthly' || (d.frequency === 'hourly' && (d.schedule === 'semimonthly' || d.schedule === 'monthly')) ? d.payDay1 : undefined,
    payDay2: d.frequency === 'semimonthly' || (d.frequency === 'hourly' && d.schedule === 'semimonthly') ? d.payDay2 : undefined,
    weekday: d.frequency === 'weekly' || (d.frequency === 'hourly' && d.schedule === 'weekly') ? d.weekday : undefined,
    anchorDate: d.frequency === 'biweekly' || (d.frequency === 'hourly' && d.schedule === 'biweekly') ? d.anchorDate : undefined,
    adjustBusinessDay: d.adjustBusinessDay, deductions, includeDecimo: d.includeDecimo,
  };
}

const days = Array.from({ length: 31 }, (_, i) => i + 1);

/** `net`: amounts are entered after deductions (take-home pay), so deduction options are hidden. */
export function IncomeConfigForm({ draft, set, currency, compact = false, net = false }: { draft: IncomeDraft; set: (p: Partial<IncomeDraft>) => void; currency: Currency; compact?: boolean; net?: boolean }) {
  const cfg = useMemo(() => draftToConfig(draft), [draft]);
  const est = useMemo(() => estimateIncome(cfg), [cfg]);
  const f = draft.frequency;
  const sched = f === 'hourly' ? draft.schedule : f;
  return (
    <div className="space-y-5">
      <div className={`grid gap-2.5 ${compact ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {(Object.keys(FREQUENCY_LABEL) as Frequency[]).filter((k) => !compact || k !== 'other').map((k) => (
          <ChoiceCard key={k} selected={f === k} onClick={() => set({ frequency: k, payDay1: k === 'monthly' ? 30 : draft.payDay1 === 30 && k === 'semimonthly' ? 15 : draft.payDay1 })} icon={FREQ_ICON[k]} title={k === 'biweekly' ? tr('Bisemanal') : FREQUENCY_LABEL[k].split(' (')[0]} description={compact ? undefined : FREQ_DESC[k]} className="!p-3.5" />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={f} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="space-y-4">
          {f === 'semimonthly' && (
            <>
              <Toggle checked={draft.sameAmount} onChange={(v) => set({ sameAmount: v })} label={tr('Ambas quincenas tienen el mismo importe')} description={tr('Desactívalo si tu primera y segunda quincena son distintas.')} />
              <div className="grid grid-cols-2 gap-3">
                <Field label={net ? (draft.sameAmount ? tr('Salario por quincena (neto, lo que recibes)') : tr('Primera quincena (neto)')) : draft.sameAmount ? tr('Salario por quincena (bruto)') : tr('Primera quincena (bruto)')}><MoneyInput currency={currency} value={draft.amount1} onChange={(v) => set({ amount1: v })} aria-label={tr('Primera quincena')} /></Field>
                {!draft.sameAmount && <Field label={net ? tr('Segunda quincena (neto)') : tr('Segunda quincena (bruto)')}><MoneyInput currency={currency} value={draft.amount2} onChange={(v) => set({ amount2: v })} aria-label={tr('Segunda quincena')} /></Field>}
              </div>
            </>
          )}
          {(f === 'weekly' || f === 'biweekly' || f === 'monthly') && (
            <Field label={net ? (f === 'monthly' ? tr('Salario mensual (neto, lo que recibes)') : f === 'weekly' ? tr('Pago semanal (neto)') : tr('Pago cada 2 semanas (neto)')) : f === 'monthly' ? tr('Salario mensual (bruto)') : f === 'weekly' ? tr('Pago semanal (bruto)') : tr('Pago cada 2 semanas (bruto)')}><MoneyInput currency={currency} value={draft.amount1} onChange={(v) => set({ amount1: v })} aria-label={tr('Importe')} /></Field>
          )}
          {f === 'hourly' && (
            <div className="grid grid-cols-3 gap-3">
              <Field label={tr('Tarifa por hora')}><MoneyInput currency={currency} value={draft.hourlyRate} onChange={(v) => set({ hourlyRate: v })} aria-label={tr('Tarifa por hora')} /></Field>
              <Field label={tr('Horas por semana')}><Input type="number" min={0} max={168} value={draft.hoursPerWeek} onChange={(e) => set({ hoursPerWeek: e.target.value })} /></Field>
              <Field label={tr('Te pagan')}><Select value={draft.schedule} onChange={(e) => set({ schedule: e.target.value as IncomeDraft['schedule'] })}><option value="weekly">{tr('Semanal')}</option><option value="biweekly">{tr('Cada 2 semanas')}</option><option value="semimonthly">{tr('Quincenal')}</option><option value="monthly">{tr('Mensual')}</option></Select></Field>
            </div>
          )}
          {(f === 'variable' || f === 'other') && (
            <Field label={tr('Estimado mensual inicial (opcional)')} hint={tr('Monto calculará tu promedio real a partir de los ingresos que registres.')}>
              <MoneyInput currency={currency} value={draft.amount1} onChange={(v) => set({ amount1: v })} aria-label={tr('Estimado mensual')} />
            </Field>
          )}

          {(sched === 'semimonthly' || sched === 'monthly') && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={sched === 'monthly' ? tr('Día de pago') : tr('Día de la primera quincena')}><Select value={draft.payDay1} onChange={(e) => set({ payDay1: Number(e.target.value) })}>{days.map((d) => <option key={d} value={d}>{d === 31 ? tr('Último día del mes') : tr('Día {d}', { d })}</option>)}</Select></Field>
              {sched === 'semimonthly' && <Field label={tr('Día de la segunda quincena')}><Select value={draft.payDay2} onChange={(e) => set({ payDay2: Number(e.target.value) })}>{days.map((d) => <option key={d} value={d}>{d >= 30 ? tr('Día {d} (o último día)', { d }) : tr('Día {d}', { d })}</option>)}</Select></Field>}
            </div>
          )}
          {sched === 'weekly' && <Field label={tr('Día de cobro')}><Select value={draft.weekday} onChange={(e) => set({ weekday: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6, 0].map((w) => <option key={w} value={w}>{weekdayName(w)}</option>)}</Select></Field>}
          {sched === 'biweekly' && <Field label={tr('Fecha de un pago reciente')}><Input type="date" value={draft.anchorDate} onChange={(e) => set({ anchorDate: e.target.value })} /></Field>}

          {f !== 'variable' && f !== 'other' && (
            <div className="rounded-[18px] border border-line bg-surface-2 p-4 space-y-3.5">
              {sched !== 'weekly' && sched !== 'biweekly' && <Toggle checked={draft.adjustBusinessDay} onChange={(v) => set({ adjustBusinessDay: v })} label={tr('Pago adelantado en fines de semana')} description={tr('Si el día de pago cae sábado o domingo, se espera el viernes anterior.')} />}
              {!net && <Toggle checked={draft.panamaDeductions} onChange={(v) => set({ panamaDeductions: v })} label={tr('Aplicar descuentos de ley (Panamá)')} description={tr('CSS 9.75 % y Seguro Educativo 1.25 % sobre el salario bruto.')} />}
              <Toggle checked={draft.includeDecimo} onChange={(v) => set({ includeDecimo: v })} label={tr('Incluir décimo tercer mes')} description={tr('Estimado en tres partidas: 15 de abril, 15 de agosto y 15 de diciembre.')} />
              {!net && <div className="grid grid-cols-[1fr_160px] gap-3">
                <Field label={tr('Otro descuento por pago (opcional)')}><Input placeholder={tr('Ej. Préstamo de cooperativa')} value={draft.extraDeductionName} onChange={(e) => set({ extraDeductionName: e.target.value })} /></Field>
                <Field label={tr('Importe')}><MoneyInput currency={currency} value={draft.extraDeduction} onChange={(v) => set({ extraDeduction: v })} aria-label={tr('Importe del descuento')} /></Field>
              </div>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <motion.div layout className="rounded-[20px] hero-surface text-[#F5F3EE] p-5">
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-white/60">{tr('Cálculo automático')}</p>
          <EstimateTag />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          {f === 'semimonthly' ? (
            <>
              <div><p className="text-[11px] text-white/55">{tr('1.ª quincena (neto)')}</p><Money animated cents={est.payments[0]?.net ?? 0} currency={currency} className="text-[18px] font-semibold" /></div>
              <div><p className="text-[11px] text-white/55">{tr('2.ª quincena (neto)')}</p><Money animated cents={est.payments[1]?.net ?? 0} currency={currency} className="text-[18px] font-semibold" /></div>
            </>
          ) : (
            <div className="col-span-2"><p className="text-[11px] text-white/55">{est.payments[0]?.label ?? tr('Por pago')}{' '}{tr('(neto)')}</p><Money animated cents={est.payments[0]?.net ?? 0} currency={currency} className="text-[18px] font-semibold" /></div>
          )}
          <div><p className="text-[11px] text-white/55">{tr('Pagos al año')}</p><p className="text-[18px] font-semibold num">{est.paymentsPerYear}</p></div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
          {net ? <div /> : <div><p className="text-[11px] text-white/55">{tr('Ingreso mensual bruto')}</p><Money animated cents={est.monthlyGross} currency={currency} className="text-[15px] font-semibold" /></div>}
          <div><p className="text-[11px] text-white/55">{tr('Ingreso mensual neto')}</p><Money animated cents={est.monthlyNet} currency={currency} className="text-[22px] font-semibold text-[#5BE0A8]" /></div>
          <div><p className="text-[11px] text-white/55">{tr('Ingreso anual')}{' '}{est.decimoGross ? tr('(con décimo)') : ''}</p><Money animated cents={est.annualGross} currency={currency} className="text-[15px] font-semibold" /></div>
        </div>
      </motion.div>
    </div>
  );
}
