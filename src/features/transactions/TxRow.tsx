import { motion } from 'motion/react';
import clsx from 'clsx';
import { IconTile, Icon } from '../../icons';
import { Money, Badge, useMotionOK } from '../../components/ui';
import { TX_TYPE_LABEL } from '../../db/repo/finance';
import { formatDate } from '../../lib/dates';
import type { Account, Category, Member, Transaction } from '../../db/types';
import { tr } from '../../lib/i18n';

const TYPE_ICON: Record<string, string> = { income: 'income', expense: 'expense', transfer: 'transfer', card_payment: 'card', loan_disbursement: 'bank', loan_payment: 'loan', refund: 'refresh' };

export function TxRow({ tx, categories, accounts, members, index = 0, onClick, showDate = true }: { tx: Transaction; categories: Category[]; accounts: Account[]; members?: Member[]; index?: number; onClick?: () => void; showDate?: boolean }) {
  const ok = useMotionOK();
  const cat = categories.find((c) => c.id === tx.categoryId);
  const parent = cat?.parentId ? categories.find((c) => c.id === cat.parentId) : null;
  const acc = accounts.find((a) => a.id === tx.accountId);
  const to = accounts.find((a) => a.id === tx.toAccountId);
  const member = members?.find((m) => m.id === tx.memberId);
  const positive = tx.type === 'income' || tx.type === 'refund' || tx.type === 'loan_disbursement';
  const neutral = tx.type === 'transfer' || tx.type === 'card_payment';
  const icon = cat?.icon ?? parent?.icon ?? TYPE_ICON[tx.type];
  const color = cat?.color ?? (positive ? 'var(--emerald)' : neutral ? 'var(--blue)' : 'var(--coral)');
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={ok ? { opacity: 0, x: -8 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.3 }}
      className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-left hover:bg-surface-2 transition-colors"
    >
      <IconTile name={icon} color={color} size={38} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-ink truncate">{tx.description}</p>
        <p className="text-[11.5px] text-muted truncate">
          {showDate && `${formatDate(tx.date, 'day')} · `}
          {neutral ? `${acc?.name ?? '—'} → ${to?.name ?? '—'}` : `${parent ? parent.name + ' › ' : ''}${cat?.name ?? TX_TYPE_LABEL[tx.type]} · ${acc?.name ?? ''}`}
          {member && ` · ${member.name}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {tx.scope === 'family' && <Badge tone="blue" className="!h-5 !px-2"><Icon name="family" size={11} />{tr('Hogar')}</Badge>}
        {!!tx.attachmentCount && <Icon name="clip" size={14} className="text-muted" />}
        {tx.periodKey && <Badge tone="green" className="!h-5 !px-2">{tr('Recibido')}</Badge>}
        <Money cents={positive ? tx.amount : neutral ? tx.amount : -tx.amount} currency={tx.currency} sign={positive} className={clsx('text-[13.5px] font-semibold', positive ? 'text-emerald' : neutral ? 'text-ink-2' : 'text-ink')} />
      </div>
    </motion.button>
  );
}
