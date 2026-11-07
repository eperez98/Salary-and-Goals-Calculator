import { motion } from 'motion/react';
import clsx from 'clsx';
import { Icon } from '../../icons';
import { Wordmark } from '../../brand/Logo';
import { useApp, type RouteKey } from '../../store/app';
import { useActor, useProfile, useQuery } from '../../hooks/useDb';
import { listMembers } from '../../db/repo/core';
import { balances, upcoming } from '../../db/repo/analytics';
import { Avatar, Money } from '../ui';
import { formatDate } from '../../lib/dates';
import { ROLE_LABEL } from '../../domain/permissions';
import { tr } from '../../lib/i18n';

const NAV: Array<{ key: RouteKey; label: string; icon: string; family?: boolean }> = [
  { key: 'dashboard', label: tr('Resumen'), icon: 'dashboard' },
  { key: 'transactions', label: tr('Movimientos'), icon: 'transactions' },
  { key: 'accounts', label: tr('Cuentas y tarjetas'), icon: 'bank' },
  { key: 'income', label: tr('Ingresos y salario'), icon: 'salary' },
  { key: 'plan', label: tr('Plan mensual'), icon: 'savings' },
  { key: 'budgets', label: tr('Presupuestos'), icon: 'budget' },
  { key: 'goals', label: tr('Objetivos'), icon: 'goal' },
  { key: 'debts', label: tr('Préstamos y deudas'), icon: 'loan' },
  { key: 'family', label: tr('Familia'), icon: 'family', family: true },
  { key: 'calendar', label: tr('Calendario'), icon: 'calendar' },
  { key: 'reports', label: tr('Informes'), icon: 'reports' },
  { key: 'insights', label: tr('Análisis'), icon: 'insights' },
];

export function Sidebar({ onSwitchMember }: { onSwitchMember: () => void }) {
  const route = useApp((s) => s.route);
  const go = useApp((s) => s.go);
  const actor = useActor();
  const profile = useProfile();
  const members = useQuery((e) => listMembers(e));
  const me = members.find((m) => m.id === actor.id);
  const { accounts } = useQuery((e) => balances(e, profile.mode === 'individual' ? undefined : actor.id), [actor.id, profile.mode]);
  const next = useQuery((e) => upcoming(e, { scope: 'personal', memberId: actor.id }, 45).find((u) => u.kind !== 'income'), [actor.id]);

  return (
    <aside className="w-[244px] shrink-0 h-full flex flex-col bg-surface-2/70 border-r border-line/70 backdrop-blur">
      <div className="px-5 pt-6 pb-5"><Wordmark /></div>
      <nav className="px-3 space-y-0.5" aria-label={tr('Principal')}>
        {NAV.filter((n) => !n.family || profile.mode !== 'individual').map((n) => {
          const active = route === n.key;
          return (
            <button key={n.key} onClick={() => go(n.key)} className={clsx('group relative w-full flex items-center gap-3 h-9 px-3 rounded-[11px] text-[13px] transition-colors', active ? 'text-ink font-semibold' : 'text-ink-2 hover:text-ink hover:bg-surface-3/70')}>
              {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-[11px] bg-surface shadow-card border border-line/60" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <Icon name={n.icon} size={18} active={active} className={clsx('relative z-10 transition-colors', active ? 'text-brand-2 dark:text-emerald' : 'text-muted group-hover:text-ink-2')} />
              <span className="relative z-10 truncate">{n.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="px-5 mt-6 mb-2 flex items-center justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">{tr('Cuentas')}</p>
        <button onClick={() => go('accounts')} className="text-muted hover:text-ink" aria-label={tr('Gestionar cuentas')}><Icon name="plus" size={14} /></button>
      </div>
      <div className="px-3 flex-1 overflow-y-auto space-y-0.5 min-h-0">
        {accounts.slice(0, 8).map((a) => (
          <button key={a.id} onClick={() => go('accounts')} className="w-full flex items-center gap-2.5 px-3 h-8 rounded-[10px] text-[12.5px] text-ink-2 hover:bg-surface-3/70">
            <span className="size-1.5 rounded-full" style={{ background: a.color }} />
            <span className="truncate flex-1 text-left">{a.name}</span>
            <Money cents={a.balance} currency={a.currency} compact className={clsx('text-[11.5px]', a.balance < 0 ? 'text-coral' : 'text-muted')} />
          </button>
        ))}
        {!accounts.length && <p className="px-3 text-[12px] text-muted">{tr('Sin cuentas todavía')}</p>}
      </div>
      <div className="p-3 space-y-2">
        {next && (
          <button onClick={() => go('calendar')} className="w-full text-left rounded-[16px] bg-surface border border-line/70 px-3.5 py-3 hover:shadow-card transition">
            <p className="text-[10.5px] text-muted">{tr('Próximo pago')}</p>
            <p className="text-[12.5px] font-semibold text-ink truncate mt-0.5">{next.title}</p>
            <p className="text-[11.5px] text-ink-2 mt-0.5">{formatDate(next.date, 'day')} · <Money cents={next.amount} currency={next.currency} /></p>
          </button>
        )}
        <div className="flex items-center gap-2">
          <button onClick={onSwitchMember} className="flex-1 min-w-0 flex items-center gap-2.5 rounded-[14px] px-2 py-2 hover:bg-surface-3/70 transition" title={tr('Cambiar de integrante')}>
            {me && <Avatar name={me.name} color={me.color} emoji={me.emoji} size={30} />}
            <span className="min-w-0 text-left">
              <span className="block text-[12.5px] font-semibold text-ink truncate">{me?.name}</span>
              <span className="block text-[11px] text-muted truncate">{me ? ROLE_LABEL[me.role] : ''}</span>
            </span>
          </button>
          <button onClick={() => go('settings')} className={clsx('group grid place-items-center size-9 rounded-full hover:bg-surface-3', route === 'settings' ? 'text-ink bg-surface-3' : 'text-muted')} aria-label={tr('Configuración')} title={tr('Configuración')}>
            <Icon name="settings" size={18} active={route === 'settings'} />
          </button>
        </div>
      </div>
    </aside>
  );
}
