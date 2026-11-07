<div align="center">

**English** · [Español](README.es.md)

<img src="assets/brand/readme-hero-en.png" alt="Monto: personal and family finances for Panama" width="100%" />

<br />

[![Download for Windows](https://img.shields.io/badge/Download%20for%20Windows-0.5.4%20Beta%207-E8930F?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/eperez98/monto/releases)

[![CI](https://github.com/eperez98/monto/actions/workflows/ci.yml/badge.svg)](https://github.com/eperez98/monto/actions/workflows/ci.yml)
![Windows 10 | 11](https://img.shields.io/badge/Windows-10%20%7C%2011-14304D)
![Offline](https://img.shields.io/badge/works-offline-14304D)
![English | Español](https://img.shields.io/badge/English%20%7C%20Espa%C3%B1ol-14304D)
![MIT](https://img.shields.io/badge/license-MIT-14304D)

**Income, paydays, expenses, budgets, savings and debts — in balboas and dollars, for you or your whole household.**<br />
No cloud, no account: your data stays on your computer.

[Features](#features) · [Screenshots](#screenshots) · [Download](#download) · [License](#license)

</div>

---

## Why Monto

<table>
<tr>
<td width="33%" valign="top">

### 🇵🇦 Made for Panama
Balboa (`B/.`) and dollar at 1:1 parity, **semi‑monthly paydays**, CSS and Seguro Educativo, 13th‑month pay, Yappy, ACH and Panapass.

</td>
<td width="33%" valign="top">

### 👨‍👩‍👧 For the whole household
Individual, couple or family profiles with roles, shared expenses, who‑owes‑whom and a **Personal / Household** view.

</td>
<td width="33%" valign="top">

### 🔒 Private by design
100 % local SQLite database, optional **AES‑256** encryption, auto‑lock and daily backups. Nothing leaves your PC.

</td>
</tr>
</table>

## Screenshots

<div align="center">
<img src="assets/screenshots/en/dashboard.png" alt="Dashboard" width="100%" />
<sub><b>Overview</b> — available balance, income vs. expenses, spending breakdown, next payday and alerts.</sub>
</div>

<br />

| | |
|:---:|:---:|
| <img src="assets/screenshots/en/plan.png" alt="Monthly plan" /><br /><sub><b>Monthly plan</b> — your expenses one by one, what's left and how much you can save</sub> | <img src="assets/screenshots/en/income.png" alt="Income" /><br /><sub><b>Income & salary</b> — estimated vs. actually received, pay calendar</sub> |
| <img src="assets/screenshots/en/transactions.png" alt="Transactions" /><br /><sub><b>Transactions</b> — search, filters, receipts, CSV import/export</sub> | <img src="assets/screenshots/en/accounts.png" alt="Accounts" /><br /><sub><b>Accounts & cards</b> — balances by currency and card usage</sub> |
| <img src="assets/screenshots/en/budgets.png" alt="Budgets" /><br /><sub><b>Budgets</b> — monthly limits with 70 / 90 / 100 % alerts</sub> | <img src="assets/screenshots/en/goals.png" alt="Goals" /><br /><sub><b>Savings goals</b> — progress, pace and contributions</sub> |
| <img src="assets/screenshots/en/debts.png" alt="Loans and debts" /><br /><sub><b>Loans & debts</b> — installments, interest and amortization</sub> | <img src="assets/screenshots/en/family.png" alt="Family" /><br /><sub><b>Family</b> — shared expenses, roles and permissions</sub> |
| <img src="assets/screenshots/en/calendar.png" alt="Calendar" /><br /><sub><b>Calendar</b> — paydays, installments, bills and reminders</sub> | <img src="assets/screenshots/en/reports.png" alt="Reports" /><br /><sub><b>Reports</b> — minimal tables for Excel, PDF and Notion</sub> |

<details>
<summary><b>🌙 Dark mode, guided setup and insights</b></summary>
<br />

| | |
|:---:|:---:|
| <img src="assets/screenshots/en/dashboard-dark.png" alt="Dark mode" /><br /><sub>Light and dark mode with one click</sub> | <img src="assets/screenshots/en/plan-dark.png" alt="Monthly plan in dark mode" /><br /><sub>Monthly plan in dark mode</sub> |
| <img src="assets/screenshots/en/onboarding-salary.png" alt="Guided setup: salary" /><br /><sub>Guided setup: take‑home pay with live monthly and annual totals</sub> | <img src="assets/screenshots/en/onboarding-expenses.png" alt="Guided setup: expenses" /><br /><sub>Guided setup: monthly expenses and savings potential</sub> |
| <img src="assets/screenshots/en/insights.png" alt="Insights" /><br /><sub>Insights based only on your own data</sub> | <img src="assets/screenshots/en/onboarding-welcome.png" alt="Welcome" /><br /><sub>Welcome screen with language and theme switch</sub> |

</details>

<sub>Screenshots use fictional demo data. Regenerate them with `node scripts/screenshots.mjs`.</sub>

## Features

<details open>
<summary><b>Income and salary</b></summary>

- Weekly, biweekly, **semi‑monthly** (first and second payday can differ), monthly, hourly, variable/freelance.
- Pay per payday, monthly, annual and real average, next pay date and total received this year.
- Optional statutory deductions (**CSS 9.75 %**, **Seguro Educativo 1.25 %**) and estimated **13th‑month pay** (April, August, December).
- **Estimated ≠ received:** a payment only counts once you confirm it, never with a future date.
</details>

<details>
<summary><b>Monthly plan</b></summary>

- Monto asks for your monthly expenses **one at a time** (housing, utilities, internet, food, transport, loans, cards, health, education, entertainment…) and lets you add your own.
- It subtracts them from your net monthly income and shows the **money left over**, whether you **can save** and **how much**.
- Available to every member in individual, couple and family modes.
</details>

<details>
<summary><b>Everyday money</b></summary>

- Income, expenses, transfers, card payments, loans, refunds — with category, account, payment method (ACH, **Yappy**, cash, cards), notes, member and **attached receipts**.
- Search, filters, CSV import and export. Savings, checking, cash, credit/debit cards and investments in PAB or USD.
- Custom categories and subcategories.
</details>

<details>
<summary><b>Planning</b></summary>

- **Budgets** per category with alerts at 70, 90 and 100 %.
- **Savings goals** with progress rings and a celebration when you reach them.
- **Loans and debts** with installment, interest, outstanding balance and **amortization schedule**.
- **Financial calendar** with paydays, installments, recurring payments and reminders.
</details>

<details>
<summary><b>Family</b></summary>

- Members with avatars and roles (**Admin, Adult, Member, Read‑only**) enforced in the data layer too.
- **Personal / Household** view, shared expenses split between members, debts between members with settlements, household history.
</details>

<details>
<summary><b>Reports, insights and privacy</b></summary>

- Income, expenses, cash flow, savings, debts, by category, monthly trend and year‑over‑year.
- **Export clean, minimal tables** to **Excel** (sortable, filterable), **PDF**, **Notion** (Markdown tables) and CSV — one report or *All data* at once.
- Duplicate detection, budget alerts, payment reminders, spending habits and savings projections — always labeled as estimates.
- Optional password with **AES‑256‑GCM** encryption, auto‑lock (`Ctrl + L`), per‑member PIN, session log, daily and manual backups, integrity check.
- **Updates:** at startup Monto tells you when a new version is out and asks whether to download it. Nothing installs without your OK; the installer is verified with SHA‑256 and your data is backed up first.
</details>

## Download

1. Go to **[Releases](https://github.com/eperez98/monto/releases)** and download `Monto_x.y.z_x64.zip`.
2. Unzip it and run `Monto_x.y.z_x64-setup.exe`. Choose **English** or **Español**. No administrator rights needed.
3. Windows SmartScreen may warn you because the installer isn't code‑signed yet: **More info → Run anyway**.

The zip also includes `SHA256SUMS.txt` (to verify the installer) and `LEEME.txt`. Updating keeps your data in `%APPDATA%\com.monto.finanzas`. See the [installation guide](docs/instalacion.md).

**Requirements:** Windows 10 (1803+) or 11, 64‑bit. WebView2 ships with Windows 11; the installer adds it if missing.

## Tech stack

| Layer | Technology |
|---|---|
| Desktop | [Tauri 2](https://tauri.app) (Rust + WebView2), NSIS installer |
| UI | React 18, TypeScript (strict), Vite 7, Tailwind CSS 4, Motion, Recharts |
| Data | SQLite via sql.js (WebAssembly), Zod validation, Zustand state |
| Export | ExcelJS, jsPDF + AutoTable |
| i18n | Own lightweight system — Spanish source strings, English dictionary |
| Quality | Vitest, Playwright E2E, ESLint, GitHub Actions (build + install test on Windows) |

More in [docs/arquitectura.md](docs/arquitectura.md) and the [architecture decisions](docs/decisiones/).


## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Changes are tracked in [CHANGELOG.md](CHANGELOG.md) using [Semantic Versioning](https://semver.org/).

## License

**MIT** — see [LICENSE](LICENSE). © 2026 Erick Arturo Pérez Cazorla.

<div align="center"><br /><sub>Monto · Made in Panama 🇵🇦</sub></div>
