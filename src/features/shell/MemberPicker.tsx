import { useState } from 'react';
import { motion } from 'motion/react';
import { Avatar, Button, Input } from '../../components/ui';
import { LogoMark } from '../../brand/Logo';
import { ROLE_LABEL } from '../../domain/permissions';
import type { Member } from '../../db/types';
import { tr } from '../../lib/i18n';

export function MemberPicker({ members, onPick, verify }: { members: Member[]; onPick: (m: Member) => void; verify: (m: Member, pin: string) => Promise<boolean> }) {
  const [sel, setSel] = useState<Member | null>(null);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const choose = (m: Member) => { if (m.hasPin) { setSel(m); setPin(''); setErr(''); } else onPick(m); };
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (sel && (await verify(sel, pin))) onPick(sel); else setErr('PIN incorrecto'); };
  return (
    <motion.div key="picker" className="fixed inset-0 grid place-items-center bg-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="text-center">
        <LogoMark size={44} className="mx-auto text-brand dark:text-ink" />
        <h1 className="text-[28px] font-semibold tracking-[-0.04em] mt-5">{tr('¿Quién está usando Monto?')}</h1>
        <p className="serif text-[18px] text-ink-2">{tr('Cada integrante ve sus finanzas personales y las del hogar.')}</p>
        <div className="flex flex-wrap justify-center gap-5 mt-10">
          {members.map((m, i) => (
            <motion.button key={m.id} onClick={() => choose(m)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }} whileHover={{ y: -4 }}
              className={`w-36 rounded-[22px] border p-5 bg-surface shadow-card transition ${sel?.id === m.id ? 'border-emerald ring-4 ring-emerald/15' : 'border-line'}`}>
              <Avatar name={m.name} color={m.color} emoji={m.emoji} size={64} className="mx-auto" />
              <p className="text-[14px] font-semibold mt-3 truncate">{m.name}</p>
              <p className="text-[11.5px] text-muted">{ROLE_LABEL[m.role]}{m.hasPin ? ' · PIN' : ''}</p>
            </motion.button>
          ))}
        </div>
        {sel && (
          <motion.form onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex items-start justify-center gap-2">
            <div>
              <Input autoFocus type="password" inputMode="numeric" maxLength={6} placeholder={`PIN de ${sel.name}`} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr(''); }} invalid={!!err} className="w-52 text-center" />
              {err && <p className="text-[12px] text-coral mt-1">{err}</p>}
            </div>
            <Button type="submit">{tr('Entrar')}</Button>
          </motion.form>
        )}
      </div>
    </motion.div>
  );
}
