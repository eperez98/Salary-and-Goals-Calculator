import { motion } from 'motion/react';
import clsx from 'clsx';

/** Monto mark: an "M" drawn as a chart line whose right stroke rises in gold (midnight + gold palette). */
export function LogoMark({ size = 32, className, tone = 'auto', animated = false }: { size?: number; className?: string; tone?: 'auto' | 'light' | 'dark'; animated?: boolean }) {
  const base = tone === 'light' ? '#F5F3EE' : tone === 'dark' ? '#14304D' : 'currentColor';
  const gid = `monto-gold-${tone}`;
  const accent = `url(#${gid})`;
  const t = (d: number) => (animated ? { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] as const } : { duration: 0 });
  return (
    <svg width={size} height={size} viewBox="10 10 100 100" fill="none" className={clsx('shrink-0', className)} aria-label="Monto">
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="#E8930F" /><stop offset="1" stopColor="#FFD36E" />
        </linearGradient>
      </defs>
      <motion.path d="M26 94V36L58 72" stroke={base} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"
        initial={animated ? { pathLength: 0, opacity: 0 } : false} animate={{ pathLength: 1, opacity: 1 }} transition={t(0.15)} />
      <motion.path d="M58 72L92 26V94" stroke={accent} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"
        initial={animated ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={t(0.7)} />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <LogoMark size={24} className="text-[#14304D] dark:text-[#EDF2EF]" />
      <span className="text-[19px] font-bold tracking-[-0.05em] text-ink">monto</span>
    </span>
  );
}
