import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react';
import clsx from 'clsx';
import { Icon } from '../../icons';
import { useApp } from '../../store/app';
import { formatMoney, type Currency } from '../../lib/money';
import { tr } from '../../lib/i18n';

export const ease = [0.22, 1, 0.36, 1] as const;

export function useMotionOK() {
  const sys = useReducedMotion();
  const pref = useApp((s) => s.reducedMotion);
  return !(sys || pref);
}

// ------------------------------------------------------------------ Card
export function Card({ children, className, delay = 0, hover = true, as = 'section', onClick }: { children: ReactNode; className?: string; delay?: number; hover?: boolean; as?: 'section' | 'div' | 'button'; onClick?: () => void }) {
  const ok = useMotionOK();
  const C = as === 'button' ? motion.button : as === 'div' ? motion.div : motion.section;
  return (
    <C
      onClick={onClick}
      initial={ok ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: ok ? delay : 0, ease }}
      whileHover={hover && ok ? { y: -2 } : undefined}
      className={clsx('rounded-[22px] bg-surface border border-line/70 shadow-card transition-shadow duration-300', hover && 'hover:shadow-pop/20', onClick && 'cursor-pointer text-left', className)}
    >
      {children}
    </C>
  );
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-ink tracking-[-0.01em]">{title}</h3>
        {subtitle && <p className="text-[12px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ------------------------------------------------------------------ Buttons
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'emerald';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand text-brand-ink hover:bg-brand-2 dark:bg-emerald dark:text-[#06140D] dark:hover:brightness-110 shadow-[0_6px_16px_-8px_rgb(18_41_31/0.6)]',
  secondary: 'bg-surface border border-line text-ink hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink',
  danger: 'bg-coral text-white hover:brightness-105',
  emerald: 'bg-emerald text-white hover:brightness-105',
};
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: BtnVariant; icon?: string; size?: 'sm' | 'md' | 'lg'; loading?: boolean }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', icon, size = 'md', className, children, loading, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'group inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
        size === 'sm' ? 'h-8 px-3.5 text-[12.5px]' : size === 'lg' ? 'h-12 px-6 text-[15px]' : 'h-10 px-4.5 text-[13.5px]',
        BTN[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <span className="size-4 rounded-full border-2 border-current border-r-transparent animate-spin" /> : icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  );
});

export function IconButton({ icon, label, onClick, className, active, badge, size = 38 }: { icon: string; label: string; onClick?: () => void; className?: string; active?: boolean; badge?: number; size?: number }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={clsx('group relative inline-grid place-items-center rounded-full text-ink-2 transition-all duration-200 hover:bg-surface-3 hover:text-ink active:scale-95', active && 'bg-surface-3 text-ink', className)}
    >
      <Icon name={icon} size={18} active={active} />
      {!!badge && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-coral text-white text-[10px] font-semibold grid place-items-center">{badge > 9 ? '9+' : badge}</span>}
    </button>
  );
}

// ------------------------------------------------------------------ Form fields
export function Field({ label, error, hint, children, className }: { label?: string; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('block', className)}>
      {label && <span className="block text-[12px] font-medium text-ink-2 mb-1.5">{label}</span>}
      {children}
      <AnimatePresence>
        {error ? (
          <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="block text-[11.5px] text-coral mt-1">{error}</motion.span>
        ) : hint ? <span className="block text-[11.5px] text-muted mt-1">{hint}</span> : null}
      </AnimatePresence>
    </label>
  );
}
const inputCls = 'w-full h-10 rounded-[12px] bg-surface-2 border border-line px-3 text-[13.5px] text-ink placeholder:text-muted outline-none transition focus:border-emerald focus:bg-surface focus:ring-4 focus:ring-emerald/15 aria-[invalid=true]:border-coral';
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; prefix?: string }>(function Input({ className, invalid, prefix, ...rest }, ref) {
  if (prefix) return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted pointer-events-none">{prefix}</span>
      <input ref={ref} aria-invalid={invalid || undefined} className={clsx(inputCls, 'num', prefix.length > 1 ? 'pl-10' : 'pl-7', className)} {...rest} />
    </div>
  );
  return <input ref={ref} aria-invalid={invalid || undefined} className={clsx(inputCls, className)} {...rest} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} aria-invalid={invalid || undefined} className={clsx(inputCls, 'appearance-none pr-9 cursor-pointer', className)} {...rest}>{children}</select>
      <Icon name="chevronDown" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
    </div>
  );
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={clsx(inputCls, 'h-auto min-h-20 py-2.5 resize-none', className)} {...rest} />;
});

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className="flex items-center justify-between gap-4 w-full text-left disabled:opacity-50">
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-[13.5px] font-medium text-ink">{label}</span>}
          {description && <span className="block text-[12px] text-muted mt-0.5">{description}</span>}
        </span>
      )}
      <span className={clsx('relative inline-flex h-6 w-10.5 shrink-0 rounded-full transition-colors duration-300', checked ? 'bg-emerald' : 'bg-surface-3 border border-line')}>
        <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow', checked ? 'right-0.5' : 'left-0.5')} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, size = 'md', className, layoutId }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode }>; size?: 'sm' | 'md'; className?: string; layoutId?: string }) {
  const [id] = useState(() => layoutId ?? `seg-${Math.random().toString(36).slice(2)}`);
  return (
    <div className={clsx('inline-flex items-center rounded-full bg-surface-3/80 p-1 border border-line/60', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx('relative rounded-full font-medium transition-colors', size === 'sm' ? 'px-3 h-7 text-[12px]' : 'px-4 h-8 text-[12.5px]', value === o.value ? 'text-ink' : 'text-muted hover:text-ink-2')}
        >
          {value === o.value && <motion.span layoutId={id} className="absolute inset-0 rounded-full bg-surface shadow-card" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span className="relative z-10 flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ChoiceCard({ selected, onClick, icon, title, description, className }: { selected: boolean; onClick: () => void; icon?: string; title: ReactNode; description?: ReactNode; className?: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={clsx('group relative text-left rounded-[18px] border p-4 transition-all duration-200', selected ? 'border-emerald bg-emerald-soft/60 ring-4 ring-emerald/12' : 'border-line bg-surface hover:border-ink-2/30 hover:bg-surface-2', className)}
    >
      {icon && <span className={clsx('inline-grid place-items-center size-10 rounded-[12px] mb-3 transition-colors', selected ? 'bg-emerald text-white' : 'bg-surface-3 text-ink-2')}><Icon name={icon} size={20} active={selected} /></span>}
      <span className="block text-[14px] font-semibold text-ink">{title}</span>
      {description && <span className="block text-[12px] text-muted mt-1 leading-snug">{description}</span>}
      {selected && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3 size-5 rounded-full bg-emerald text-white grid place-items-center"><Icon name="check" size={12} strokeWidth={2.6} /></motion.span>}
    </motion.button>
  );
}

// ------------------------------------------------------------------ Display
export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'green' | 'red' | 'amber' | 'blue' | 'dark'; className?: string }) {
  const tones = { neutral: 'bg-surface-3 text-ink-2', green: 'bg-emerald-soft text-emerald', red: 'bg-coral-soft text-coral', amber: 'bg-amber-soft text-amber', blue: 'bg-blue-soft text-blue', dark: 'bg-brand text-brand-ink' };
  return <span className={clsx('inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap', tones[tone], className)}>{children}</span>;
}

export function Progress({ value, color = 'var(--emerald)', track = 'var(--surface-3)', height = 8, className, delay = 0 }: { value: number; color?: string; track?: string; height?: number; className?: string; delay?: number }) {
  const ok = useMotionOK();
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx('w-full rounded-full overflow-hidden', className)} style={{ height, background: track }} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={ok ? { width: 0 } : false} animate={{ width: `${v}%` }} transition={{ duration: 1.1, delay: ok ? delay : 0, ease }} />
    </div>
  );
}

/** Animated count-up number for balances. */
export function AnimatedNumber({ value, format, className, duration = 1.1 }: { value: number; format: (n: number) => string; className?: string; duration?: number }) {
  const ok = useMotionOK();
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!ok) { el.textContent = format(value); prev.current = value; return; }
    const ctrl = animate(prev.current, value, { duration, ease, onUpdate: (v) => { el.textContent = format(Math.round(v)); } });
    prev.current = value;
    return () => ctrl.stop();
  }, [value, ok]);
  return <span ref={ref} className={clsx('num', className)}>{format(ok ? prev.current : value)}</span>;
}

export function Money({ cents, currency = 'PAB', className, animated, sign, compact }: { cents: number; currency?: Currency; className?: string; animated?: boolean; sign?: boolean; compact?: boolean }) {
  const f = (n: number) => formatMoney(n, currency, { sign, compact });
  if (animated) return <AnimatedNumber value={cents} format={f} className={className} />;
  return <span className={clsx('num', className)}>{f(cents)}</span>;
}

export function Avatar({ name, color, emoji, size = 32, className }: { name: string; color: string; emoji?: string | null; size?: number; className?: string }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className={clsx('inline-grid place-items-center rounded-full font-semibold text-white shrink-0 ring-2 ring-surface', className)} style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
      {emoji || initials}
    </span>
  );
}

export function EmptyState({ icon, title, body, action, className }: { icon: string; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  const ok = useMotionOK();
  return (
    <div className={clsx('flex flex-col items-center justify-center text-center px-6 py-10', className)}>
      <motion.div initial={ok ? { scale: 0.8, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease }} className="relative mb-4">
        <span className="absolute inset-0 -m-3 rounded-full bg-emerald/10 blur-xl" />
        <span className="relative grid place-items-center size-16 rounded-[20px] bg-gradient-to-br from-surface-2 to-surface-3 border border-line text-brand-2 dark:text-emerald">
          <Icon name={icon} size={28} active />
        </span>
      </motion.div>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {body && <p className="text-[12.5px] text-muted mt-1 max-w-sm leading-relaxed">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className="text-[19px] font-semibold text-ink mt-0.5 num tracking-[-0.03em]">{value}</div>
      {sub && <div className="text-[11.5px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-ink leading-tight">{title}</h1>
        {subtitle && <p className="serif text-[17px] text-ink-2 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EstimateTag({ estimated = true }: { estimated?: boolean }) {
  return estimated
    ? <Badge tone="amber" className="!h-5 !text-[10px]"><Icon name="sparkle" size={10} />{tr('Estimado')}</Badge>
    : <Badge tone="green" className="!h-5 !text-[10px]"><Icon name="check" size={10} strokeWidth={2.4} />{tr('Real')}</Badge>;
}

// ------------------------------------------------------------------ Modal
export function Modal({ open, onClose, title, subtitle, children, footer, width = 520, icon, tone = 'default' }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number; icon?: string; tone?: 'default' | 'danger' }) {
  const ok = useMotionOK();
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="absolute inset-0 bg-[#07100c]/45 backdrop-blur-[6px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={ok ? { opacity: 0, scale: 0.96, y: 16 } : false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={ok ? { opacity: 0, scale: 0.97, y: 8 } : { opacity: 0 }}
            transition={{ duration: 0.32, ease }}
            className="relative w-full max-h-[calc(100vh-48px)] flex flex-col rounded-[26px] bg-surface border border-line shadow-pop"
            style={{ maxWidth: width }}
          >
            <div className="flex items-start gap-3 px-6 pt-6 pb-4">
              {icon && <span className={clsx('grid place-items-center size-10 rounded-[12px] shrink-0', tone === 'danger' ? 'bg-coral-soft text-coral' : 'bg-emerald-soft text-emerald')}><Icon name={icon} size={20} active /></span>}
              <div className="flex-1 min-w-0">
                <h2 id={titleId} className="text-[18px] font-semibold tracking-[-0.03em] text-ink">{title}</h2>
                {subtitle && <p className="text-[12.5px] text-muted mt-0.5">{subtitle}</p>}
              </div>
              <IconButton icon="close" label={tr('Cerrar')} onClick={onClose} size={34} />
            </div>
            <div className="px-6 pb-2 overflow-y-auto">{children}</div>
            {footer && <div className="flex items-center justify-end gap-2 px-6 py-4 mt-2 border-t border-line/70">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Confirm({ open, onClose, onConfirm, title, body, confirmLabel = tr('Eliminar'), danger = true }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body?: ReactNode; confirmLabel?: string; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={420} icon={danger ? 'alert' : 'info'} tone={danger ? 'danger' : 'default'}
      footer={<><Button variant="ghost" onClick={onClose}>{tr('Cancelar')}</Button><Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></>}>
      <p className="text-[13.5px] text-ink-2 leading-relaxed">{body}</p>
    </Modal>
  );
}

/** Small hook to manage a confirm dialog. */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; body?: ReactNode; onConfirm: () => void; confirmLabel?: string } | null>(null);
  const node = <Confirm open={!!state} onClose={() => setState(null)} onConfirm={() => state?.onConfirm()} title={state?.title ?? ''} body={state?.body} confirmLabel={state?.confirmLabel} />;
  return { ask: setState, node };
}

// ------------------------------------------------------------------ Toasts
export function Toaster() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  const ok = useMotionOK();
  const style = { success: ['check', 'bg-emerald text-white'], error: ['alert', 'bg-coral text-white'], info: ['info', 'bg-blue text-white'], celebrate: ['sparkle', 'bg-amber text-white'] } as const;
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-[340px] pointer-events-none" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={ok ? { opacity: 0, x: 40, scale: 0.95 } : false} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }} transition={{ duration: 0.35, ease }}
            className="pointer-events-auto flex items-start gap-3 rounded-[18px] bg-surface/95 backdrop-blur border border-line shadow-pop p-3.5 pr-2">
            <span className={clsx('grid place-items-center size-8 rounded-[10px] shrink-0', style[t.kind][1])}><Icon name={style[t.kind][0]} size={16} strokeWidth={2.2} /></span>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[13px] font-semibold text-ink">{t.title}</p>
              {t.body && <p className="text-[12px] text-muted mt-0.5 leading-snug">{t.body}</p>}
              {t.action && <button className="mt-2 text-[12px] font-semibold text-emerald hover:underline" onClick={() => { t.action!.onClick(); dismiss(t.id); }}>{t.action.label}</button>}
            </div>
            <IconButton icon="close" label={tr('Cerrar')} size={28} onClick={() => dismiss(t.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ Money input helper
export function MoneyInput({ value, onChange, currency = 'PAB', invalid, autoFocus, placeholder = '0.00', ...rest }: { value: string; onChange: (v: string) => void; currency?: Currency; invalid?: boolean; autoFocus?: boolean; placeholder?: string; 'aria-label'?: string; name?: string }) {
  return (
    <Input
      inputMode="decimal"
      prefix={currency === 'PAB' ? 'B/.' : '$'}
      value={value}
      invalid={invalid}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
      {...rest}
    />
  );
}
