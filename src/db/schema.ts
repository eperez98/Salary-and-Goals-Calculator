/**
 * Versioned migrations. Each entry runs once, inside a transaction, and bumps
 * PRAGMA user_version. Never edit a released migration — append a new one.
 */
export const MIGRATIONS: string[] = [
  /* v1 — initial schema */ `
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

  CREATE TABLE members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#1F6B4F',
    emoji TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin','adult','member','readonly')),
    is_owner INTEGER NOT NULL DEFAULT 0,
    pin_hash TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('savings','checking','cash','credit_card','debit_card','investment')),
    currency TEXT NOT NULL CHECK (currency IN ('PAB','USD')),
    initial_balance INTEGER NOT NULL DEFAULT 0,
    credit_limit INTEGER,
    institution TEXT,
    color TEXT NOT NULL DEFAULT '#1F6B4F',
    owner_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('income','expense')),
    parent_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    icon TEXT NOT NULL DEFAULT 'other',
    color TEXT NOT NULL DEFAULT '#6B7A72',
    is_system INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE income_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('PAB','USD')),
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    start_date TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE debts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('personal_loan','mortgage','auto','credit_card','personal_debt')),
    direction TEXT NOT NULL DEFAULT 'owe' CHECK (direction IN ('owe','owed')),
    principal INTEGER NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('PAB','USD')),
    annual_rate REAL NOT NULL DEFAULT 0,
    term_months INTEGER NOT NULL DEFAULT 12,
    start_date TEXT NOT NULL,
    payment_day INTEGER,
    lender TEXT,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal','family')),
    closed INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE recurring (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('income','expense')),
    description TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL CHECK (currency IN ('PAB','USD')),
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    payment_method TEXT,
    frequency TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    auto_post INTEGER NOT NULL DEFAULT 0,
    member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal','family')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('income','expense','transfer','card_payment','loan_disbursement','loan_payment','refund')),
    description TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL CHECK (currency IN ('PAB','USD')),
    date TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
    to_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    payment_method TEXT,
    notes TEXT,
    member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal','family')),
    debt_id TEXT REFERENCES debts(id) ON DELETE SET NULL,
    income_source_id TEXT REFERENCES income_sources(id) ON DELETE SET NULL,
    period_key TEXT,
    recurring_id TEXT REFERENCES recurring(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX ix_tx_date ON transactions(date);
  CREATE INDEX ix_tx_account ON transactions(account_id);
  CREATE INDEX ix_tx_category ON transactions(category_id);
  CREATE UNIQUE INDEX ux_tx_income_period ON transactions(income_source_id, period_key) WHERE income_source_id IS NOT NULL AND period_key IS NOT NULL;
  CREATE UNIQUE INDEX ux_tx_recurring_date ON transactions(recurring_id, date) WHERE recurring_id IS NOT NULL;

  CREATE TABLE transaction_splits (
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    PRIMARY KEY (transaction_id, member_id)
  );

  CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE settlements (
    id TEXT PRIMARY KEY,
    from_member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    to_member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'PAB',
    date TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE budgets (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal','family')),
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX ux_budget ON budgets(category_id, scope, IFNULL(member_id, ''));

  CREATE TABLE goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('emergency','vehicle','home','vacation','education','other')),
    target INTEGER NOT NULL CHECK (target > 0),
    currency TEXT NOT NULL CHECK (currency IN ('PAB','USD')),
    target_date TEXT,
    color TEXT NOT NULL DEFAULT '#1F6B4F',
    scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal','family')),
    member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE goal_contributions (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    date TEXT NOT NULL,
    member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    amount INTEGER,
    currency TEXT,
    notes TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    summary TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'personal',
    created_at TEXT NOT NULL
  );

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    reason TEXT
  );

  CREATE TABLE dismissed_alerts (key TEXT PRIMARY KEY, created_at TEXT NOT NULL);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;
