import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Engine } from '../db/engine';
import { MemoryAdapter } from '../db/adapters';
import { createMember, seedCategories, setProfile } from '../db/repo/core';
import type { Actor } from '../db/types';

const require = createRequire(import.meta.url);
export const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
void readFileSync;

export async function freshEngine(adapter = new MemoryAdapter()) {
  const e = await Engine.open(adapter, { wasmUrl: wasmPath });
  seedCategories(e);
  const owner = createMember(e, null, { name: 'Carlos', role: 'admin' }, true);
  setProfile(e, { name: 'Carlos', mode: 'family', primaryCurrency: 'PAB', onboarded: true });
  const actor: Actor = { id: owner.id, role: 'admin' };
  return { e, adapter, actor, owner };
}
