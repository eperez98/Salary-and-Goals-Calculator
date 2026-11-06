import { motion } from 'motion/react';
import { LogoMark } from '../../brand/Logo';
import { useMotionOK } from '../../components/ui';
import { tr } from '../../lib/i18n';

export function Splash({ status }: { status: string }) {
  const ok = useMotionOK();
  const letters = 'monto'.split('');
  return (
    <motion.div
      key="splash"
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden hero-surface text-[#F5F3EE]"
      exit={ok ? { opacity: 0, scale: 1.04, filter: 'blur(6px)' } : { opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {ok && (
        <>
          <motion.div className="absolute size-[620px] rounded-full border border-white/5" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.6, ease: 'easeOut' }} />
          <motion.div className="absolute size-[420px] rounded-full border border-white/[0.07]" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.4, delay: 0.1, ease: 'easeOut' }} />
          <motion.div className="absolute size-[360px] rounded-full bg-[#2FBF85]/20 blur-[90px]" animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 3, repeat: Infinity }} />
        </>
      )}
      <div className="relative flex flex-col items-center">
        <LogoMark size={96} tone="light" animated={ok} />
        <div className="mt-6 flex text-[44px] font-bold tracking-[-0.06em] leading-none" aria-label="monto">
          {letters.map((l, i) => (
            <motion.span key={i} initial={ok ? { opacity: 0, y: 18, filter: 'blur(8px)' } : false} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.6, delay: 0.9 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}>{l}</motion.span>
          ))}
        </div>
        <motion.p className="serif text-[19px] text-white/70 mt-2" initial={ok ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: 1.35, duration: 0.6 }}>
          {tr('tus finanzas, en orden')}
        </motion.p>
        <div className="mt-10 h-[3px] w-40 rounded-full bg-white/10 overflow-hidden">
          <motion.div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#5BE0A8] to-transparent" animate={ok ? { x: ['-100%', '300%'] } : undefined} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <motion.p className="text-[11.5px] text-white/45 mt-3 h-4" key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{status}</motion.p>
      </div>
      <p className="absolute bottom-6 text-[11px] text-white/35">{tr('Hecho en Panamá · Tus datos permanecen en este equipo')}</p>
    </motion.div>
  );
}
