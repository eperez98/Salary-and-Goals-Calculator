<div align="center">

<img src="assets/icon.ico" alt="Salary & Goals Calculator" width="96" height="96">

# Salary & Goals Calculator
### Calculadora de Salario & Metas

**by [Erick Perez](https://github.com/eperez98) — Panama 🇵🇦**

<p>
  <img src="https://img.shields.io/badge/version-v2.0_Modern-0067c0?style=for-the-badge&logo=python&logoColor=white" alt="Version">
  <img src="https://img.shields.io/badge/released-March_29,_2026-0067c0?style=for-the-badge" alt="Released">
  <img src="https://img.shields.io/badge/python-3.10%2B-FFD43B?style=for-the-badge&logo=python&logoColor=black" alt="Python">
  <img src="https://img.shields.io/badge/license-GPL--3.0-22c55e?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/platform-Windows_%7C_macOS_%7C_Linux-blueviolet?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/countries-6-brightgreen?style=for-the-badge" alt="Countries">
  <img src="https://img.shields.io/badge/UI-customtkinter-60cdff?style=for-the-badge" alt="UI">
</p>

<p>
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-whats-new-in-v20">What's New</a> •
  <a href="#-countries">Countries</a> •
  <a href="#-build-exe">Build .exe</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

---

*A bilingual desktop app that calculates your real take-home pay, breaks down monthly expenses visually, and tells you exactly how long it will take to reach your savings goal — with a fully modernized Windows 11 Fluent Design interface built on `customtkinter`.*

</div>

---

## 🚀 Quick Start

```bash
pip install customtkinter pillow reportlab
python SalaryGoals_Modern.py
```

> **No Python?** Download the pre-built `.exe` from [Releases](https://github.com/eperez98/Calculadora-de-Salario-Calculadora-de-metas/releases).

---

## 🆕 What's New in v2.0

> **Released March 29, 2026** — Complete UI rewrite on `customtkinter`. All calculator logic 100% preserved.

### Why v1.1.1 was cancelled — and why v2.0 exists

After v1.1 shipped, two bugs were found immediately:

1. **Launch crash** — `AttributeError: 'CalcApp' has no attribute '_step_resultado'` on every launch
2. **Popup not centered** — Language selector appeared at wrong position on Windows Python 3.14

A v1.1.1 hotfix was started. The fixes were developed and validated. But rather than ship another patch on top of the aging plain-`tkinter` architecture, the decision was made to **cancel v1.1.1** and fold both fixes into a ground-up rewrite as **v2.0 Modern Edition** using `customtkinter`. The bugs are fully resolved in v2.0.

> See [`CHANGELOG.html`](CHANGELOG.html) for the complete version history and full cancellation details.

### Before vs After

| Area | v1.1 tkinter | v2.0 customtkinter |
|------|-------------|-------------------|
| **UI framework** | Plain `tkinter` | `customtkinter ≥ 5.2` — native rounded corners |
| **Design tokens** | Flat `THEME_LIGHT/DARK` dicts | `DesignTokens` frozen dataclass (38 typed tokens) |
| **Theme system** | Global dict rebuild | `ThemeManager` singleton + `subscribe()` |
| **Theme/lang persistence** | Lost on restart | Saved to `~/.sgc_prefs.json` |
| **Sidebar** | 56px icon-only | 210px — logo, nav items, 3px accent bar |
| **Input fields** | `tk.Entry` | `ModernEntry` — animated focus border |
| **Buttons** | `tk.Button` | `AccentButton` — 4 variants, theme-aware |
| **Status bar** | None | 30px bar with live HH:MM:SS clock |
| **Extra bug fixed** | — | Silent dual-root crash on `CalcApp(ctk.CTk)` |

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

**🧭 Navigation**
- 210px Win11 sidebar with logo, 8 steps, footer card
- 3px left accent bar on the active step
- Horizontal pip breadcrumb with live step colors
- Click any visited step to jump back

**📊 Results & Visuals**
- Circular savings % progress ring
- Expense breakdown horizontal bar chart
- Savings projection line chart with goal line
- Hover detail popups on every result row
- Color-coded status banner: on track / partial / deficit

**🎨 Interface**
- `customtkinter` native rounded corners throughout
- Live Dark / Light mode toggle (no restart)
- Theme + language saved to disk automatically
- Real-time HH:MM:SS clock in status bar

</td>
<td width="50%" valign="top">

**💼 Financial Tools**
- Real-time tax breakdown as you type
- Pay stub override (enter your actual net pay)
- 7 expense categories + 3 custom extras
- Goal analysis: months remaining, projection
- PDF export — bilingual, formatted report

**💾 Sessions**
- Save and load named sessions (local JSON)
- Data never leaves your machine

**🌐 Bilingual**
- Full EN / ES throughout
- Language choice saved between sessions
- PDF follows the active language

</td>
</tr>
</table>

---

## 🌍 Countries

| Flag | Country | Currency | Key Deductions |
|------|---------|----------|---------------|
| 🇵🇦 | Panama | USD | CSS 9.75% + Edu 1.25% + ISR progressive |
| 🇨🇴 | Colombia | COP | Pensión 4% + Salud 4% + Retención (UVT 2024) |
| 🇲🇽 | Mexico | MXN | IMSS ~6.5% + ISR 2024 (10 brackets) |
| 🇺🇸 | USA | USD | SS 6.2% + Medicare 1.45% + Federal Tax 2024 |
| 🇨🇷 | Costa Rica | CRC ₡ | CCSS 10.34% + ISR 2024 (exento ≤ ₡929k/mo) |
| 🇵🇪 | Peru | PEN S/ | ONP 13% + Renta 2024 (7 UIT deduction) |

---

## 📋 The 8 Steps

| # | Step | What you fill in |
|---|------|-----------------|
| 1 | Profile | Name + country |
| 2 | Goal | Savings target + deadline month/year |
| 3 | Income | Gross salary → real-time tax preview |
| 4 | Home | Rent, internet, electricity, water, mobile |
| 5 | Debts | Loans, car expenses, pet costs |
| 6 | Leisure | Grocery, outings, streaming subscriptions |
| 7 | Extras | 3 fully custom expense fields |
| 8 | Results | Charts + breakdown + goal projection + PDF |

---

## 🖥️ Requirements

```bash
pip install customtkinter pillow reportlab
```

| Package | Purpose | Version |
|---------|---------|---------|
| Python | Runtime | 3.10 – 3.14 ✅ |
| `customtkinter` | Modern rounded widgets | ≥ 5.2 |
| `pillow` | PIL icon rendering | ≥ 10.0 |
| `reportlab` | PDF export | ≥ 4.0 |
| `tkinter` | Canvas + dialogs | Bundled |

---

## 📦 Build .exe

**One-click:** run `build.bat` — handles PyInstaller + Inno Setup automatically.

**Manual:**
```bat
pip install pyinstaller

pyinstaller --onefile --windowed ^
  --name "SalaryGoalsCalculator" ^
  --icon "assets\icon.ico" ^
  --add-data "assets;assets" ^
  --collect-all customtkinter ^
  --collect-all reportlab ^
  --collect-all PIL ^
  SalaryGoals_Modern.py
```

Output → `dist\SalaryGoalsCalculator.exe`
Installer → `Output\SalaryGoalsCalculator_v2.0_Setup.exe`

---

## 💾 Data Files

| File | Path |
|------|------|
| Sessions | `~/.salary_calc_sessions.json` |
| Theme + language preference | `~/.sgc_prefs.json` |

---

## 📁 Project Structure

```
SalaryGoalsCalculator/
│
├── SalaryGoals_Modern.py    ← Main app v2.0 (2,593 lines)
├── Calculadora_Ahorro.py    ← Legacy v1.1 — kept for reference
├── assets/
│   └── icon.ico             ← App icon (256/128/64/48/32/16px)
├── build.bat                ← One-click build script
├── installer.iss            ← Inno Setup 6 script
├── requirements.txt         ← pip dependencies
├── README.md                ← This file
└── CHANGELOG.html           ← Full version history (open in browser)
```

---

## 🗺️ Roadmap

| Version | Status | Target | Highlights |
|---------|--------|--------|-----------|
| v0.1 Beta | ✅ Done | 2024 | Panama only, initial release |
| v0.2 Beta | ✅ Done | 2024 | Colombia, dark mode, sessions |
| ~~v0.3 Beta~~ | ⊘ Cancelled | — | Python 3.14 crashes → merged into v1.0 RC |
| v1.0 RC | ✅ Done | Mar 15 2026 | Full Fluent UI (tkinter), Mexico |
| v1.1 | ✅ Done | Mar 24 2026 | USA, Costa Rica, Peru, charts, hover |
| ~~v1.1.1~~ | ⊘ Cancelled | — | Hotfix abandoned → bugs fixed in v2.0 |
| **v2.0** | ✅ **Current** | Mar 29 2026 | customtkinter rewrite, DesignTokens, dual-root fix |
| v2.1 | 🔜 Planned | Q2 2026 | Animated counters, pie chart, accent picker |
| v2.2 | 🔜 Planned | Q3 2026 | Argentina, Chile, Spain, Excel export |
| v3.0 | 🔜 Long-term | 2027 | Android APK, web version, cloud sync |

---

## ⚠️ Disclaimer

All tax calculations are **estimates** based on publicly available official 2024–2026 rates. For informational purposes only — verify with your pay stub or a certified accountant.

---

## 📜 License

**GNU General Public License v3.0** — Copyright (c) 2026 Erick Perez

---

<div align="center">

Made with ❤️ in Panama 🇵🇦 by **[Erick Perez](https://github.com/eperez98)**

*"Un ahorro mensual constante tiene un gran impacto a largo plazo."*

⭐ **Star the repo if this helped you!**

</div>
