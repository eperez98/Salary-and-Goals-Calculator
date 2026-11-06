// Lists every tr('…') key in src/ and reports the ones missing from src/lib/locales/en.ts.
// Usage: node scripts/i18n-keys.mjs [--all]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)) files.push(p);
  }
})('src');

export function collectKeys() {
  const keys = new Map();
  for (const file of files) {
    const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (n) => {
      if (ts.isCallExpression(n) && n.expression.getText() === 'tr') {
        const a = n.arguments[0];
        if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) {
          if (!keys.has(a.text)) keys.set(a.text, `${file}:${sf.getLineAndCharacterOfPosition(a.getStart()).line + 1}`);
        } else console.error(`Clave no literal en ${file}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return keys;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('i18n-keys.mjs')) {
  const keys = collectKeys();
  const en = readFileSync('src/lib/locales/en.ts', 'utf8');
  const have = new Set([...en.matchAll(/^\s*'((?:\\.|[^'\\])*)':/gm)].map((m) => m[1].replace(/\\(.)/g, '$1')));
  const all = process.argv.includes('--all');
  const missing = [...keys].filter(([k]) => all || !have.has(k));
  for (const [k, where] of missing) console.log(`${JSON.stringify(k)}\t${where}`);
  console.error(`${keys.size} claves · ${missing.length} ${all ? 'listadas' : 'sin traducir'}`);
  process.exitCode = !all && missing.length ? 1 : 0;
}
