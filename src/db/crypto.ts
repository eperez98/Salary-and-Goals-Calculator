
import { tr } from '../lib/i18n';/**
 * At-rest encryption for the database file when the user sets a password.
 * PBKDF2-SHA256 (310k iterations) → AES-256-GCM. GCM authentication means a
 * wrong password simply fails to decrypt; no password hash is stored.
 *
 * File layout: "MONTOENC1" (9 bytes) | salt (16) | iv (12) | ciphertext
 */
const MAGIC = new TextEncoder().encode('MONTOENC1');
const ITER = 310_000;

const subtle = () => globalThis.crypto.subtle;

export function isEncrypted(bytes: Uint8Array): boolean {
  if (bytes.length < MAGIC.length) return false;
  return MAGIC.every((b, i) => bytes[i] === b);
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITER, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface KeyMaterial { key: CryptoKey; salt: Uint8Array }

export async function newKey(password: string): Promise<KeyMaterial> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { key: await deriveKey(password, salt), salt };
}

export async function encrypt(plain: Uint8Array, km: KeyMaterial): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, km.key, plain as BufferSource));
  const out = new Uint8Array(MAGIC.length + 16 + 12 + ct.length);
  out.set(MAGIC, 0);
  out.set(km.salt, MAGIC.length);
  out.set(iv, MAGIC.length + 16);
  out.set(ct, MAGIC.length + 28);
  return out;
}

export class WrongPasswordError extends Error {
  constructor() { super(tr('Contraseña incorrecta.')); this.name = 'WrongPasswordError'; }
}

export async function decrypt(file: Uint8Array, password: string): Promise<{ plain: Uint8Array; km: KeyMaterial }> {
  const salt = file.slice(MAGIC.length, MAGIC.length + 16);
  const iv = file.slice(MAGIC.length + 16, MAGIC.length + 28);
  const ct = file.slice(MAGIC.length + 28);
  const key = await deriveKey(password, salt);
  try {
    const plain = new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv }, key, ct));
    return { plain, km: { key, salt } };
  } catch {
    throw new WrongPasswordError();
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const h = await subtle().digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
