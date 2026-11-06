/**
 * Shared expenses between family members: who owes whom.
 * Each shared expense has a payer and a set of shares. Settlements reduce debts.
 */
export interface SharedExpense { payerId: string; shares: Array<{ memberId: string; amount: number }> }
export interface Settlement { fromId: string; toId: string; amount: number }
export interface Transfer { fromId: string; toId: string; amount: number }

/** Net balance per member: positive = others owe them, negative = they owe. */
export function netBalances(expenses: SharedExpense[], settlements: Settlement[] = []): Map<string, number> {
  const net = new Map<string, number>();
  const add = (id: string, v: number) => net.set(id, (net.get(id) ?? 0) + v);
  for (const e of expenses) {
    for (const s of e.shares) {
      if (s.memberId === e.payerId) continue;
      add(e.payerId, s.amount);
      add(s.memberId, -s.amount);
    }
  }
  for (const s of settlements) {
    add(s.fromId, s.amount);
    add(s.toId, -s.amount);
  }
  return net;
}

/** Minimal set of transfers to settle everybody (greedy). */
export function simplifyDebts(net: Map<string, number>): Transfer[] {
  const debtors = [...net].filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v);
  const creditors = [...net].filter(([, v]) => v > 0).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
  const out: Transfer[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].v, creditors[j].v);
    if (amt > 0) out.push({ fromId: debtors[i].id, toId: creditors[j].id, amount: amt });
    debtors[i].v -= amt;
    creditors[j].v -= amt;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}

/** Split an amount equally in cents; remainder cents go to the first members. */
export function splitEqually(amount: number, memberIds: string[]): Array<{ memberId: string; amount: number }> {
  if (!memberIds.length) return [];
  const base = Math.floor(amount / memberIds.length);
  let rem = amount - base * memberIds.length;
  return memberIds.map((memberId) => ({ memberId, amount: base + (rem-- > 0 ? 1 : 0) }));
}
