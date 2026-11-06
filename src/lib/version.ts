import pkg from '../../package.json';

/** Human label for a SemVer version: "0.4.8-beta.2" → "0.4.8 Beta 2". */
export function versionLabel(v: string): string {
  const m = v.replace(/^v/, '').match(/^(\d+\.\d+\.\d+)(?:-([a-z]+)\.?(\d+)?)?/i);
  if (!m) return v;
  const [, core, tag, n] = m;
  if (!tag) return core;
  const names: Record<string, string> = { alpha: 'Alpha', beta: 'Beta', rc: 'RC' };
  return `${core} ${names[tag.toLowerCase()] ?? tag}${n ? ` ${n}` : ''}`;
}

export const APP_VERSION: string = pkg.version;
export const APP_VERSION_LABEL = versionLabel(APP_VERSION);
export const IS_PRERELEASE = APP_VERSION.includes('-');
