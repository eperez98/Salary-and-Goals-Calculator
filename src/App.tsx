import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { useApp, type RouteKey } from './store/app';
import { Engine, LockedError, loadSqlJs } from './db/engine';
import { defaultAdapter, isTauri, type StorageAdapter } from './db/adapters';
import { WrongPasswordError } from './db/crypto';
import { endSession, getMember, getPrefs, getProfile, listMembers, seedCategories, startSession, verifyMemberPin } from './db/repo/core';
import { runAutoPost } from './db/repo/planning';
import { autoBackup } from './services/backup';
import { checkForUpdate, updatesSupported } from './services/updates';
import { IS_PRERELEASE, versionLabel } from './lib/version';
import { Splash } from './features/shell/Splash';
import { LockScreen } from './features/shell/LockScreen';
import { MemberPicker } from './features/shell/MemberPicker';
import { Onboarding } from './features/onboarding/Onboarding';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { NotificationsPanel } from './components/layout/Notifications';
import { TxEditor } from './features/transactions/TxEditor';
import { Toaster, Button, useMotionOK, ease } from './components/ui';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { Member } from './db/types';
import { tr } from './lib/i18n';

const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const Transactions = lazy(() => import('./features/transactions/Transactions'));
const Accounts = lazy(() => import('./features/accounts/Accounts'));
const Income = lazy(() => import('./features/income/Income'));
const Plan = lazy(() => import('./features/plan/Plan'));
const Budgets = lazy(() => import('./features/budgets/Budgets'));
const Goals = lazy(() => import('./features/goals/Goals'));
const Debts = lazy(() => import('./features/debts/Debts'));
const Family = lazy(() => import('./features/family/Family'));
const Calendar = lazy(() => import('./features/calendar/Calendar'));
const Reports = lazy(() => import('./features/reports/Reports'));
const Insights = lazy(() => import('./features/insights/Insights'));
const Settings = lazy(() => import('./features/settings/Settings'));

const PAGES: Record<RouteKey, React.ComponentType> = { dashboard: Dashboard, transactions: Transactions, accounts: Accounts, income: Income, plan: Plan, budgets: Budgets, goals: Goals, debts: Debts, family: Family, calendar: Calendar, reports: Reports, insights: Insights, settings: Settings };

function PageSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-5">
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={`skeleton rounded-[22px] ${i === 0 ? 'col-span-2 h-44' : 'h-44'}`} />)}
    </div>
  );
}

export default function App() {
  const { phase, setPhase, engine, setEngine, bump, setActor, route, fatal, actor, sessionId } = useApp();
  const [status, setStatus] = useState(tr('Preparando…'));
  const [members, setMembers] = useState<Member[]>([]);
  const adapterRef = useRef<StorageAdapter>(defaultAdapter());
  const ok = useMotionOK();

  // ------------------------------------------------------------ theme & motion
  const applyVisual = useCallback((e: Engine | null) => {
    const prefs = e ? getPrefs(e) : { theme: 'system', reducedMotion: 'system' };
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && sysDark);
    const sysReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reduce = prefs.reducedMotion === 'on' || (prefs.reducedMotion === 'system' && sysReduce);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('reduce-motion', reduce);
    useApp.getState().setVisual({ dark, reducedMotion: reduce });
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const mr = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = () => applyVisual(useApp.getState().engine);
    mq.addEventListener('change', h);
    mr.addEventListener('change', h);
    return () => { mq.removeEventListener('change', h); mr.removeEventListener('change', h); };
  }, [applyVisual]);

  useEffect(() => { if (engine) applyVisual(engine); }, [engine, useApp((s) => s.revision)]);

  // ------------------------------------------------------------ boot
  const enter = useCallback((e: Engine, m: Member) => {
    const sid = startSession(e, m.id);
    setActor({ id: m.id, role: m.role }, sid);
    // Each session starts on the dashboard in the member's personal view (privacy between members).
    useApp.getState().go('dashboard');
    useApp.getState().setScope('personal');
    const posted = runAutoPost(e, { id: m.id, role: m.role });
    if (posted) useApp.getState().toast({ kind: 'info', title: `${posted} movimiento(s) programado(s) registrado(s)`, body: tr('Se registraron automáticamente los pagos recurrentes vencidos.') });
    void autoBackup(e).catch(() => undefined);
    const prefs = getPrefs(e);
    if (prefs.autoCheckUpdates && updatesSupported()) {
      void checkForUpdate(prefs.betaUpdates ?? IS_PRERELEASE).then((u) => {
        if (u) useApp.getState().toast({ kind: 'info', title: tr('Nueva versión disponible: {v0}', { v0: versionLabel(u.version) }), body: tr('Puedes instalarla sin perder tus datos.'), action: { label: tr('Ver actualización'), onClick: () => { useApp.getState().go('settings'); sessionStorage.setItem('monto:settings-tab', 'updates'); } } });
      }).catch(() => undefined);
    }
    setPhase('app');
  }, []);

  const afterOpen = useCallback((e: Engine) => {
    setEngine(e);
    e.subscribe(() => bump());
    applyVisual(e);
    const profile = getProfile(e);
    // New databases are seeded at the end of onboarding, in the language chosen there.
    if (!profile.onboarded) return setPhase('onboarding');
    seedCategories(e);
    const ms = listMembers(e);
    setMembers(ms);
    if (ms.length > 1 || ms.some((m) => m.hasPin)) return setPhase('pickMember');
    const owner = ms[0];
    if (!owner) return setPhase('onboarding');
    enter(e, owner);
  }, [enter]);

  useEffect(() => {
    let cancelled = false;
    const minSplash = new Promise((r) => setTimeout(r, ok ? 2100 : 300));
    (async () => {
      try {
        setStatus(tr('Cargando motor de base de datos…'));
        await loadSqlJs(sqlWasmUrl);
        setStatus(tr('Abriendo tus datos locales…'));
        const locked = await Engine.isLocked(adapterRef.current);
        if (locked) { await minSplash; if (!cancelled) setPhase('locked'); return; }
        const e = await Engine.open(adapterRef.current, { wasmUrl: sqlWasmUrl });
        setStatus(tr('Verificando integridad…'));
        const ic = e.integrityCheck();
        if (!ic.ok) console.warn('Integridad', ic.messages);
        await minSplash;
        if (!cancelled) afterOpen(e);
      } catch (err) {
        await minSplash;
        if (!cancelled) setPhase('error', (err as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const unlock = async (password: string): Promise<string | null> => {
    try {
      const e = await Engine.open(adapterRef.current, { password, wasmUrl: sqlWasmUrl });
      afterOpen(e);
      return null;
    } catch (err) {
      if (err instanceof WrongPasswordError) return tr('Contraseña incorrecta');
      if (err instanceof LockedError) return tr('Introduce la contraseña');
      return (err as Error).message;
    }
  };

  // ------------------------------------------------------------ session lock / switch
  const lock = useCallback(async (reason: string) => {
    const s = useApp.getState();
    const e = s.engine;
    if (!e) return;
    if (s.sessionId) endSession(e, s.sessionId, reason);
    await e.flush();
    if (e.encrypted) {
      // Leave the screen first; close the decrypted database once the app view has unmounted.
      setPhase('locked');
      setTimeout(() => {
        // Only clear the store if no new session was opened meanwhile.
        if (useApp.getState().engine === e) { setEngine(null); setActor(null); }
        e.close();
      }, 1200);
    } else {
      // Keep the current actor until a new member is picked so exiting views stay valid.
      setMembers(listMembers(e));
      setPhase('pickMember');
    }
  }, []);

  useEffect(() => {
    if (phase !== 'app' || !engine) return;
    const minutes = getPrefs(engine).autoLockMinutes;
    if (!minutes || !engine.encrypted) return;
    let t: ReturnType<typeof setTimeout>;
    const reset = () => { clearTimeout(t); t = setTimeout(() => void lock('inactividad'), minutes * 60_000); };
    const evs = ['mousemove', 'keydown', 'mousedown', 'wheel'];
    evs.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => { clearTimeout(t); evs.forEach((ev) => window.removeEventListener(ev, reset)); };
  }, [phase, engine, useApp((s) => s.revision)]);

  // flush on close
  useEffect(() => {
    const h = () => { const e = useApp.getState().engine; if (e) void e.flush(); };
    window.addEventListener('beforeunload', h);
    let unlisten: (() => void) | undefined;
    if (isTauri()) {
      void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().onCloseRequested(async () => {
        const s = useApp.getState();
        if (s.engine) { if (s.sessionId) endSession(s.engine, s.sessionId, 'cierre'); await s.engine.flush(); }
      })).then((u) => { unlisten = u; });
    }
    return () => { window.removeEventListener('beforeunload', h); unlisten?.(); };
  }, []);

  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      if (useApp.getState().phase !== 'app') return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'n') { ev.preventDefault(); useApp.getState().openTx(); }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'l') { ev.preventDefault(); void lock('manual'); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [lock]);

  const Page = PAGES[route];
  void sessionId;

  return (
    <>
      <AnimatePresence mode="wait">
        {phase === 'splash' && <Splash key="splash" status={status} />}
        {phase === 'locked' && <LockScreen key="lock" onUnlock={async (pw) => { const s = useApp.getState(); if (s.engine) { const old = s.engine; setEngine(null); setActor(null); old.close(); } return unlock(pw); }} />}
        {phase === 'error' && (
          <motion.div key="err" className="fixed inset-0 grid place-items-center p-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="max-w-md text-center">
              <h1 className="text-[22px] font-semibold">{tr('No se pudo abrir la base de datos')}</h1>
              <p className="text-[13px] text-muted mt-2">{fatal}</p>
              <p className="text-[12.5px] text-ink-2 mt-4">{tr('Tus datos no se han modificado. Puedes restaurar una copia de seguridad desde la carpeta')}{' '}<code>backups</code>{' '}{tr('de la aplicación.')}</p>
              <Button className="mt-6" onClick={() => location.reload()} icon="refresh">{tr('Reintentar')}</Button>
            </div>
          </motion.div>
        )}
        {phase === 'onboarding' && engine && <Onboarding key="onb" engine={engine} onDone={(m) => enter(engine, m)} />}
        {phase === 'pickMember' && engine && (
          <MemberPicker key="pick" members={members} verify={(m, pin) => verifyMemberPin(engine, m.id, pin)} onPick={(m) => enter(engine, getMember(engine, m.id) ?? m)} />
        )}
        {phase === 'app' && engine && actor && (
          <motion.div key="app" className="fixed inset-0 flex" initial={ok ? { opacity: 0, scale: 0.985 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease }}>
            <Sidebar onSwitchMember={() => void lock('cambio de integrante')} />
            <div className="flex-1 min-w-0 flex flex-col">
              <Topbar />
              <main className="flex-1 overflow-y-auto px-8 pb-10">
                <AnimatePresence mode="wait">
                  <motion.div key={route} initial={ok ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} exit={ok ? { opacity: 0, y: -8 } : { opacity: 0 }} transition={{ duration: 0.28, ease }}>
                    <ErrorBoundary key={route}><Suspense fallback={<PageSkeleton />}><Page /></Suspense></ErrorBoundary>
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
            <TxEditor />
            <NotificationsPanel />
          </motion.div>
        )}
      </AnimatePresence>
      <Toaster />
    </>
  );
}
