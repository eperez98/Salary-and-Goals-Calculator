import { create } from 'zustand';
import type { Engine } from '../db/engine';
import type { Actor, Scope, Transaction, TxType } from '../db/types';
import type { PeriodKind, Range } from '../lib/dates';

export type RouteKey = 'dashboard' | 'transactions' | 'accounts' | 'income' | 'budgets' | 'goals' | 'debts' | 'family' | 'calendar' | 'reports' | 'insights' | 'settings';
export type Phase = 'splash' | 'locked' | 'onboarding' | 'pickMember' | 'app' | 'error';

export interface Toast { id: number; kind: 'success' | 'error' | 'info' | 'celebrate'; title: string; body?: string; action?: { label: string; onClick: () => void } }

interface TxEditor { open: boolean; type?: TxType; tx?: Transaction | null }

interface AppState {
  engine: Engine | null;
  revision: number;
  phase: Phase;
  fatal: string | null;
  route: RouteKey;
  actor: Actor | null;
  sessionId: string | null;
  scope: Scope;
  period: PeriodKind;
  customRange: Range | null;
  toasts: Toast[];
  txEditor: TxEditor;
  notificationsOpen: boolean;
  reducedMotion: boolean;
  dark: boolean;
  setEngine: (e: Engine | null) => void;
  bump: () => void;
  setPhase: (p: Phase, fatal?: string) => void;
  go: (r: RouteKey) => void;
  setActor: (a: Actor | null, sessionId?: string | null) => void;
  setScope: (s: Scope) => void;
  setPeriod: (p: PeriodKind, r?: Range | null) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  openTx: (type?: TxType, tx?: Transaction | null) => void;
  closeTx: () => void;
  setNotificationsOpen: (o: boolean) => void;
  setVisual: (v: { reducedMotion?: boolean; dark?: boolean }) => void;
}

let toastId = 0;

export const useApp = create<AppState>((set) => ({
  engine: null,
  revision: 0,
  phase: 'splash',
  fatal: null,
  route: 'dashboard',
  actor: null,
  sessionId: null,
  scope: 'personal',
  period: 'month',
  customRange: null,
  toasts: [],
  txEditor: { open: false },
  notificationsOpen: false,
  reducedMotion: false,
  dark: false,
  setEngine: (engine) => set({ engine, revision: engine?.revision ?? 0 }),
  bump: () => set((s) => ({ revision: s.revision + 1 })),
  setPhase: (phase, fatal) => set({ phase, fatal: fatal ?? null }),
  go: (route) => set({ route }),
  setActor: (actor, sessionId = null) => set({ actor, sessionId }),
  setScope: (scope) => set({ scope }),
  setPeriod: (period, customRange = null) => set({ period, customRange }),
  toast: (t) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), t.action ? 12000 : t.kind === 'error' ? 6500 : 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  openTx: (type, tx = null) => set({ txEditor: { open: true, type, tx } }),
  closeTx: () => set({ txEditor: { open: false } }),
  setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
  setVisual: (v) => set(v),
}));
