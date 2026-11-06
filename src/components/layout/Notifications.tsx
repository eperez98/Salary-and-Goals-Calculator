import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { useApp } from '../../store/app';
import { useEngine, useMutate, useQuery, useScope } from '../../hooks/useDb';
import { alerts, dismissAlert, type Alert } from '../../db/repo/analytics';
import { Icon } from '../../icons';
import { EmptyState, IconButton, EstimateTag, ease } from '../ui';
import { tr } from '../../lib/i18n';

const TONE: Record<Alert['level'], string> = { info: 'bg-blue-soft text-blue', success: 'bg-emerald-soft text-emerald', warning: 'bg-amber-soft text-amber', danger: 'bg-coral-soft text-coral' };
const ICON: Record<Alert['kind'], string> = { budget: 'budget', duplicate: 'alert', income: 'salary', debt: 'calendar', recurring: 'repeat', insight: 'insights', goal: 'goal', backup: 'database' };

export function AlertRow({ a, onDismiss, onOpen }: { a: Alert; onDismiss?: () => void; onOpen?: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }} className="group flex items-start gap-3 rounded-[16px] p-3 hover:bg-surface-2 transition">
      <span className={clsx('grid place-items-center size-9 rounded-[11px] shrink-0', TONE[a.level])}><Icon name={ICON[a.kind]} size={17} active /></span>
      <button className="flex-1 min-w-0 text-left" onClick={onOpen}>
        <p className="text-[13px] font-semibold text-ink flex items-center gap-2">{a.title}{a.estimated && <EstimateTag />}</p>
        <p className="text-[12px] text-muted mt-0.5 leading-snug">{a.body}</p>
      </button>
      {onDismiss && <span className="opacity-0 group-hover:opacity-100 transition"><IconButton icon="close" label={tr('Descartar')} size={28} onClick={onDismiss} /></span>}
    </motion.div>
  );
}

export function NotificationsPanel() {
  const open = useApp((s) => s.notificationsOpen);
  const setOpen = useApp((s) => s.setNotificationsOpen);
  const go = useApp((s) => s.go);
  const sf = useScope();
  const list = useQuery((e) => alerts(e, sf), [sf]);
  const mutate = useMutate();
  useEngine();
  const target: Record<Alert['kind'], Parameters<typeof go>[0]> = { budget: 'budgets', duplicate: 'transactions', income: 'income', debt: 'calendar', recurring: 'calendar', insight: 'insights', goal: 'goals', backup: 'settings' };
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.3, ease }}
            className="fixed top-4 right-4 bottom-4 z-50 w-[400px] rounded-[26px] bg-surface/95 backdrop-blur-xl border border-line shadow-pop flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div><h3 className="text-[17px] font-semibold tracking-[-0.02em]">{tr('Notificaciones')}</h3><p className="text-[12px] text-muted">{list.length ? `${list.length} pendientes` : tr('Todo al día')}</p></div>
              <IconButton icon="close" label={tr('Cerrar')} onClick={() => setOpen(false)} />
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-3">
              <AnimatePresence initial={false}>
                {list.map((a) => <AlertRow key={a.key} a={a} onDismiss={() => mutate((e) => dismissAlert(e, a.key))} onOpen={() => { go(target[a.kind]); setOpen(false); }} />)}
              </AnimatePresence>
              {!list.length && <EmptyState icon="bell" title={tr('Sin notificaciones')} body={tr('Te avisaremos de presupuestos, pagos próximos, posibles duplicados y salarios por confirmar.')} />}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
