// Renders brand SVGs to PNG using Chromium (Playwright).
// Usage: node scripts/render-brand.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(import.meta.dirname, '..');
const font = (p) => readFileSync(resolve(root, 'node_modules', p)).toString('base64');
const css = `
@font-face{font-family:'Inter Tight Variable';src:url(data:font/woff2;base64,${font('@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:'Instrument Serif';font-style:italic;src:url(data:font/woff2;base64,${font('@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2')}) format('woff2')}
html,body{margin:0;background:transparent}svg{display:block}`;

const jobs = [
  ['assets/brand/app-icon.svg', 'assets/brand/app-icon-1024.png', 1024, 1024],
  ['assets/brand/app-icon.svg', 'assets/brand/favicon-32.png', 32, 32],
  ['assets/brand/app-icon.svg', 'public/icon-192.png', 192, 192],
  ['assets/brand/logo-horizontal.svg', 'assets/brand/logo-horizontal.png', 1040, 280],
  ['assets/brand/logo-vertical.svg', 'assets/brand/logo-vertical.png', 600, 600],
  ['assets/brand/logo-mark.svg', 'assets/brand/logo-mark.png', 512, 512],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, out, w, h] of jobs) {
  const svg = readFileSync(resolve(root, src), 'utf8').replace('<svg ', `<svg width="${w}" height="${h}" `);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<style>${css}</style>${svg}`);
  await page.evaluate(() => document.fonts.ready);
  writeFileSync(resolve(root, out), await page.locator('svg').screenshot({ omitBackground: true }));
  console.log('✓', out);
}
await browser.close();
