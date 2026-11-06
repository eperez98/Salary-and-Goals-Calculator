import type { Currency } from '../lib/money';
import type { Role } from '../domain/permissions';
import type { IncomeConfig } from '../domain/salary';
import type { RecurFrequency } from '../domain/recurrence';

export type Scope = 'personal' | 'family';
export type ProfileMode = 'individual' | 'couple' | 'family';

export interface Member { id: string; name: string; color: string; emoji: string | null; role: Role; isOwner: boolean; hasPin: boolean; active: boolean; createdAt: string }

export type AccountType = 'savings' | 'checking' | 'cash' | 'credit_card' | 'debit_card' | 'investment';
export interface Account {
  id: string; name: string; type: AccountType; currency: Currency; initialBalance: number; creditLimit: number | null;
  institution: string | null; color: string; ownerMemberId: string | null; archived: boolean; createdAt: string;
  balance: number;
}

export interface Category { id: string; name: string; kind: 'income' | 'expense'; parentId: string | null; icon: string; color: string; isSystem: boolean; archived: boolean; sort: number }

export type TxType = 'income' | 'expense' | 'transfer' | 'card_payment' | 'loan_disbursement' | 'loan_payment' | 'refund';
export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'transfer' | 'ach' | 'yappy' | 'check' | 'other';

export interface Transaction {
  id: string; type: TxType; description: string; amount: number; currency: Currency; date: string;
  categoryId: string | null; accountId: string | null; toAccountId: string | null; paymentMethod: PaymentMethod | null;
  notes: string | null; memberId: string | null; scope: Scope; debtId: string | null; incomeSourceId: string | null;
  periodKey: string | null; recurringId: string | null; createdAt: string; updatedAt: string;
  attachmentCount?: number; splits?: Array<{ memberId: string; amount: number }>;
}

export interface Attachment { id: string; transactionId: string; name: string; mime: string; size: number; createdAt: string }

export interface IncomeSource { id: string; name: string; config: IncomeConfig; currency: Currency; accountId: string | null; categoryId: string | null; memberId: string | null; startDate: string; active: boolean; createdAt: string }

export type DebtKind = 'personal_loan' | 'mortgage' | 'auto' | 'credit_card' | 'personal_debt';
export interface Debt {
  id: string; name: string; kind: DebtKind; direction: 'owe' | 'owed'; principal: number; currency: Currency; annualRate: number;
  termMonths: number; startDate: string; paymentDay: number | null; lender: string | null; accountId: string | null;
  memberId: string | null; scope: Scope; closed: boolean; notes: string | null; createdAt: string;
}

export interface Recurring {
  id: string; kind: 'income' | 'expense'; description: string; amount: number; currency: Currency; categoryId: string | null;
  accountId: string | null; paymentMethod: PaymentMethod | null; frequency: RecurFrequency; startDate: string; endDate: string | null;
  autoPost: boolean; memberId: string | null; scope: Scope; active: boolean; createdAt: string;
}

export interface Budget { id: string; categoryId: string; amount: number; scope: Scope; memberId: string | null; createdAt: string }

export type GoalKind = 'emergency' | 'vehicle' | 'home' | 'vacation' | 'education' | 'other';
export interface Goal { id: string; name: string; kind: GoalKind; target: number; currency: Currency; targetDate: string | null; color: string; scope: Scope; memberId: string | null; completedAt: string | null; createdAt: string; saved: number }
export interface Contribution { id: string; goalId: string; amount: number; date: string; memberId: string | null; note: string | null; createdAt: string }

export interface Reminder { id: string; title: string; date: string; amount: number | null; currency: Currency | null; notes: string | null; done: boolean; memberId: string | null; createdAt: string }
export interface Settlement { id: string; fromMemberId: string; toMemberId: string; amount: number; currency: Currency; date: string; note: string | null; createdAt: string }
export interface Activity { id: number; memberId: string | null; action: string; entity: string; entityId: string | null; summary: string; scope: Scope; createdAt: string }

export interface Profile { name: string; mode: ProfileMode; primaryCurrency: Currency; onboarded: boolean; householdName?: string }
export interface Preferences { theme: 'system' | 'light' | 'dark'; reducedMotion: 'system' | 'on' | 'off'; autoLockMinutes: number; showBothCurrencies: boolean; recentAutoBackup?: string; autoCheckUpdates?: boolean; betaUpdates?: boolean }

export interface Actor { id: string; role: Role }
export interface ScopeFilter { scope: Scope; memberId: string }
