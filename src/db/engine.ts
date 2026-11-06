/**
 * Database engine: SQLite compiled to WebAssembly (sql.js) running fully
 * offline. Writes are batched and persisted to disk through a StorageAdapter.
 */
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js';
import { MIGRATIONS } from './schema';
import { decrypt, encrypt, isEncrypted, newKey, type KeyMaterial } from './crypto';
import type { StorageAdapter } from './adapters';
import { tr } from '../lib/i18n';

export type Row = Record<string, SqlValue>;
export type Params = SqlValue[] | Record<string, SqlValue>;

let SQL: SqlJsStatic | null = null;

export async function loadSqlJs(wasmUrl?: string): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  SQL = await initSqlJs(wasmUrl ? { locateFile: () => wasmUrl } : undefined);
  return SQL;
}

export class LockedError extends Error {
  constructor() { super(tr('La base de datos está protegida con contraseña.')); this.name = 'LockedError'; }
}

export class Engine {
  db!: Database;
  revision = 0;
  private key: KeyMaterial | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saving: Promise<void> = Promise.resolve();
  private listeners = new Set<() => void>();
  private txDepth = 0;
  lastSavedAt: Date | null = null;
  saveError: Error | null = null;

  constructor(public adapter: StorageAdapter, private SQLlib: SqlJsStatic) {}

  static async open(adapter: StorageAdapter, opts: { password?: string; wasmUrl?: string } = {}): Promise<Engine> {
    const lib = await loadSqlJs(opts.wasmUrl);
    const e = new Engine(adapter, lib);
    const bytes = await adapter.load();
    if (bytes && isEncrypted(bytes)) {
      if (!opts.password) throw new LockedError();
      const { plain, km } = await decrypt(bytes, opts.password);
      e.key = km;
      e.db = new lib.Database(plain);
    } else {
      e.db = bytes ? new lib.Database(bytes) : new lib.Database();
    }
    e.db.run('PRAGMA foreign_keys = ON;');
    e.migrate();
    if (!bytes) await e.flush();
    return e;
  }

  static async isLocked(adapter: StorageAdapter): Promise<boolean> {
    const b = await adapter.load();
    return !!b && isEncrypted(b);
  }

  get encrypted() { return this.key !== null; }

  migrate() {
    const v = Number(this.get<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0);
    for (let i = v; i < MIGRATIONS.length; i++) {
      this.db.run('BEGIN');
      try {
        this.db.run(MIGRATIONS[i]);
        this.db.run(`PRAGMA user_version = ${i + 1}`);
        this.db.run('COMMIT');
      } catch (err) {
        this.db.run('ROLLBACK');
        throw new Error(tr('Error al migrar la base de datos a la versión {v0}: {message}', { v0: i + 1, message: (err as Error).message }));
      }
    }
  }

  all<T = Row>(sql: string, params: Params = []): T[] {
    const st = this.db.prepare(sql);
    try {
      st.bind(params);
      const out: T[] = [];
      while (st.step()) out.push(st.getAsObject() as T);
      return out;
    } finally {
      st.free();
    }
  }

  get<T = Row>(sql: string, params: Params = []): T | undefined {
    return this.all<T>(sql, params)[0];
  }

  scalar<T extends SqlValue = number>(sql: string, params: Params = []): T {
    const r = this.get<Row>(sql, params);
    return (r ? Object.values(r)[0] : null) as T;
  }

  /** Execute a write statement and schedule persistence. */
  run(sql: string, params: Params = []): void {
    this.db.run(sql, params);
    if (this.txDepth === 0) this.changed();
  }

  /** Run several writes atomically. */
  transaction<T>(fn: () => T): T {
    if (this.txDepth > 0) return fn();
    this.db.run('BEGIN');
    this.txDepth++;
    try {
      const r = fn();
      this.db.run('COMMIT');
      return r;
    } catch (err) {
      this.db.run('ROLLBACK');
      throw err;
    } finally {
      this.txDepth--;
      this.changed();
    }
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private changed() {
    this.revision++;
    this.listeners.forEach((l) => l());
    this.scheduleSave();
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => { void this.flush(); }, 400);
  }

  async serialize(): Promise<Uint8Array> {
    const plain = this.db.export();
    // export() resets pragmas on some builds; re-enable FK enforcement.
    this.db.run('PRAGMA foreign_keys = ON;');
    return this.key ? encrypt(plain, this.key) : plain;
  }

  /** Persist immediately. */
  async flush(): Promise<void> {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    this.saving = this.saving.then(async () => {
      try {
        await this.adapter.save(await this.serialize());
        this.lastSavedAt = new Date();
        this.saveError = null;
      } catch (err) {
        this.saveError = err as Error;
        console.error(tr('Error guardando la base de datos'), err);
      }
    });
    return this.saving;
  }

  async setPassword(password: string | null): Promise<void> {
    this.key = password ? await newKey(password) : null;
    await this.flush();
  }

  integrityCheck(): { ok: boolean; messages: string[] } {
    const rows = this.all<{ integrity_check: string }>('PRAGMA integrity_check');
    const fk = this.all('PRAGMA foreign_key_check');
    const messages = rows.map((r) => r.integrity_check).filter((m) => m !== 'ok');
    if (fk.length) messages.push(tr('{length} referencias rotas entre tablas', { length: fk.length }));
    return { ok: messages.length === 0, messages };
  }

  /** Validate that bytes are a usable Monto database (plain or encrypted). */
  static async validateBytes(bytes: Uint8Array, password?: string): Promise<{ ok: boolean; version: number; error?: string; plain?: Uint8Array }> {
    try {
      const lib = await loadSqlJs();
      let plain = bytes;
      if (isEncrypted(bytes)) {
        if (!password) return { ok: false, version: 0, error: tr('La copia está cifrada; introduce la contraseña.') };
        plain = (await decrypt(bytes, password)).plain;
      }
      const db = new lib.Database(plain);
      const ic = db.exec('PRAGMA integrity_check')[0]?.values[0]?.[0];
      const version = Number(db.exec('PRAGMA user_version')[0]?.values[0]?.[0] ?? 0);
      const hasTables = db.exec("SELECT count(*) FROM sqlite_master WHERE name IN ('transactions','accounts','settings')")[0]?.values[0]?.[0];
      db.close();
      if (ic !== 'ok') return { ok: false, version, error: tr('La copia está dañada (integrity_check falló).') };
      if (Number(hasTables) !== 3) return { ok: false, version, error: tr('El archivo no es una base de datos de Monto.') };
      if (version > MIGRATIONS.length) return { ok: false, version, error: tr('La copia pertenece a una versión más reciente de Monto.') };
      return { ok: true, version, plain };
    } catch (err) {
      return { ok: false, version: 0, error: (err as Error).message || tr('Archivo no válido.') };
    }
  }

  /** Replace current DB with validated plain bytes (restore). */
  async replaceWith(plain: Uint8Array): Promise<void> {
    const old = this.db;
    this.db = new this.SQLlib.Database(plain);
    this.db.run('PRAGMA foreign_keys = ON;');
    this.migrate();
    old.close();
    this.changed();
    await this.flush();
  }

  private closed = false;
  /** Close the in-memory database (idempotent). */
  close() { if (this.closed) return; this.closed = true; if (this.saveTimer) clearTimeout(this.saveTimer); this.db.close(); }
}

export const uid = (): string => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
export const nowISO = (): string => new Date().toISOString();
