
import { tr } from '../lib/i18n';/**
 * Storage adapters. The SQLite database lives in memory (sql.js / WASM) and
 * is persisted as a single file:
 *  - Desktop (Tauri): %APPDATA%\com.monto.finanzas\monto.db  (atomic write)
 *  - Browser dev mode: IndexedDB
 *  - Tests: memory
 */
export interface StorageAdapter {
  readonly kind: 'tauri' | 'browser' | 'memory';
  load(): Promise<Uint8Array | null>;
  save(bytes: Uint8Array): Promise<void>;
  /** Write a timestamped backup copy and return its name/path. */
  backup(bytes: Uint8Array, name: string): Promise<string>;
  listBackups(): Promise<Array<{ name: string; size?: number; date?: string }>>;
  readBackup(name: string): Promise<Uint8Array>;
  location(): Promise<string>;
}

export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export class MemoryAdapter implements StorageAdapter {
  readonly kind = 'memory' as const;
  data: Uint8Array | null = null;
  backups = new Map<string, Uint8Array>();
  async load() { return this.data; }
  async save(b: Uint8Array) { this.data = b.slice(); }
  async backup(b: Uint8Array, name: string) { this.backups.set(name, b.slice()); return name; }
  async listBackups() { return [...this.backups.keys()].map((name) => ({ name, size: this.backups.get(name)!.length })); }
  async readBackup(name: string) { const b = this.backups.get(name); if (!b) throw new Error(tr('Copia no encontrada')); return b; }
  async location() { return 'memoria'; }
}

const IDB_NAME = 'monto';
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('files'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbOp<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('files', mode);
    const req = fn(tx.objectStore('files'));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export class BrowserAdapter implements StorageAdapter {
  readonly kind = 'browser' as const;
  async load() { return ((await idbOp('readonly', (s) => s.get('monto.db'))) as Uint8Array | undefined) ?? null; }
  async save(b: Uint8Array) { await idbOp('readwrite', (s) => s.put(b, 'monto.db')); }
  async backup(b: Uint8Array, name: string) { await idbOp('readwrite', (s) => s.put(b, `backup/${name}`)); return name; }
  async listBackups() {
    const keys = (await idbOp('readonly', (s) => s.getAllKeys())) as string[];
    return keys.filter((k) => String(k).startsWith('backup/')).map((k) => ({ name: String(k).slice(7) })).sort((a, b) => b.name.localeCompare(a.name));
  }
  async readBackup(name: string) { const b = await idbOp('readonly', (s) => s.get(`backup/${name}`)); if (!b) throw new Error(tr('Copia no encontrada')); return b as Uint8Array; }
  async location() { return tr('IndexedDB del navegador (modo desarrollo)'); }
}

export class TauriAdapter implements StorageAdapter {
  readonly kind = 'tauri' as const;
  private async fs() { return import('@tauri-apps/plugin-fs'); }
  private async dir() {
    const { appDataDir, join } = await import('@tauri-apps/api/path');
    const base = await appDataDir();
    const { mkdir, exists } = await this.fs();
    const backups = await join(base, 'backups');
    if (!(await exists(backups))) await mkdir(backups, { recursive: true });
    return { base, backups, join };
  }
  async load() {
    const { exists, readFile } = await this.fs();
    const { base, join } = await this.dir();
    const p = await join(base, 'monto.db');
    if (!(await exists(p))) {
      // Recover from an interrupted atomic write.
      const tmp = await join(base, 'monto.db.tmp');
      if (await exists(tmp)) return readFile(tmp);
      return null;
    }
    return readFile(p);
  }
  async save(b: Uint8Array) {
    const { writeFile, rename, exists, remove } = await this.fs();
    const { base, join } = await this.dir();
    const p = await join(base, 'monto.db');
    const tmp = await join(base, 'monto.db.tmp');
    await writeFile(tmp, b);
    if (await exists(p)) await remove(p);
    await rename(tmp, p);
  }
  async backup(b: Uint8Array, name: string) {
    const { writeFile } = await this.fs();
    const { backups, join } = await this.dir();
    const p = await join(backups, name);
    await writeFile(p, b);
    return p;
  }
  async listBackups() {
    const { readDir, stat } = await this.fs();
    const { backups, join } = await this.dir();
    const entries = await readDir(backups);
    const out = [];
    for (const e of entries) {
      if (!e.isFile || !e.name.endsWith('.monto')) continue;
      const st = await stat(await join(backups, e.name)).catch(() => null);
      out.push({ name: e.name, size: st?.size, date: st?.mtime ? new Date(st.mtime).toISOString() : undefined });
    }
    return out.sort((a, b) => b.name.localeCompare(a.name));
  }
  async readBackup(name: string) {
    const { readFile } = await this.fs();
    const { backups, join } = await this.dir();
    return readFile(await join(backups, name));
  }
  async location() { return (await this.dir()).base; }
}

export function defaultAdapter(): StorageAdapter {
  if (isTauri()) return new TauriAdapter();
  if (typeof indexedDB !== 'undefined') return new BrowserAdapter();
  return new MemoryAdapter();
}
