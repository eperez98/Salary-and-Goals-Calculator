import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Button, ChoiceCard, Field, Input, MoneyInput, Select, Toggle, useMotionOK, ease } from '../../components/ui';
import { LogoMark } from '../../brand/Logo';
import { Icon } from '../../icons';
import { IncomeConfigForm, emptyDraft, draftToConfig, type IncomeDraft } from '../income/IncomeConfigForm';
import { incomeConfigSchema } from '../../db/repo/planning';
import { createIncomeSource, saveExpensePlan } from '../../db/repo/planning';
import { ExpensePlanner } from '../plan/ExpensePlanner';
import { estimateIncome } from '../../domain/salary';
import type { PlanItem } from '../../domain/plan';
import { createAccount } from '../../db/repo/finance';
import { createMember, getPrefs, seedCategories, setPrefs, setProfile } from '../../db/repo/core';
import { QuickPrefs } from '../../components/layout/QuickPrefs';
import { parseMoney, type Currency } from '../../lib/money';
import { today } from '../../lib/dates';
import type { Engine } from '../../db/engine';
import type { AccountType, Member, ProfileMode } from '../../db/types';
import { errorMessage } from '../../hooks/useDb';
import { tr } from '../../lib/i18n';

const BANKS = ['Banco General', 'Banistmo', 'BAC Credomatic', 'Banco Nacional de Panamá', 'Caja de Ahorros', 'Global Bank', 'Multibank', 'Banesco', 'St. Georges Bank', 'Credicorp Bank', tr('Otro')];
const STEPS = [tr('Bienvenida'), tr('Perfil'), tr('Moneda'), tr('Ingresos'), tr('Gastos'), tr('Cuenta'), tr('Seguridad'), tr('Listo')];

export function Onboarding({ engine, onDone }: { engine: Engine; onDone: (owner: Member) => void }) {
  const ok = useMotionOK();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<ProfileMode>('individual');
  const [household, setHousehold] = useState('');
  const [others, setOthers] = useState<string[]>(['']);
  const [currency, setCurrency] = useState<Currency>('PAB');
  const [skipIncome, setSkipIncome] = useState(false);
  const [income, setIncome] = useState<IncomeDraft>(() => emptyDraft(today()));
  const [employer, setEmployer] = useState('');
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const monthlyNet = useMemo(() => (skipIncome ? 0 : estimateIncome(draftToConfig(income)).monthlyNet), [skipIncome, income]);
  const [accName, setAccName] = useState('Banco General');
  const [accType, setAccType] = useState<AccountType>('savings');
  const [accBalance, setAccBalance] = useState('');
  const [usePw, setUsePw] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = () => { setErr(null); setDir(1); setStep((s) => s + 1); };
  const back = () => { setErr(null); setDir(-1); setStep((s) => s - 1); };

  const validate = (): string | null => {
    if (step === 1 && !name.trim()) return tr('Escribe tu nombre para personalizar Monto.');
    if (step === 3 && !skipIncome) {
      const r = incomeConfigSchema.safeParse(draftToConfig(income));
      if (!r.success) return r.error.issues[0].message;
    }
    if (step === 5 && Number.isNaN(parseMoney(accBalance || '0'))) return tr('El saldo inicial no es válido.');
    if (step === 6 && usePw) {
      if (pw.length < 8) return tr('La contraseña debe tener al menos 8 caracteres.');
      if (pw !== pw2) return tr('Las contraseñas no coinciden.');
    }
    return null;
  };

  const finish = async () => {
    setBusy(true);
    try {
      let owner!: Member;
      seedCategories(engine);
      engine.transaction(() => {
        owner = createMember(engine, null, { name: name.trim(), role: 'admin' }, true);
        const actor = { id: owner.id, role: owner.role };
        if (mode !== 'individual') others.filter((o) => o.trim()).forEach((o) => createMember(engine, null, { name: o.trim(), role: 'adult' }));
        const acc = createAccount(engine, actor, { name: accName.trim() || tr('Cuenta principal'), type: accType, currency, initialBalance: parseMoney(accBalance || '0'), institution: BANKS.includes(accName) ? accName : null, ownerMemberId: mode === 'individual' ? null : owner.id });
        if (plan.length) saveExpensePlan(engine, actor, plan);
        if (!skipIncome) createIncomeSource(engine, actor, { name: employer.trim() || tr('Salario'), config: draftToConfig(income), currency, accountId: acc.id, startDate: today() });
        setPrefs(engine, { theme: getPrefs(engine).theme, reducedMotion: 'system', autoLockMinutes: usePw ? 5 : 0, showBothCurrencies: true });
        setProfile(engine, { name: name.trim(), mode, primaryCurrency: currency, onboarded: true, householdName: household.trim() || undefined });
      });
      if (usePw) await engine.setPassword(pw);
      else await engine.flush();
      if (ok) confetti({ particleCount: 140, spread: 80, origin: { y: 0.65 }, colors: ['#2FBF85', '#12291F', '#A8C2A3', '#F5F3EE', '#C98A1E'] });
      setTimeout(() => onDone(owner), ok ? 900 : 0);
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(false);
    }
  };

  const onNext = () => {
    const v = validate();
    if (v) return setErr(v);
    if (step === STEPS.length - 2) { next(); return; }
    if (step === STEPS.length - 1) return finish();
    next();
  };

  return (
    <motion.div key="onboarding" className="fixed inset-0 flex bg-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <aside className="hidden lg:flex w-[360px] shrink-0 flex-col justify-between hero-surface text-[#F5F3EE] p-10">
        <div className="flex items-center gap-2.5"><LogoMark size={30} tone="light" /><span className="text-[20px] font-bold tracking-[-0.05em]">monto</span></div>
        <div>
          <p className="serif text-[30px] leading-tight text-white/90">{tr('Saber cuánto ganas de verdad y cuánto puedes ahorrar.')}</p>
          <ol className="mt-10 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-[13px]">
                <span className={`grid place-items-center size-6 rounded-full text-[11px] font-semibold transition-all ${i < step ? 'bg-[#5BE0A8] text-[#0C1D16]' : i === step ? 'bg-white text-[#0C1D16]' : 'bg-white/10 text-white/50'}`}>{i < step ? <Icon name="check" size={12} strokeWidth={2.6} /> : i + 1}</span>
                <span className={i === step ? 'text-white' : 'text-white/50'}>{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-[11.5px] text-white/45 leading-relaxed">{tr('Monto funciona sin conexión. Tu información se guarda únicamente en este equipo.')}</p>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] mx-auto px-10 py-12 min-h-full flex flex-col">
          <div className="flex justify-end -mt-4 mb-6"><QuickPrefs /></div>
          <div className="h-1 rounded-full bg-surface-3 overflow-hidden mb-10"><motion.div className="h-full bg-emerald rounded-full" animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} transition={{ duration: 0.5, ease }} /></div>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} initial={ok ? { opacity: 0, x: 40 * dir } : false} animate={{ opacity: 1, x: 0 }} exit={ok ? { opacity: 0, x: -40 * dir } : { opacity: 0 }} transition={{ duration: 0.35, ease }} className="flex-1">
              {step === 0 && (
                <div className="pt-10">
                  <LogoMark size={64} animated={ok} className="text-brand dark:text-ink" />
                  <h1 className="text-[44px] font-semibold tracking-[-0.05em] leading-[1.05] mt-8">{tr('Bienvenido a Monto')}</h1>
                  <p className="serif text-[22px] text-ink-2 mt-2">{tr('Ingresos, gastos, ahorros y deudas bajo control, en balboas y dólares.')}</p>
                  <div className="grid grid-cols-3 gap-3 mt-10">
                    {[['salary', tr('Quincenas claras'), tr('Calcula tu ingreso mensual y anual real.')], ['family', tr('Para todo el hogar'), tr('Individual, en pareja o en familia.')], ['shield', tr('Privado y local'), tr('Sin nube. Cifrado opcional.')]].map(([i, t, d]) => (
                      <div key={t} className="rounded-[18px] bg-surface border border-line p-4"><Icon name={i} size={22} active className="text-emerald" /><p className="text-[13.5px] font-semibold mt-3">{t}</p><p className="text-[12px] text-muted mt-1">{d}</p></div>
                    ))}
                  </div>
                </div>
              )}
              {step === 1 && (
                <div>
                  <h2 className="text-[30px] font-semibold tracking-[-0.04em]">{tr('Cuéntanos sobre ti')}</h2>
                  <p className="serif text-[18px] text-ink-2">{tr('¿Cómo vas a usar Monto?')}</p>
                  <Field label={tr('Tu nombre')} className="mt-8"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('Ej. Carlos')} /></Field>
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <ChoiceCard selected={mode === 'individual'} onClick={() => setMode('individual')} icon="user" title={tr('Individual')} description={tr('Solo mis finanzas.')} />
                    <ChoiceCard selected={mode === 'couple'} onClick={() => { setMode('couple'); setOthers((o) => [o[0] ?? '']); }} icon="handshake" title={tr('En pareja')} description={tr('Gastos compartidos entre dos.')} />
                    <ChoiceCard selected={mode === 'family'} onClick={() => setMode('family')} icon="family" title={tr('Familia')} description={tr('Varios integrantes y roles.')} />
                  </div>
                  {mode !== 'individual' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-3">
                      <Field label={tr('Nombre del hogar (opcional)')}><Input value={household} onChange={(e) => setHousehold(e.target.value)} placeholder={tr('Ej. Familia Rodríguez')} /></Field>
                      <p className="text-[12px] font-medium text-ink-2">{mode === 'couple' ? tr('Tu pareja') : tr('Otros integrantes')} <span className="text-muted font-normal">{tr('· podrás ajustar roles y permisos después')}</span></p>
                      {others.map((o, i) => (
                        <Input key={i} value={o} placeholder={tr('Nombre {v0}', { v0: i + 1 })} onChange={(e) => setOthers(others.map((x, j) => (j === i ? e.target.value : x)))} />
                      ))}
                      {mode === 'family' && others.length < 8 && <Button variant="ghost" size="sm" icon="plus" onClick={() => setOthers([...others, ''])}>{tr('Añadir integrante')}</Button>}
                    </motion.div>
                  )}
                </div>
              )}
              {step === 2 && (
                <div>
                  <h2 className="text-[30px] font-semibold tracking-[-0.04em]">{tr('Moneda principal')}</h2>
                  <p className="serif text-[18px] text-ink-2">{tr('El balboa y el dólar circulan a la par (1:1). Monto conserva ambos códigos.')}</p>
                  <div className="grid grid-cols-2 gap-3 mt-8">
                    <ChoiceCard selected={currency === 'PAB'} onClick={() => setCurrency('PAB')} title={<span className="flex items-baseline gap-2"><span className="text-[28px] font-bold tracking-[-0.04em]">{tr('B/.')}</span>{' '}{tr('Balboa · PAB')}</span>} description={tr('Panamá. Recomendado para tus cuentas locales.')} />
                    <ChoiceCard selected={currency === 'USD'} onClick={() => setCurrency('USD')} title={<span className="flex items-baseline gap-2"><span className="text-[28px] font-bold tracking-[-0.04em]">$</span>{' '}{tr('Dólar · USD')}</span>} description={tr('Estados Unidos y cuentas en dólares.')} />
                  </div>
                  <p className="text-[12px] text-muted mt-5 flex gap-2"><Icon name="info" size={16} />{tr('Podrás tener cuentas en ambas monedas; los totales se muestran por separado y combinados a la par.')}</p>
                </div>
              )}
              {step === 3 && (
                <div>
                  <h2 className="text-[30px] font-semibold tracking-[-0.04em]">{tr('¿Cómo recibes tus ingresos?')}</h2>
                  <p className="serif text-[18px] text-ink-2 mb-6">{tr('Escribe lo que recibes, ya con los descuentos aplicados.')}</p>
                  <Toggle checked={skipIncome} onChange={setSkipIncome} label={tr('Configurar más tarde')} description={tr('Puedes añadir tus fuentes de ingreso desde el módulo Ingresos.')} />
                  {!skipIncome && (
                    <div className="mt-6 space-y-4">
                      <Field label={tr('Empresa o fuente de ingreso')}><Input value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder={tr('Ej. Empresa Ejemplo, S.A.')} /></Field>
                      <IncomeConfigForm net draft={income} set={(p) => setIncome({ ...income, ...p })} currency={currency} />
                    </div>
                  )}
                </div>
              )}
              {step === 4 && (
                <div>
                  <h2 className="text-[30px] font-semibold tracking-[-0.04em]">{tr('Tus gastos del mes')}</h2>
                  <p className="serif text-[18px] text-ink-2 mb-6">{tr('Te preguntaremos uno por uno y veremos cuánto te queda para ahorrar.')}</p>
                  <ExpensePlanner income={monthlyNet} currency={currency} initial={plan} onChange={setPlan} />
                </div>
              )}
              {step === 5 && (
                <div>
                  <h2 className="text-[30px] font-semibold tracking-[-0.04em]">{tr('Tu cuenta principal')}</h2>
                  <p className="serif text-[18px] text-ink-2">{tr('Donde recibes tu salario. Podrás añadir más cuentas y tarjetas.')}</p>
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <Field label={tr('Banco o nombre')}><Select value={BANKS.includes(accName) ? accName : tr('Otro')} onChange={(e) => setAccName(e.target.value === tr('Otro') ? '' : e.target.value)}>{BANKS.map((b) => <option key={b}>{b}</option>)}</Select></Field>
                    <Field label={tr('Tipo')}><Select value={accType} onChange={(e) => setAccType(e.target.value as AccountType)}><option value="savings">{tr('Cuenta de ahorros')}</option><option value="checking">{tr('Cuenta corriente')}</option><option value="cash">{tr('Efectivo')}</option></Select></Field>
                    {!BANKS.includes(accName) && <Field label={tr('Nombre de la cuenta')} className="col-span-2"><Input value={accName} onChange={(e) => setAccName(e.target.value)} placeholder={tr('Ej. Cooperativa')} /></Field>}
                    <Field label={tr('Saldo actual ({currency})', { currency })} className="col-span-2" hint={tr('El dinero que tienes hoy en esta cuenta.')}><MoneyInput currency={currency} value={accBalance} onChange={setAccBalance} aria-label={tr('Saldo inicial')} /></Field>
                  </div>
                </div>
              )}
              {step === 6 && (
                <div>
                  <h2 className="text-[30px] font-semibold tracking-[-0.04em]">{tr('Protege tu información')}</h2>
                  <p className="serif text-[18px] text-ink-2">{tr('Opcional: cifra la base de datos con una contraseña.')}</p>
                  <div className="rounded-[20px] bg-surface border border-line p-5 mt-8 space-y-4">
                    <Toggle checked={usePw} onChange={setUsePw} label={tr('Usar contraseña')} description={tr('Cifrado AES-256. Bloqueo automático tras 5 minutos de inactividad.')} />
                    {usePw && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-3">
                        <Field label={tr('Contraseña')}><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={tr('Mínimo 8 caracteres')} /></Field>
                        <Field label={tr('Confirmar')}><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
                        <p className="col-span-2 text-[12px] text-amber flex gap-2"><Icon name="alert" size={16} />{tr('Si olvidas la contraseña no será posible recuperar los datos.')}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
              {step === 7 && (
                <div className="pt-10 text-center">
                  <motion.div initial={ok ? { scale: 0 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }} className="mx-auto grid place-items-center size-20 rounded-full bg-emerald text-white"><Icon name="check" size={38} strokeWidth={2.4} /></motion.div>
                  <h2 className="text-[34px] font-semibold tracking-[-0.04em] mt-6">{tr('¡Todo listo,')}{' '}{name.split(' ')[0]}!</h2>
                  <p className="serif text-[19px] text-ink-2 mt-1">{tr('Tu panel financiero está preparado.')}</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          {err && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] text-coral mt-4 flex items-center gap-2"><Icon name="alert" size={16} />{err}</motion.p>}
          <div className="flex items-center justify-between pt-8">
            {step > 0 && step < STEPS.length - 1 ? <Button variant="ghost" icon="chevronLeft" onClick={back}>{tr('Atrás')}</Button> : <span />}
            <Button size="lg" onClick={onNext} loading={busy}>{step === 0 ? tr('Comenzar') : step === STEPS.length - 1 ? tr('Ir a mi panel') : tr('Continuar')}<Icon name="chevronRight" size={17} /></Button>
          </div>
        </div>
      </main>
    </motion.div>
  );
}
