import { useMemo } from 'react';
import { useApp } from '../store/app';
import { periodRange, previousRange, formatDate, formatMonth, type Range } from '../lib/dates';
import { tr } from '../lib/i18n';

export const PERIOD_LABEL = { day: tr('Hoy'), week: tr('Esta semana'), month: tr('Este mes'), quarter: tr('Este trimestre'), year: tr('Este año'), custom: tr('Rango personalizado') } as const;

export function useRange(): { range: Range; prev: Range; label: string; kind: keyof typeof PERIOD_LABEL } {
  const kind = useApp((s) => s.period);
  const custom = useApp((s) => s.customRange);
  return useMemo(() => {
    const range = periodRange(kind, undefined, custom ?? undefined);
    const prev = previousRange(kind, range);
    const label = kind === 'month' ? formatMonth(range.from.slice(0, 7)) : kind === 'custom' ? `${formatDate(range.from)} – ${formatDate(range.to)}` : PERIOD_LABEL[kind];
    return { range, prev, label, kind };
  }, [kind, custom]);
}
