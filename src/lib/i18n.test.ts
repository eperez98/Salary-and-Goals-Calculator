import { describe, expect, it } from 'vitest';
import { EN } from './locales/en';
import { tr } from './i18n';
// @ts-expect-error plain ESM helper without type declarations
import { collectKeys } from '../../scripts/i18n-keys.mjs';

describe('i18n', () => {
  it('has an English translation for every tr() key', () => {
    const missing = [...(collectKeys() as Map<string, string>).keys()].filter((k) => !(k in EN));
    expect(missing).toEqual([]);
  });

  it('keeps the same placeholders in both languages', () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
    const bad = Object.entries(EN).filter(([es, en]) => ph(es) !== ph(en)).map(([es]) => es);
    expect(bad).toEqual([]);
  });

  it('falls back to Spanish and fills placeholders', () => {
    expect(tr('Día {d}', { d: 15 })).toBe('Día 15');
    expect(tr('Texto sin traducción')).toBe('Texto sin traducción');
  });
});
