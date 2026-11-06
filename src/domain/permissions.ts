
import { tr } from '../lib/i18n';/** Family roles and permissions. Enforced both in the UI and in the data layer. */
export type Role = 'admin' | 'adult' | 'member' | 'readonly';

export const ROLE_LABEL: Record<Role, string> = {
  admin: tr('Administrador'),
  adult: tr('Adulto'),
  member: tr('Miembro'),
  readonly: tr('Solo lectura'),
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: tr('Control total: integrantes, seguridad, copias de seguridad y todos los datos.'),
  adult: tr('Gestiona movimientos, cuentas, presupuestos, objetivos y deudas del hogar.'),
  member: tr('Registra y edita sus propios movimientos y aporta a objetivos.'),
  readonly: tr('Puede consultar la información, sin realizar cambios.'),
};

export type Action =
  | 'view'
  | 'tx.create'
  | 'tx.editOwn'
  | 'tx.editAny'
  | 'account.manage'
  | 'budget.manage'
  | 'goal.manage'
  | 'goal.contribute'
  | 'debt.manage'
  | 'income.manage'
  | 'category.manage'
  | 'member.manage'
  | 'security.manage'
  | 'backup.manage'
  | 'report.export';

const MATRIX: Record<Role, Action[]> = {
  admin: ['view', 'tx.create', 'tx.editOwn', 'tx.editAny', 'account.manage', 'budget.manage', 'goal.manage', 'goal.contribute', 'debt.manage', 'income.manage', 'category.manage', 'member.manage', 'security.manage', 'backup.manage', 'report.export'],
  adult: ['view', 'tx.create', 'tx.editOwn', 'tx.editAny', 'account.manage', 'budget.manage', 'goal.manage', 'goal.contribute', 'debt.manage', 'income.manage', 'category.manage', 'report.export'],
  member: ['view', 'tx.create', 'tx.editOwn', 'goal.contribute', 'income.manage'],
  readonly: ['view'],
};

export function can(role: Role | undefined, action: Action): boolean {
  if (!role) return false;
  return MATRIX[role].includes(action);
}

/** Can `actor` edit/delete a transaction owned by `ownerId`? */
export function canEditTransaction(role: Role, actorId: string, ownerId: string | null): boolean {
  if (can(role, 'tx.editAny')) return true;
  return can(role, 'tx.editOwn') && ownerId === actorId;
}

export class PermissionError extends Error {
  constructor(action: string) {
    super(tr('No tienes permiso para realizar esta acción ({action}).', { action }));
    this.name = 'PermissionError';
  }
}

export function assertCan(role: Role | undefined, action: Action): void {
  if (!can(role, action)) throw new PermissionError(action);
}

export const ALL_ROLES: Role[] = ['admin', 'adult', 'member', 'readonly'];
export const ROLE_MATRIX = MATRIX;
