import { useState } from 'react';
import { useApp } from '../../store/app';
import { useCan, useProfile, useQuery, useScope, useMe } from '../../hooks/useDb';
import { alerts } from '../../db/repo/analytics';
import { Button, IconButton, Segmented, Input, Modal } from '../ui';
import { formatMonth, greeting, monthKey, today, type PeriodKind } from '../../lib/dates';
import { Icon } from '../../icons';
import { tr } from '../../lib/i18n';

export const PERIODS: Array<{ value: PeriodKind; label: string }> = [
  { value: 'day', label: tr('Día') }, { value: 'week', label: tr('Semana') }, { value: 'month', label: tr('Mes') }, { value: 'quarter', label: tr('Trimestre') }, { value: 'year', label: tr('Año') }, { value: 'custom', label: tr('Rango') },
];

export function Topbar() {
  const profile = useProfile();
  const me = useMe();
  const scope = useApp((s) => s.scope);
  const setScope = useApp((s) => s.setScope);
  const period = useApp((s) => s.period);
  const setPeriod = useApp((s) => s.setPeriod);
  const customRange = useApp((s) => s.customRange);
  const openTx = useApp((s) => s.openTx);
  const setNotif = useApp((s) => s.setNotificationsOpen);
  const route = useApp((s) => s.route);
  const sf = useScope();
  const count = useQuery((e) => alerts(e, sf).length, [sf]);
  const canCreate = useCan('tx.create');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [from, setFrom] = useState(customRange?.from ?? `${monthKey(today())}-01`);
  const [to, setTo] = useState(customRange?.to ?? today());
  const showPeriod = route === 'dashboard' || route === 'transactions' || route === 'reports';

  return (
    <header className="flex items-center gap-4 px-8 pt-6 pb-4">
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] text-muted">{formatMonth(monthKey(today()))}{profile.householdName && scope === 'family' ? ` · ${profile.householdName}` : ''}</p>
        <h2 className="text-[21px] font-semibold tracking-[-0.035em] text-ink truncate">{greeting()}, <span>{me?.name.split(' ')[0]}</span></h2>
      </div>
      {profile.mode !== 'individual' && (
        <Segmented size="sm" layoutId="scope" value={scope} onChange={setScope} options={[{ value: 'personal', label: <><Icon name="user" size={13} />{tr('Personal')}</> }, { value: 'family', label: <><Icon name="family" size={13} />{tr('Hogar')}</> }]} />
      )}
      {showPeriod && (
        <Segmented size="sm" layoutId="period" value={period} onChange={(v) => (v === 'custom' ? setRangeOpen(true) : setPeriod(v))} options={PERIODS} />
      )}
      <IconButton icon="bell" label={tr('Notificaciones')} badge={count} onClick={() => setNotif(true)} />
      {canCreate && <Button icon="plus" onClick={() => openTx()}>{tr('Movimiento')}</Button>}
      <Modal open={rangeOpen} onClose={() => setRangeOpen(false)} title={tr('Rango personalizado')} width={420} icon="calendar"
        footer={<><Button variant="ghost" onClick={() => setRangeOpen(false)}>{tr('Cancelar')}</Button><Button disabled={!from || !to || from > to} onClick={() => { setPeriod('custom', { from, to }); setRangeOpen(false); }}>{tr('Aplicar')}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[12px] text-ink-2">{tr('Desde')}<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1.5" /></label>
          <label className="text-[12px] text-ink-2">{tr('Hasta')}<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1.5" /></label>
        </div>
      </Modal>
    </header>
  );
}
