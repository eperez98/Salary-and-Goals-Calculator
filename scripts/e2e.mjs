// End-to-end smoke test against the Vite dev server (browser mode, IndexedDB storage).
// Usage: npm run dev (in another terminal) && node scripts/e2e.mjs [--shots]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const URL = process.env.E2E_URL ?? 'http://127.0.0.1:1420/';
const SHOTS = process.argv.includes('--shots');
const out = process.env.SHOTS_DIR ?? 'test-results/e2e'; // README images come from scripts/screenshots.mjs
mkdirSync(out, { recursive: true });
const errors = [];
const step = (m) => console.log('•', m);
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); console.log('  ✓', m); };

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL }); // p. ej. E2E_CHANNEL=chrome usa el Chrome instalado
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, locale: 'es-PA' });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${out}/${name}.png` }); };
const click = (text, opts = {}) => page.getByRole('button', { name: text, exact: opts.exact ?? false }).first().click();
const dclick = (text) => page.getByRole('dialog').getByRole('button', { name: text, exact: true }).last().click();

try {
  step('Splash');
  await page.goto(URL);
  await page.waitForTimeout(700);
  await shot('01-splash');
  await page.getByText('Bienvenido a Monto').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
  await shot('02-onboarding');
  assert(!(await page.evaluate(() => document.documentElement.classList.contains('dark'))), 'el primer arranque usa el modo claro');
  await page.getByRole('button', { name: 'Modo oscuro' }).click();
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
  await page.getByRole('button', { name: 'Modo claro' }).click();
  await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
  assert(await page.getByRole('tab', { name: 'EN', exact: true }).isVisible(), 'selector de idioma visible desde el primer arranque');
  assert(true, 'cambio rápido de modo claro/oscuro');
  await click('Comenzar');
  step('Onboarding: profile');
  await page.getByPlaceholder('Ej. Carlos').fill('Carlos');
  await click('Familia');
  await page.getByPlaceholder('Ej. Familia Rodríguez').fill('Familia Rodríguez');
  await page.getByPlaceholder('Nombre 1').fill('Ana');
  await click('Continuar');
  step('Onboarding: currency');
  await click('Continuar');
  step('Onboarding: income');
  await page.getByPlaceholder('Ej. Empresa Ejemplo, S.A.').fill('Empresa Ejemplo, S.A.');
  await page.getByRole('textbox', { name: 'Primera quincena' }).fill('1500');
  await page.waitForTimeout(1300);
  assert(!(await page.getByText('Aplicar descuentos de ley (Panamá)').isVisible()), 'el salario inicial se pide neto, sin descuentos');
  const monthly = await page.getByText('Ingreso mensual neto').locator('..').innerText();
  assert(monthly.includes('3,000.00'), 'quincena 1,500 → mensual B/. 3,000.00');
  const annual = await page.getByText(/^Ingreso anual/).locator('..').innerText();
  assert(annual.includes('36,000.00'), 'anual B/. 36,000.00');
  await shot('03-onboarding-salary');
  await click('Continuar');
  step('Onboarding: monthly expenses one by one');
  await page.getByRole('textbox', { name: 'Vivienda (alquiler o hipoteca)' }).fill('900');
  await click('Siguiente');
  await page.getByRole('textbox', { name: 'Electricidad' }).fill('100');
  await click('Siguiente');
  for (let i = 0; i < 10; i++) await click('No tengo este gasto');
  await click('Ver resultado');
  const result = await page.getByText('Fondo restante').locator('..').innerText();
  assert(result.includes('2,000.00'), 'ingreso 3,000 − gastos 1,000 → fondo restante 2,000');
  assert(await page.getByText('Sí puedes ahorrar').isVisible(), 'indica que puede ahorrar');
  await page.waitForTimeout(900);
  await shot('03b-onboarding-expenses');
  await click('Continuar');
  step('Onboarding: account');
  await page.getByRole('textbox', { name: 'Saldo inicial' }).fill('2500');
  await click('Continuar');
  step('Onboarding: security (skip)');
  await click('Continuar');
  await click('Ir a mi panel');
  step('Dashboard after onboarding');
  await page.getByText('Saldo disponible').waitFor({ timeout: 10000 });
  await page.waitForTimeout(1500);
  const hero = await page.getByText('Saldo disponible').locator('..').innerText();
  assert(hero.includes('2,500.00'), 'saldo disponible inicial 2,500');

  step('Monthly plan module');
  await click('Plan mensual');
  await page.getByText('Fondo restante').waitFor();
  assert((await page.getByText('Fondo restante').locator('..').innerText()).includes('2,000.00'), 'plan guardado en el onboarding: fondo restante 2,000');
  await page.waitForTimeout(900);
  await shot('03c-plan');
  await click('Resumen');

  step('Create expense');
  await click('Movimiento', { exact: true });
  await page.getByRole('textbox', { name: 'Importe', exact: true }).fill('45.20');
  await page.getByPlaceholder(/Super 99/).fill('Super 99');
  await page.locator('select').filter({ hasText: 'Sin categoría' }).selectOption({ label: 'Supermercado' });
  await shot('05-new-transaction');
  await dclick('Registrar');
  await page.getByText('Gasto registrado').waitFor();
  await page.waitForTimeout(1500);
  const hero2 = await page.getByText('Saldo disponible').locator('..').innerText();
  assert(hero2.includes('2,454.80'), 'saldo tras gasto 2,454.80');

  step('Duplicate warning');
  await click('Movimiento', { exact: true });
  await page.getByRole('textbox', { name: 'Importe', exact: true }).fill('45.20');
  await page.getByPlaceholder(/Super 99/).fill('Super 99');
  await page.getByText('Posible duplicado').waitFor();
  assert(true, 'aviso de posible duplicado');
  await dclick('Cancelar');

  step('Income: a second transaction (income)');
  await click('Movimiento', { exact: true });
  await page.getByRole('dialog').getByRole('button', { name: 'Ingreso', exact: true }).click();
  await page.getByRole('textbox', { name: 'Importe', exact: true }).fill('300');
  await page.getByPlaceholder(/Quincena, cliente/).fill('Proyecto freelance');
  await dclick('Registrar');
  await page.getByText('Ingreso registrado').waitFor();
  await page.waitForTimeout(1600);
  await shot('06-dashboard');

  step('Edit transaction');
  await click('Movimientos', { exact: true });
  await page.getByRole('button', { name: /Super 99/ }).first().click();
  await page.getByRole('textbox', { name: 'Importe', exact: true }).fill('50');
  await dclick('Guardar cambios');
  await page.getByText('Movimiento actualizado').waitFor();
  await page.waitForTimeout(600);
  await shot('07-transactions');

  step('Export CSV');
  const [dl] = await Promise.all([page.waitForEvent('download'), click('CSV', { exact: true })]);
  assert(dl.suggestedFilename().endsWith('.csv'), 'descarga CSV ' + dl.suggestedFilename());

  step('Delete transaction');
  await page.getByRole('button', { name: /Proyecto freelance/ }).first().click();
  await page.getByRole('dialog', { name: 'Editar movimiento' }).getByRole('button', { name: 'Eliminar', exact: true }).last().click();
  await page.getByRole('dialog', { name: '¿Eliminar este movimiento?' }).getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.getByText('Movimiento eliminado').waitFor();

  for (const [nav, name] of [['Cuentas y tarjetas', '08-accounts'], ['Ingresos y salario', '09-income'], ['Presupuestos', '10-budgets'], ['Objetivos', '11-goals'], ['Préstamos y deudas', '12-debts'], ['Familia', '13-family'], ['Calendario', '14-calendar'], ['Informes', '15-reports'], ['Análisis', '16-insights']]) {
    step('Open ' + nav);
    await click(nav, { exact: true });
    await page.waitForTimeout(1300);
    await shot(name);
  }

  step('Budget');
  await click('Presupuestos', { exact: true });
  await click('Nuevo presupuesto');
  await page.getByRole('dialog').locator('select').selectOption({ label: 'Alimentación' });
  await page.getByRole('textbox', { name: 'Límite mensual' }).fill('60');
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click();
  await page.getByText('Presupuesto guardado').waitFor();
  await page.waitForTimeout(900);
  assert(await page.getByText('Alcanzó el 70 %').or(page.getByText('Alcanzó el 90 %')).first().isVisible(), 'alerta de presupuesto (50/60 = 83%)');

  step('Goal + completion');
  await click('Objetivos', { exact: true });
  await click('Nuevo objetivo');
  await page.getByRole('textbox', { name: 'Meta', exact: true }).fill('100');
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click();
  await page.getByText('Objetivo creado').waitFor();
  await click('Aportar', { exact: true });
  await page.getByRole('dialog').getByRole('textbox', { name: 'Importe' }).fill('100');
  await page.getByRole('dialog').getByRole('button', { name: 'Aportar' }).click();
  await page.getByText(/Objetivo cumplido/).waitFor();
  assert(true, 'objetivo completado con celebración');
  await page.waitForTimeout(1200);
  await shot('11-goals');

  step('Export Excel & PDF reports');
  await click('Informes', { exact: true });
  await page.waitForTimeout(800);
  const [x] = await Promise.all([page.waitForEvent('download'), click('Excel', { exact: true })]);
  assert(x.suggestedFilename().endsWith('.xlsx'), 'descarga Excel ' + x.suggestedFilename());
  const [pdf] = await Promise.all([page.waitForEvent('download'), click('PDF', { exact: true })]);
  assert(pdf.suggestedFilename().endsWith('.pdf'), 'descarga PDF ' + pdf.suggestedFilename());
  const pdfPath = await pdf.path();
  const { readFileSync } = await import('node:fs');
  assert(readFileSync(pdfPath).subarray(0, 4).toString() === '%PDF', 'PDF válido');

  step('Backup + integrity');
  await page.getByRole('button', { name: 'Configuración' }).click();
  await click('Datos y copias');
  await click('Crear copia ahora');
  await page.getByText('Copia creada').waitFor();
  await click('Verificar', { exact: true });
  await page.getByText(/integrity_check: ok/).waitFor();
  assert(true, 'copia de seguridad e integridad OK');

  step('Updates tab');
  await click('Actualizaciones', { exact: true });
  await page.getByText('Monto 0.5.3 Beta 6').waitFor();
  assert(true, 'versión 0.5.3 Beta 6 visible en Actualizaciones');
  await page.waitForTimeout(900);
  await shot('19-updates');

  step('Settings → dark mode');
  await page.getByRole('button', { name: 'Configuración' }).click();
  await click('Apariencia');
  await click('Oscuro', { exact: true });
  await page.waitForTimeout(400);
  assert(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'modo oscuro activo');
  await click('Resumen', { exact: true });
  await page.waitForTimeout(1600);
  await shot('17-dashboard-dark');

  step('Persistence after reload');
  await page.waitForTimeout(800);
  await page.reload();
  await page.getByText('¿Quién está usando Monto?').waitFor({ timeout: 15000 });
  await shot('04-member-picker');
  await page.getByRole('button', { name: /Carlos/ }).first().click();
  await page.getByText('Saldo disponible').waitFor();
  await page.waitForTimeout(1500);
  const hero3 = await page.getByText('Saldo disponible').locator('..').innerText();
  assert(hero3.includes('2,450.00'), 'datos persistidos tras reiniciar (2,450.00)');
  assert(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'preferencia de tema persistida');

  step('Member permissions: switch to Ana (adult) – cannot manage members');
  await page.getByTitle('Cambiar de integrante').click();
  await page.getByRole('button', { name: /Ana/ }).first().click();
  await page.getByText('Saldo disponible').waitFor();
  await click('Familia', { exact: true });
  await page.waitForTimeout(600);
  assert(!(await page.getByRole('button', { name: 'Añadir integrante' }).isVisible()), 'adulto no puede añadir integrantes');

  step('Password + lock + unlock');
  await page.getByRole('button', { name: 'Configuración' }).click();
  await click('Seguridad', { exact: true });
  assert(await page.getByText('Solo un administrador puede cambiar la seguridad.').isVisible(), 'adulto no puede cambiar la seguridad');
  await page.getByTitle('Cambiar de integrante').click();
  await page.getByRole('button', { name: /Carlos/ }).first().click();
  await page.getByText('Saldo disponible').waitFor();
  await page.getByRole('button', { name: 'Configuración' }).click();
  await click('Seguridad', { exact: true });
  await click('Establecer contraseña');
  await page.getByPlaceholder('Mínimo 8 caracteres').fill('clave-segura-123');
  await page.getByRole('dialog').locator('input[type=password]').nth(1).fill('clave-segura-123');
  await dclick('Guardar');
  await page.getByText('Contraseña establecida').waitFor();
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+l');
  await page.getByText('Monto está bloqueado').waitFor({ timeout: 10000 });
  await page.getByPlaceholder('Contraseña').fill('incorrecta');
  await click('Desbloquear');
  await page.getByText('Contraseña incorrecta').waitFor();
  assert(true, 'contraseña incorrecta rechazada');
  await shot('18-lock');
  await page.getByPlaceholder('Contraseña').fill('clave-segura-123');
  await click('Desbloquear');
  await page.getByText('¿Quién está usando Monto?').waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: /Carlos/ }).first().click();
  await page.getByText('Saldo disponible').waitFor();
  assert(true, 'desbloqueo con contraseña correcta');
  const raw = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('monto', 1); r.onsuccess = () => { const g = r.result.transaction('files').objectStore('files').get('monto.db'); g.onsuccess = () => res(new TextDecoder().decode(g.result.slice(0, 9))); }; }));
  assert(raw === 'MONTOENC1', 'base de datos cifrada en reposo');

  console.log('\nE2E OK');
} catch (e) {
  console.error('\nE2E FAILED:', e.message);
  await page.screenshot({ path: `${out}/_failure.png` });
  process.exitCode = 1;
} finally {
  const relevant = errors.filter((x) => !/Download the React DevTools|favicon/.test(x));
  if (relevant.length) { console.log('\nBrowser errors:'); relevant.forEach((x) => console.log('  ', x)); }
  await browser.close();
}
