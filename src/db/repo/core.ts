import { z } from 'zod';
import { Engine, nowISO, uid } from '../engine';
import { camel } from '../map';
import { assertCan, type Role } from '../../domain/permissions';
import { sha256Hex } from '../crypto';
import type { Activity, Actor, Member, Preferences, Profile, Scope } from '../types';
import { tr } from '../../lib/i18n';

// ---------------------------------------------------------------- settings
export function getSetting<T>(e: Engine, key: string, fallback: T): T {
  const r = e.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  if (!r) return fallback;
  try { return { ...((typeof fallback === 'object' && fallback) || {}), ...JSON.parse(r.value) } as T; } catch { return fallback; }
}
export function setSetting(e: Engine, key: string, value: unknown) {
  e.run('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, JSON.stringify(value)]);
}

export const DEFAULT_PROFILE: Profile = { name: '', mode: 'individual', primaryCurrency: 'PAB', onboarded: false };
export const DEFAULT_PREFS: Preferences = { theme: 'system', reducedMotion: 'system', autoLockMinutes: 5, showBothCurrencies: true };
export const getProfile = (e: Engine) => getSetting<Profile>(e, 'profile', DEFAULT_PROFILE);
export const getPrefs = (e: Engine) => getSetting<Preferences>(e, 'preferences', DEFAULT_PREFS);
export const setPrefs = (e: Engine, p: Partial<Preferences>) => setSetting(e, 'preferences', { ...getPrefs(e), ...p });
export const setProfile = (e: Engine, p: Partial<Profile>) => setSetting(e, 'profile', { ...getProfile(e), ...p });

// ---------------------------------------------------------------- activity
export function log(e: Engine, actor: Actor | null, action: string, entity: string, entityId: string | null, summary: string, scope: Scope = 'personal') {
  e.run('INSERT INTO activity_log(member_id, action, entity, entity_id, summary, scope, created_at) VALUES (?,?,?,?,?,?,?)', [actor?.id ?? null, action, entity, entityId, summary, scope, nowISO()]);
}
export function listActivity(e: Engine, opts: { scope?: Scope; memberId?: string; limit?: number } = {}): Activity[] {
  const where: string[] = [];
  const p: (string | number)[] = [];
  if (opts.scope === 'family') where.push("scope = 'family'");
  if (opts.scope === 'personal' && opts.memberId) { where.push("scope = 'personal' AND member_id = ?"); p.push(opts.memberId); }
  return e.all(`SELECT * FROM activity_log ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ${opts.limit ?? 50}`, p).map((r) => camel<Activity>(r));
}

// ---------------------------------------------------------------- members
const MEMBER_COLORS = ['#1F6B4F', '#C2643E', '#3C6E9E', '#8A5CA8', '#B88A2B', '#2F8A84', '#A84B6B'];
export const memberSchema = z.object({
  name: z.string().trim().min(1, tr('Escribe un nombre')).max(40),
  role: z.enum(['admin', 'adult', 'member', 'readonly']),
  color: z.string().optional(),
  emoji: z.string().max(4).nullable().optional(),
});

function mapMember(r: Record<string, unknown>): Member {
  const m = camel<Member & { pinHash?: string | null }>(r);
  const { pinHash, ...rest } = m;
  return { ...rest, hasPin: !!pinHash };
}
export function listMembers(e: Engine, includeInactive = false): Member[] {
  return e.all(`SELECT * FROM members ${includeInactive ? '' : 'WHERE active = 1'} ORDER BY is_owner DESC, created_at`).map(mapMember);
}
export function getMember(e: Engine, id: string): Member | undefined {
  const r = e.get('SELECT * FROM members WHERE id = ?', [id]);
  return r ? mapMember(r) : undefined;
}
export function createMember(e: Engine, actor: Actor | null, input: z.input<typeof memberSchema>, isOwner = false): Member {
  if (actor) assertCan(actor.role, 'member.manage');
  const v = memberSchema.parse(input);
  const id = uid();
  const count = Number(e.scalar('SELECT count(*) FROM members'));
  e.run('INSERT INTO members(id, name, color, emoji, role, is_owner, created_at) VALUES (?,?,?,?,?,?,?)', [id, v.name, v.color ?? MEMBER_COLORS[count % MEMBER_COLORS.length], v.emoji ?? null, isOwner ? 'admin' : v.role, isOwner ? 1 : 0, nowISO()]);
  log(e, actor, 'create', 'member', id, tr('Añadió a {name} al hogar', { name: v.name }), 'family');
  return getMember(e, id)!;
}
export function updateMember(e: Engine, actor: Actor, id: string, input: Partial<z.input<typeof memberSchema>>) {
  assertCan(actor.role, 'member.manage');
  const cur = getMember(e, id);
  if (!cur) throw new Error(tr('Integrante no encontrado'));
  const v = memberSchema.parse({ ...cur, ...input });
  const role: Role = cur.isOwner ? 'admin' : v.role;
  if (cur.role === 'admin' && role !== 'admin' && countAdmins(e) <= 1) throw new Error(tr('Debe existir al menos un administrador.'));
  e.run('UPDATE members SET name=?, role=?, color=?, emoji=? WHERE id=?', [v.name, role, v.color ?? cur.color, v.emoji ?? null, id]);
  log(e, actor, 'update', 'member', id, tr('Actualizó a {name}', { name: v.name }), 'family');
}
function countAdmins(e: Engine) { return Number(e.scalar("SELECT count(*) FROM members WHERE role='admin' AND active=1")); }
export function removeMember(e: Engine, actor: Actor, id: string) {
  assertCan(actor.role, 'member.manage');
  const m = getMember(e, id);
  if (!m) return;
  if (m.isOwner) throw new Error(tr('No puedes eliminar al titular del perfil.'));
  if (id === actor.id) throw new Error(tr('No puedes eliminarte a ti mismo.'));
  e.run('UPDATE members SET active = 0 WHERE id = ?', [id]);
  log(e, actor, 'delete', 'member', id, tr('Retiró a {name} del hogar', { name: m.name }), 'family');
}
export async function setMemberPin(e: Engine, actor: Actor, id: string, pin: string | null) {
  if (actor.id !== id) assertCan(actor.role, 'member.manage');
  if (pin !== null && !/^\d{4,6}$/.test(pin)) throw new Error(tr('El PIN debe tener de 4 a 6 dígitos.'));
  e.run('UPDATE members SET pin_hash = ? WHERE id = ?', [pin ? await sha256Hex(`monto:${id}:${pin}`) : null, id]);
}
export async function verifyMemberPin(e: Engine, id: string, pin: string): Promise<boolean> {
  const r = e.get<{ pin_hash: string | null }>('SELECT pin_hash FROM members WHERE id = ?', [id]);
  if (!r?.pin_hash) return true;
  return r.pin_hash === (await sha256Hex(`monto:${id}:${pin}`));
}

// ---------------------------------------------------------------- sessions
export function startSession(e: Engine, memberId: string): string {
  const id = uid();
  e.run('INSERT INTO sessions(id, member_id, started_at) VALUES (?,?,?)', [id, memberId, nowISO()]);
  return id;
}
export function endSession(e: Engine, id: string, reason: string) {
  e.run('UPDATE sessions SET ended_at = ?, reason = ? WHERE id = ? AND ended_at IS NULL', [nowISO(), reason, id]);
}
export function listSessions(e: Engine, limit = 20) {
  return e.all(`SELECT s.*, m.name AS member_name FROM sessions s LEFT JOIN members m ON m.id = s.member_id ORDER BY started_at DESC LIMIT ${limit}`).map((r) => camel<{ id: string; memberName: string; startedAt: string; endedAt: string | null; reason: string | null }>(r));
}

// ---------------------------------------------------------------- seed
export interface SeedCategory { name: string; icon: string; color: string; children?: string[] }
export const DEFAULT_INCOME: SeedCategory[] = [
  { name: tr('Salario'), icon: 'salary', color: '#1F6B4F' },
  { name: tr('Freelance'), icon: 'freelance', color: '#2F8A84' },
  { name: tr('Negocios'), icon: 'business', color: '#3C6E9E' },
  { name: tr('Inversiones'), icon: 'investment', color: '#8A5CA8' },
  { name: tr('Bonificaciones'), icon: 'bonus', color: '#B88A2B', children: [tr('Décimo tercer mes')] },
  { name: tr('Otros ingresos'), icon: 'other', color: '#6B7A72' },
];
export const DEFAULT_EXPENSE: SeedCategory[] = [
  { name: tr('Vivienda'), icon: 'home', color: '#1F6B4F', children: [tr('Alquiler'), tr('Hipoteca'), tr('Mantenimiento')] },
  { name: tr('Alimentación'), icon: 'food', color: '#C2643E', children: [tr('Supermercado'), tr('Restaurantes')] },
  { name: tr('Transporte'), icon: 'transport', color: '#3C6E9E', children: [tr('Combustible'), tr('Metro y bus'), tr('Peajes (Panapass)')] },
  { name: tr('Servicios básicos'), icon: 'utilities', color: '#B88A2B', children: [tr('Electricidad'), tr('Agua'), tr('Gas')] },
  { name: tr('Internet y telefonía'), icon: 'internet', color: '#2F8A84' },
  { name: tr('Salud'), icon: 'health', color: '#D0574B' },
  { name: tr('Educación'), icon: 'education', color: '#5A6FB0' },
  { name: tr('Entretenimiento'), icon: 'fun', color: '#8A5CA8' },
  { name: tr('Mascotas'), icon: 'pets', color: '#A8743F' },
  { name: tr('Préstamos'), icon: 'loan', color: '#7A5548' },
  { name: tr('Tarjetas de crédito'), icon: 'card', color: '#4F5D75' },
  { name: tr('Compras'), icon: 'shopping', color: '#A84B6B' },
  { name: tr('Otros gastos'), icon: 'other', color: '#6B7A72' },
];

export function seedCategories(e: Engine) {
  if (Number(e.scalar('SELECT count(*) FROM categories')) > 0) return;
  e.transaction(() => {
    const ins = (kind: 'income' | 'expense', list: SeedCategory[]) =>
      list.forEach((c, i) => {
        const id = uid();
        e.run('INSERT INTO categories(id, name, kind, icon, color, is_system, sort) VALUES (?,?,?,?,?,1,?)', [id, c.name, kind, c.icon, c.color, i]);
        c.children?.forEach((ch, j) => e.run('INSERT INTO categories(id, name, kind, parent_id, icon, color, is_system, sort) VALUES (?,?,?,?,?,?,1,?)', [uid(), ch, kind, id, c.icon, c.color, j]));
      });
    ins('income', DEFAULT_INCOME);
    ins('expense', DEFAULT_EXPENSE);
  });
}

/** `name` is the Spanish default; also matches its translation (categories are seeded in the UI language). */
export function categoryIdByName(e: Engine, name: string, kind: 'income' | 'expense'): string | null {
  return e.get<{ id: string }>('SELECT id FROM categories WHERE name IN (?, ?) AND kind = ? AND parent_id IS NULL', [tr(name), name, kind])?.id ?? null;
}
