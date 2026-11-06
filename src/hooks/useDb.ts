import { useMemo } from 'react';
import { ZodError } from 'zod';
import { useApp } from '../store/app';
import type { Engine } from '../db/engine';
import type { Actor, ScopeFilter } from '../db/types';
import { can, type Action } from '../domain/permissions';
import { getMember, getProfile } from '../db/repo/core';
import { tr } from '../lib/i18n';

export function useEngine(): Engine {
  const e = useApp((s) => s.engine);
  if (!e) throw new Error(tr('Base de datos no inicializada'));
  return e;
}

/** Re-run a synchronous query whenever the database changes. */
export function useQuery<T>(fn: (e: Engine) => T, deps: unknown[] = []): T {
  const e = useEngine();
  const rev = useApp((s) => s.revision);
  return useMemo(() => fn(e), [e, rev, ...deps]);
}

export function useActor(): Actor {
  const a = useApp((s) => s.actor);
  if (!a) throw new Error(tr('Sin sesión activa'));
  return a;
}

export function useScope(): ScopeFilter {
  const actor = useActor();
  const scope = useApp((s) => s.scope);
  return useMemo(() => ({ scope, memberId: actor.id }), [scope, actor.id]);
}

export function useCan(action: Action): boolean {
  const a = useApp((s) => s.actor);
  return can(a?.role, action);
}

export function useProfile() { return useQuery((e) => getProfile(e)); }
export function useMe() { const a = useActor(); return useQuery((e) => getMember(e, a.id), [a.id]); }

export function errorMessage(err: unknown): string {
  if (err instanceof ZodError) return err.issues[0]?.message ?? tr('Datos no válidos');
  if (err instanceof Error) {
    const m = err.message;
    if (/UNIQUE constraint failed: transactions\.income_source_id/.test(m)) return tr('Este pago ya fue registrado como recibido.');
    if (/UNIQUE constraint failed: budgets/.test(m)) return tr('Ya existe un presupuesto para esa categoría.');
    if (/UNIQUE constraint/.test(m)) return tr('Ese registro ya existe.');
    return m;
  }
  return tr('Ocurrió un error inesperado');
}

/** Run a mutation with toast feedback. Returns the result (or `true` for void results) on success, undefined on error. */
export function useMutate() {
  const engine = useApp((s) => s.engine);
  const actor = useApp((s) => s.actor);
  const toast = useApp((s) => s.toast);
  return <T>(fn: (e: Engine, a: Actor) => T, success?: string | { title: string; body?: string; kind?: 'success' | 'celebrate' }): T | undefined => {
    if (!engine || !actor) return undefined;
    try {
      const r = fn(engine, actor);
      if (success) toast(typeof success === 'string' ? { kind: 'success', title: success } : { kind: success.kind ?? 'success', title: success.title, body: success.body });
      // void mutations resolve to `true` so callers can distinguish success from failure (undefined)
      return (r === undefined ? true : r) as T;
    } catch (err) {
      toast({ kind: 'error', title: tr('No se pudo completar'), body: errorMessage(err) });
      return undefined;
    }
  };
}
