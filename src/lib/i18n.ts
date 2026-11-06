import { EN } from './locales/en';

/** UI language. Spanish strings are the source; English comes from `locales/en.ts`. */
export type Lang = 'es' | 'en';
const KEY = 'monto:lang';

function detect(): Lang {
  if (typeof window === 'undefined') return 'es';
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch { /* storage blocked: fall back to the OS language */ }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export const lang: Lang = detect();
/** Locale for Intl/Date formatting of times and timestamps. */
export const locale = lang === 'en' ? 'en-US' : 'es-PA';

if (typeof document !== 'undefined') document.documentElement.lang = lang;

/** Switching reloads the window so module-level labels pick up the new language. */
export function setLang(l: Lang) {
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  location.reload();
}

/** Translate a Spanish source string; `{name}` placeholders are filled from `vars`. */
export function tr(es: string, vars?: Record<string, string | number>): string {
  let s = lang === 'en' ? (EN[es] ?? es) : es;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
  return s;
}
