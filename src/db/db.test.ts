import { describe, expect, it } from 'vitest';
import { freshEngine, wasmPath } from '../test/helpers';
import { Engine, LockedError } from './engine';
import { WrongPasswordError } from './crypto';
import { categoryIdByName, createMember, getProfile, listActivity } from './repo/core';
import { createAccount, createTransaction, deleteTransaction, getAccount, listTransactions, updateTransaction, addAttachment, listAttachments, createCategory, listCategories } from './repo/finance';
import { contributeToGoal, createDebt, createGoal, createIncomeSource, createRecurring, familyBalances, getDebt, getGoal, incomeSummary, listBudgets, markPaymentReceived, payDebt, postRecurring, recurringOccurrences, upsertBudget, createSettlement, listRecurring, runAutoPost } from './repo/planning';
import { alerts, balances, expensesByCategory, monthlySeries, totals, upcoming } from './repo/analytics';
import { PermissionError } from '../domain/permissions';
import { addDays, today } from '../lib/dates';

describe('database engine', () => {
  it('migrates, seeds and persists across restarts', async () => {
    const { e, adapter, actor } = await freshEngine();
    const acc = createAccount(e, actor, { name: 'Banco General', type: 'savings', currency: 'PAB', initialBalance: 100000 });
    createTransaction(e, actor, { type: 'expense', description: 'Super 99', amount: 2500, currency: 'PAB', date: '2026-11-01', accountId: acc.id, categoryId: categoryIdByName(e, 'Alimentación', 'expense') });
    await e.flush();
    const e2 = await Engine.open(adapter, { wasmUrl: wasmPath });
    expect(getAccount(e2, acc.id)!.balance).toBe(97500);
    expect(listTransactions(e2)).toHaveLength(1);
    expect(getProfile(e2).onboarded).toBe(true);
    expect(e2.integrityCheck().ok).toBe(true);
  });

  it('encrypts with password and rejects wrong passwords', async () => {
    const { e, adapter } = await freshEngine();
    await e.setPassword('secreto123');
    await expect(Engine.open(adapter, { wasmUrl: wasmPath })).rejects.toBeInstanceOf(LockedError);
    await expect(Engine.open(adapter, { wasmUrl: wasmPath, password: 'mal' })).rejects.toBeInstanceOf(WrongPasswordError);
    const e2 = await Engine.open(adapter, { wasmUrl: wasmPath, password: 'secreto123' });
    expect(getProfile(e2).name).toBe('Carlos');
    const raw = await adapter.load();
    expect(new TextDecoder().decode(raw!.slice(0, 9))).toBe('MONTOENC1');
  });

  it('validates backup bytes before restoring', async () => {
    const { e } = await freshEngine();
    const bytes = await e.serialize();
    expect((await Engine.validateBytes(bytes)).ok).toBe(true);
    expect((await Engine.validateBytes(new TextEncoder().encode('no soy sqlite'))).ok).toBe(false);
  });
});

describe('transactions & accounts', () => {
  it('create, edit and delete update balances (PAB & USD kept separate)', async () => {
    const { e, actor } = await freshEngine();
    const pab = createAccount(e, actor, { name: 'Banistmo', type: 'checking', currency: 'PAB', initialBalance: 50000 });
    const usd = createAccount(e, actor, { name: 'Chase', type: 'checking', currency: 'USD', initialBalance: 20000 });
    const t = createTransaction(e, actor, { type: 'income', description: 'Cliente', amount: 10000, currency: 'PAB', date: '2026-11-02', accountId: pab.id });
    expect(getAccount(e, pab.id)!.balance).toBe(60000);
    updateTransaction(e, actor, t.id, { amount: 15000 });
    expect(getAccount(e, pab.id)!.balance).toBe(65000);
    createTransaction(e, actor, { type: 'transfer', description: 'Envío', amount: 5000, currency: 'PAB', date: '2026-11-03', accountId: pab.id, toAccountId: usd.id });
    expect(getAccount(e, usd.id)!.balance).toBe(25000);
    const b = balances(e);
    expect(b.available).toEqual({ PAB: 60000, USD: 25000 });
    deleteTransaction(e, actor, t.id);
    expect(getAccount(e, pab.id)!.balance).toBe(45000);
    expect(() => createTransaction(e, actor, { type: 'expense', description: 'x', amount: 100, currency: 'USD', date: '2026-11-03', accountId: pab.id })).toThrow(/misma moneda/);
    expect(() => createTransaction(e, actor, { type: 'expense', description: '', amount: 100, currency: 'PAB', date: '2026-11-03', accountId: pab.id })).toThrow();
  });

  it('credit card expenses and card payments', async () => {
    const { e, actor } = await freshEngine();
    const bank = createAccount(e, actor, { name: 'Banco', type: 'savings', currency: 'PAB', initialBalance: 100000 });
    const card = createAccount(e, actor, { name: 'Visa', type: 'credit_card', currency: 'PAB', initialBalance: 0, creditLimit: 200000 });
    createTransaction(e, actor, { type: 'expense', description: 'Compra', amount: 30000, currency: 'PAB', date: '2026-11-01', accountId: card.id });
    expect(getAccount(e, card.id)!.balance).toBe(-30000);
    createTransaction(e, actor, { type: 'card_payment', description: 'Pago Visa', amount: 30000, currency: 'PAB', date: '2026-11-05', accountId: bank.id, toAccountId: card.id });
    expect(getAccount(e, card.id)!.balance).toBe(0);
    const t = totals(e, { from: '2026-11-01', to: '2026-11-30' });
    expect(t.expense).toBe(30000); // card payment is not double counted
  });

  it('search, filters, attachments and custom subcategories', async () => {
    const { e, actor } = await freshEngine();
    const acc = createAccount(e, actor, { name: 'Banco', type: 'savings', currency: 'PAB', initialBalance: 0 });
    const food = categoryIdByName(e, 'Alimentación', 'expense')!;
    const sub = createCategory(e, actor, { name: 'Panadería', kind: 'expense', parentId: food });
    const t = createTransaction(e, actor, { type: 'expense', description: 'Pan de la esquina', amount: 300, currency: 'PAB', date: '2026-11-01', accountId: acc.id, categoryId: sub.id, notes: 'desayuno' });
    createTransaction(e, actor, { type: 'expense', description: 'Gasolina', amount: 4000, currency: 'PAB', date: '2026-11-02', accountId: acc.id });
    expect(listTransactions(e, { search: 'desayuno' })).toHaveLength(1);
    expect(listTransactions(e, { categoryId: food })).toHaveLength(1);
    expect(listTransactions(e, { minAmount: 1000 })).toHaveLength(1);
    addAttachment(e, actor, t.id, { name: 'recibo.png', mime: 'image/png', data: new Uint8Array([1, 2, 3]) });
    expect(listAttachments(e, t.id)).toHaveLength(1);
    expect(expensesByCategory(e, { from: '2026-11-01', to: '2026-11-30' })[0].name).toBe('Sin categoría');
    expect(listCategories(e, 'expense').some((c) => c.parentId === food && c.name === 'Panadería')).toBe(true);
  });
});

describe('salary module', () => {
  it('estimates vs received: never auto-marks future pay as received', async () => {
    const { e, actor } = await freshEngine();
    const acc = createAccount(e, actor, { name: 'Banco', type: 'savings', currency: 'PAB', initialBalance: 0 });
    const ref = today();
    const src = createIncomeSource(e, actor, { name: 'Empresa Ejemplo', currency: 'PAB', accountId: acc.id, startDate: addDays(ref, -40), config: { frequency: 'semimonthly', amount1: 150000, sameAmount: true, payDay1: 15, payDay2: 30 } });
    const s1 = incomeSummary(e, src, ref);
    expect(s1.estimate.monthlyGross).toBe(300000);
    expect(s1.estimate.annualGross).toBe(3600000);
    expect(s1.receivedYear).toBe(0);
    expect(getAccount(e, acc.id)!.balance).toBe(0);
    expect(s1.next!.date >= ref).toBe(true);
    // future occurrence cannot be marked received
    expect(() => markPaymentReceived(e, actor, src, s1.next!, { date: addDays(ref, 5) })).toThrow(/futura/);
    if (s1.pending.length) {
      markPaymentReceived(e, actor, src, s1.pending[0]);
      const s2 = incomeSummary(e, src, ref);
      expect(s2.pending.length).toBe(s1.pending.length - 1);
      expect(getAccount(e, acc.id)!.balance).toBe(150000);
      expect(() => markPaymentReceived(e, actor, src, s1.pending[0])).toThrow(); // unique period
    }
  });
});

describe('budgets, goals, debts, recurring', () => {
  it('budget alerts at thresholds', async () => {
    const { e, actor, owner } = await freshEngine();
    const acc = createAccount(e, actor, { name: 'Banco', type: 'savings', currency: 'PAB', initialBalance: 0 });
    const food = categoryIdByName(e, 'Alimentación', 'expense')!;
    upsertBudget(e, actor, { categoryId: food, amount: 10000, scope: 'personal' });
    createTransaction(e, actor, { type: 'expense', description: 'Super', amount: 9200, currency: 'PAB', date: today(), accountId: acc.id, categoryId: food });
    const sf = { scope: 'personal' as const, memberId: owner.id };
    const [b] = listBudgets(e, sf);
    expect(b.status.level).toBe('warning');
    expect(alerts(e, sf).some((a) => a.kind === 'budget' && a.level === 'warning')).toBe(true);
  });

  it('goal completion', async () => {
    const { e, actor, owner } = await freshEngine();
    const g = createGoal(e, actor, { name: 'Fondo', kind: 'emergency', target: 100000, currency: 'PAB', scope: 'personal' });
    expect(contributeToGoal(e, actor, g.id, 60000)).toBe(false);
    expect(contributeToGoal(e, actor, g.id, 40000)).toBe(true);
    expect(getGoal(e, g.id)!.completedAt).not.toBeNull();
    expect(() => contributeToGoal(e, actor, g.id, -200000)).toThrow();
    void owner;
  });

  it('debt payments reduce balance with interest split', async () => {
    const { e, actor } = await freshEngine();
    const acc = createAccount(e, actor, { name: 'Banco', type: 'savings', currency: 'PAB', initialBalance: 2000000 });
    const d = createDebt(e, actor, { name: 'Auto', kind: 'auto', principal: 1000000, currency: 'PAB', annualRate: 12, termMonths: 12, startDate: '2026-01-01', paymentDay: 15, scope: 'personal' });
    payDebt(e, actor, d.id, { amount: 88849, date: '2026-01-15', accountId: acc.id });
    const after = getDebt(e, d.id)!;
    expect(after.status.paidInterest).toBe(10000);
    expect(after.status.balance).toBe(921151);
    expect(getAccount(e, acc.id)!.balance).toBe(2000000 - 88849);
  });

  it('recurring: pending until confirmed, auto-post only past dates', async () => {
    const { e, actor, owner } = await freshEngine();
    const acc = createAccount(e, actor, { name: 'Banco', type: 'savings', currency: 'PAB', initialBalance: 0 });
    const r = createRecurring(e, actor, { kind: 'expense', description: 'Netflix', amount: 1599, currency: 'PAB', accountId: acc.id, frequency: 'monthly', startDate: addDays(today(), -40), scope: 'personal', autoPost: true });
    const n = runAutoPost(e, actor);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(runAutoPost(e, actor)).toBe(0); // idempotent
    const future = recurringOccurrences(e, listRecurring(e), addDays(today(), 1), addDays(today(), 40));
    expect(future.every((o) => !o.posted)).toBe(true);
    expect(() => postRecurring(e, actor, r, future[0].date)).toThrow();
    expect(upcoming(e, { scope: 'personal', memberId: owner.id }, 40).some((u) => u.title === 'Netflix')).toBe(true);
  });
});

describe('family', () => {
  it('permissions are enforced in the data layer', async () => {
    const { e, actor } = await freshEngine();
    const kid = createMember(e, actor, { name: 'Sofía', role: 'member' });
    const viewer = createMember(e, actor, { name: 'Abuela', role: 'readonly' });
    const acc = createAccount(e, actor, { name: 'Hogar', type: 'checking', currency: 'PAB', initialBalance: 0 });
    const kidActor = { id: kid.id, role: kid.role };
    const own = createTransaction(e, kidActor, { type: 'expense', description: 'Útiles', amount: 1000, currency: 'PAB', date: '2026-11-01', accountId: acc.id });
    const adminTx = createTransaction(e, actor, { type: 'expense', description: 'Luz', amount: 5000, currency: 'PAB', date: '2026-11-01', accountId: acc.id });
    expect(() => updateTransaction(e, kidActor, adminTx.id, { amount: 1 })).toThrow(PermissionError);
    expect(() => updateTransaction(e, kidActor, own.id, { amount: 1200 })).not.toThrow();
    expect(() => createTransaction(e, { id: viewer.id, role: 'readonly' }, { type: 'expense', description: 'x', amount: 1, currency: 'PAB', date: '2026-11-01', accountId: acc.id })).toThrow(PermissionError);
    expect(() => upsertBudget(e, kidActor, { categoryId: categoryIdByName(e, 'Vivienda', 'expense')!, amount: 100, scope: 'family' })).toThrow(PermissionError);
    expect(() => createMember(e, kidActor, { name: 'X', role: 'admin' })).toThrow(PermissionError);
  });

  it('shared expenses, separation and who-owes-whom', async () => {
    const { e, actor, owner } = await freshEngine();
    const ana = createMember(e, actor, { name: 'Ana', role: 'adult' });
    const acc = createAccount(e, actor, { name: 'Hogar', type: 'checking', currency: 'PAB', initialBalance: 0 });
    createTransaction(e, actor, { type: 'expense', description: 'Alquiler', amount: 80000, currency: 'PAB', date: '2026-11-01', accountId: acc.id, scope: 'family', splits: [{ memberId: owner.id, amount: 40000 }, { memberId: ana.id, amount: 40000 }] });
    createTransaction(e, actor, { type: 'expense', description: 'Café personal', amount: 300, currency: 'PAB', date: '2026-11-01', accountId: acc.id, scope: 'personal' });
    const r = { from: '2026-11-01', to: '2026-11-30' };
    expect(totals(e, r, { scope: 'family', memberId: owner.id }).expense).toBe(80000);
    expect(totals(e, r, { scope: 'personal', memberId: owner.id }).expense).toBe(300);
    expect(totals(e, r, { scope: 'personal', memberId: ana.id }).expense).toBe(0);
    let fb = familyBalances(e);
    expect(fb.transfers).toEqual([{ fromId: ana.id, toId: owner.id, amount: 40000 }]);
    createSettlement(e, actor, { fromMemberId: ana.id, toMemberId: owner.id, amount: 40000, date: '2026-11-05' });
    fb = familyBalances(e);
    expect(fb.transfers).toEqual([]);
    expect(listActivity(e, { scope: 'family' }).length).toBeGreaterThan(0);
    expect(() => createTransaction(e, actor, { type: 'expense', description: 'x', amount: 100, currency: 'PAB', date: '2026-11-01', accountId: acc.id, scope: 'family', splits: [{ memberId: ana.id, amount: 50 }] })).toThrow(/sumar/);
    expect(monthlySeries(e, 3, { scope: 'family', memberId: owner.id }, '2026-11-15').at(-1)!.expense).toBe(80000);
  });
});
