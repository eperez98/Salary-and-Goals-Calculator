// README screenshots with fictional demo data, in Spanish and English.
// Usage: npm run dev (another terminal) && node scripts/screenshots.mjs   (E2E_CHANNEL=chrome to use installed Chrome)
// Writes assets/screenshots/{es,en}/*.png and assets/brand/readme-hero-{es,en}.png. No real data is used.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const URL = process.env.E2E_URL ?? 'http://127.0.0.1:1420/';
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL });

const T = {
  es: { start: 'Comenzar', cont: 'Continuar', next: 'Siguiente', skip: 'No tengo este gasto', result: 'Ver resultado', go: 'Ir a mi panel', name: 'Ej. Carlos', family: 'Familia', household: 'Ej. Familia Rodríguez', other: 'Nombre 1', employer: 'Ej. Empresa Ejemplo, S.A.', first: 'Primera quincena', housing: 'Vivienda (alquiler o hipoteca)', balance: 'Saldo inicial', ready: 'Saldo disponible',
    d: { rent: 'Alquiler apartamento', grocery: 'Super 99', fuel: 'Gasolina Puma', power: 'ENSA electricidad', net: 'Cable Onda internet', cinema: 'Cinépolis', food: 'Restaurante El Trapiche', pharmacy: 'Farmacia Arrocha', netflix: 'Netflix', emergency: 'Fondo de emergencia', trip: 'Viaje a Boquete', car: 'Préstamo de auto', card: 'Visa Banco General', cash: 'Efectivo', school: 'Colegiatura', freelance: 'Diseño web freelance' } },
  en: { start: 'Get started', cont: 'Continue', next: 'Next', skip: "I don't have this expense", result: 'See result', go: 'Go to my dashboard', name: 'E.g. Carlos', family: 'Family', household: 'E.g. The Rodríguez Family', other: 'Name 1', employer: 'E.g. Example Company Inc.', first: 'First payday', housing: 'Housing (rent or mortgage)', balance: 'Opening balance', ready: 'Available balance',
    d: { rent: 'Apartment rent', grocery: 'Super 99 groceries', fuel: 'Puma fuel', power: 'ENSA electricity', net: 'Cable Onda internet', cinema: 'Cinépolis', food: 'El Trapiche restaurant', pharmacy: 'Arrocha pharmacy', netflix: 'Netflix', emergency: 'Emergency fund', trip: 'Trip to Boquete', car: 'Car loan', card: 'Banco General Visa', cash: 'Cash', school: 'School tuition', freelance: 'Freelance web design' } },
};

for (const lang of ['es', 'en']) {
  const t = T[lang];
  const out = `assets/screenshots/${lang}`;
  mkdirSync(out, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: lang === 'es' ? 'es-PA' : 'en-US' });
  const page = await ctx.newPage();
  const shot = async (name, wait = 1200) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${out}/${name}.png` }); };
  const btn = (name) => page.getByRole('button', { name, exact: true }).first().click();

  await page.goto(URL);
  await page.getByRole('button', { name: t.start }).waitFor({ timeout: 20000 });
  await shot('onboarding-welcome');
  await btn(t.start);
  await page.getByPlaceholder(t.name).fill('Carlos Rodríguez');
  await page.getByText(t.family, { exact: true }).first().click();
  await page.getByPlaceholder(t.household).fill(lang === 'es' ? 'Familia Rodríguez' : 'The Rodríguez Family');
  await page.getByPlaceholder(t.other).fill('Ana');
  await btn(t.cont);
  await btn(t.cont);
  await page.getByPlaceholder(t.employer).fill(lang === 'es' ? 'Empresa Ejemplo, S.A.' : 'Example Company Inc.');
  await page.getByRole('textbox', { name: t.first }).fill('1250');
  await shot('onboarding-salary');
  await btn(t.cont);
  await page.getByRole('textbox', { name: t.housing }).fill('650');
  await btn(t.next);
  // Wait for each question's enter animation so the value lands in the right field.
  for (const v of ['85', '30', '7', '55', '520', '140']) { await page.waitForTimeout(450); await page.getByRole('textbox').first().fill(v); await btn(t.next); }
  for (let i = 0; i < 5; i++) { await page.waitForTimeout(450); await btn(t.skip); }
  await btn(t.result);
  await shot('onboarding-expenses');
  await btn(t.cont);
  await page.getByRole('textbox', { name: t.balance }).fill('3480');
  await btn(t.cont);
  await btn(t.cont);
  await btn(t.go);
  await page.getByText(t.ready).waitFor({ timeout: 15000 });

  // Seed months of fictional activity through the app's own data layer.
  await page.evaluate(async (d) => {
    const { useApp } = await import('/src/store/app.ts');
    const fin = await import('/src/db/repo/finance.ts');
    const pl = await import('/src/db/repo/planning.ts');
    const { payOccurrences } = await import('/src/domain/salary.ts');
    const { addMonths, addDays, today } = await import('/src/lib/dates.ts');
    const { engine: e, actor: a } = useApp.getState();
    const cat = (icon) => e.get('SELECT id FROM categories WHERE icon = ? AND parent_id IS NULL', [icon])?.id ?? null;
    const main = fin.listAccounts(e)[0];
    const card = fin.createAccount(e, a, { name: d.card, type: 'credit_card', currency: 'PAB', initialBalance: 0, creditLimit: 250000, institution: 'Banco General' });
    fin.createAccount(e, a, { name: d.cash, type: 'cash', currency: 'USD', initialBalance: 18000 });
    const ana = e.get("SELECT id FROM members WHERE is_owner = 0")?.id;
    const now = today();
    const src = pl.listIncomeSources(e)[0];
    const from = addMonths(now, -6);
    pl.updateIncomeSource(e, a, src.id, { startDate: from });
    for (const o of payOccurrences(src.config, from, now)) if (o.date <= now) pl.markPaymentReceived(e, a, src, o, { date: o.date });
    // The next payday arrived early (allowed: received today, never with a future date).
    const nextPay = payOccurrences(src.config, addDays(now, 1), addDays(now, 20))[0];
    if (nextPay) pl.markPaymentReceived(e, a, src, nextPay, { date: now });
    const tx = (date, description, amount, icon, extra = {}) => fin.createTransaction(e, a, { type: 'expense', description, amount, currency: 'PAB', date, categoryId: cat(icon), accountId: main.id, paymentMethod: 'debit', ...extra });
    for (let m = 5; m >= 0; m--) {
      const base = addMonths(`${now.slice(0, 7)}-01`, -m);
      const elapsed = Number(now.slice(8, 10));
      // Current month: fit the month's activity into the days already elapsed so the dashboard isn't empty.
      const day = (n) => addDays(base, (m === 0 ? ((n - 1) % elapsed) + 1 : n) - 1);
      const j = (n) => 1 + ((m * 7 + n * 3) % 9) / 10;
      const add = (n, ...r) => { const x = day(n); if (x) tx(x, ...r); };
      add(1, d.rent, 65000, 'home', { paymentMethod: 'ach' });
      add(3, d.grocery, Math.round(11850 * j(1)), 'food');
      add(10, d.grocery, Math.round(9640 * j(2)), 'food', { scope: 'family' });
      add(17, d.grocery, Math.round(10220 * j(3)), 'food', { scope: 'family', memberId: ana });
      add(24, d.grocery, Math.round(8760 * j(4)), 'food');
      add(6, d.fuel, Math.round(4500 * j(5)), 'transport', { accountId: card.id, paymentMethod: 'credit' });
      add(20, d.fuel, Math.round(4200 * j(6)), 'transport', { accountId: card.id, paymentMethod: 'credit' });
      add(12, d.power, Math.round(8500 * j(7)), 'utilities', { paymentMethod: 'ach' });
      add(15, d.net, 5499, 'internet', { paymentMethod: 'ach' });
      add(14, d.food, Math.round(3850 * j(8)), 'food', { accountId: card.id, paymentMethod: 'credit' });
      add(22, d.cinema, 2400, 'fun', { paymentMethod: 'yappy' });
      if (m % 2 === 0) add(8, d.pharmacy, Math.round(2275 * j(9)), 'health');
      add(5, d.school, 18000, 'education', { scope: 'family', memberId: ana, paymentMethod: 'ach' });
      if (m % 3 === 1 || m === 0) { const x = day(18); if (x) fin.createTransaction(e, a, { type: 'income', description: d.freelance, amount: 45000, currency: 'PAB', date: x, categoryId: cat('freelance'), accountId: main.id, paymentMethod: 'yappy' }); }
    }
    for (const [icon, amt] of [['food', 45000], ['transport', 15000], ['fun', 8000], ['utilities', 15000]]) pl.upsertBudget(e, a, { categoryId: cat(icon), amount: amt, scope: icon === 'food' ? 'family' : 'personal' });
    const g1 = pl.createGoal(e, a, { name: d.emergency, kind: 'emergency', target: 300000, currency: 'PAB', targetDate: addMonths(now, 10), scope: 'personal' });
    const g2 = pl.createGoal(e, a, { name: d.trip, kind: 'vacation', target: 120000, currency: 'PAB', targetDate: addMonths(now, 4), scope: 'family' });
    for (let m = 5; m >= 0; m--) { const x = addDays(addMonths(`${now.slice(0, 7)}-01`, -m), 15); if (x <= now) { pl.contributeToGoal(e, a, g1.id, 20000, x); pl.contributeToGoal(e, a, g2.id, 12000, x); } }
    const car = pl.createDebt(e, a, { name: d.car, kind: 'auto', principal: 1450000, currency: 'PAB', annualRate: 7.5, termMonths: 60, startDate: addMonths(now, -14), paymentDay: 10, lender: 'Banistmo', accountId: main.id, scope: 'personal' });
    for (let m = 13; m >= 0; m--) { const x = addDays(addMonths(`${now.slice(0, 7)}-01`, -m), 9); if (x <= now) pl.payDebt(e, a, car.id, { amount: 29055, date: x, accountId: main.id }); }
    pl.createRecurring(e, a, { kind: 'expense', description: d.netflix, amount: 1599, currency: 'PAB', categoryId: cat('fun'), accountId: card.id, paymentMethod: 'credit', frequency: 'monthly', startDate: addDays(now, 3), autoPost: true, scope: 'family' });
    pl.createRecurring(e, a, { kind: 'expense', description: d.rent, amount: 65000, currency: 'PAB', categoryId: cat('home'), accountId: main.id, paymentMethod: 'ach', frequency: 'monthly', startDate: addMonths(`${now.slice(0, 7)}-01`, 1), autoPost: false, scope: 'family' });
    await e.flush();
  }, t.d);

  const go = (route) => page.evaluate(async (r) => { const { useApp } = await import('/src/store/app.ts'); useApp.getState().go(r); }, route);
  for (const r of ['dashboard', 'transactions', 'accounts', 'income', 'plan', 'budgets', 'goals', 'debts', 'family', 'calendar', 'reports', 'insights']) { await go(r); await shot(r, 1600); }
  await go('dashboard');
  await page.evaluate(async () => { const { useApp } = await import('/src/store/app.ts'); const { setPrefs } = await import('/src/db/repo/core.ts'); setPrefs(useApp.getState().engine, { theme: 'dark' }); });
  await shot('dashboard-dark', 1800);
  await go('plan');
  await shot('plan-dark', 1600);
  await ctx.close();
}

// Hero banner (1280×640, also usable as GitHub social preview).
const logo = readFileSync('assets/brand/app-icon.svg', 'utf8');
const shotB64 = (lang, n) => readFileSync(`assets/screenshots/${lang}/${n}.png`).toString('base64');
for (const lang of ['es', 'en']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
  const tag = lang === 'es' ? ['Finanzas personales y familiares', 'para Panamá', 'Balboas y dólares · Sin conexión · Español e inglés'] : ['Personal & family finances', 'for Panama', 'Balboas & dollars · Offline · English & Spanish'];
  await page.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box;margin:0}body{width:1280px;height:640px;overflow:hidden;font-family:'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif;background:radial-gradient(1200px 600px at 0% 0%,#1d4a72 0%,#14304D 35%,#0A1626 100%);color:#F5F3EE;position:relative}
    .glow{position:absolute;width:520px;height:520px;border-radius:50%;background:#E8930F;filter:blur(160px);opacity:.22;right:-60px;top:-120px}
    .left{position:absolute;left:72px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center}
    .brand{display:flex;align-items:center;gap:16px}.brand svg{width:64px;height:64px}.brand b{font-size:54px;letter-spacing:-.05em;font-weight:700}
    h1{font-size:40px;line-height:1.08;letter-spacing:-.035em;font-weight:600;margin-top:28px}h1 span{background:linear-gradient(90deg,#FFD36E,#E8930F);-webkit-background-clip:text;color:transparent}
    p{margin-top:18px;font-size:17px;color:rgba(245,243,238,.68)}
    .shot{position:absolute;left:590px;top:70px;width:900px;border-radius:18px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.08);transform:perspective(1600px) rotateY(-9deg) rotateX(3deg);transform-origin:left center}
    .shot img{display:block;width:100%}
    .bar{height:30px;background:#ECEAE4;display:flex;align-items:center;gap:7px;padding-left:14px}.bar i{width:11px;height:11px;border-radius:50%;background:#D5D2CB;display:block}
  </style></head><body><div class="glow"></div>
    <div class="left"><div class="brand">${logo}<b>monto</b></div><h1>${tag[0]}<br><span>${tag[1]}</span></h1><p>${tag[2]}</p></div>
    <div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="data:image/png;base64,${shotB64(lang, 'dashboard')}"></div>
  </body></html>`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `assets/brand/readme-hero-${lang}.png` });
  await page.close();
}
await browser.close();
console.log('Capturas listas');
