import { useApp } from '../../store/app';
import { setPrefs } from '../../db/repo/core';
import { IconButton, Segmented } from '../ui';
import { lang, setLang, tr, type Lang } from '../../lib/i18n';

/** Light/dark toggle and language selector, available from the first screen on. */
export function QuickPrefs() {
  const engine = useApp((s) => s.engine);
  const dark = useApp((s) => s.dark);
  const changeLang = (v: Lang) => { if (v !== lang) void (engine ? engine.flush() : Promise.resolve()).then(() => setLang(v)); };
  return (
    <div className="flex items-center gap-2">
      <Segmented size="sm" layoutId="lang" value={lang} onChange={changeLang} options={[{ value: 'es', label: 'ES' }, { value: 'en', label: 'EN' }]} />
      {/* setPrefs writes to the database; the engine bumps its revision and App re-applies the theme */}
      <IconButton icon={dark ? 'sun' : 'moon'} label={dark ? tr('Modo claro') : tr('Modo oscuro')} onClick={() => engine && setPrefs(engine, { theme: dark ? 'light' : 'dark' })} />
    </div>
  );
}
