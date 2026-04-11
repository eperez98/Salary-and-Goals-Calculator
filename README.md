<div align="center">

<img src="assets/icon.ico" alt="Salary & Goals Calculator" width="96" height="96">

# Salary & Goals Calculator
### Calculadora de Salario & Metas

**by [Erick Perez](https://github.com/eperez98) — Panama 🇵🇦**

<p>
  <img src="https://img.shields.io/badge/version-v2.0.5-0067c0?style=for-the-badge&logo=python&logoColor=white" alt="Version">
  <img src="https://img.shields.io/badge/released-April_10,_2026-0067c0?style=for-the-badge" alt="Released">
  <img src="https://img.shields.io/badge/python-3.10%2B-FFD43B?style=for-the-badge&logo=python&logoColor=black" alt="Python">
  <img src="https://img.shields.io/badge/python_3.14-✓-22c55e?style=for-the-badge" alt="Python 3.14">
  <img src="https://img.shields.io/badge/license-GPL--3.0-22c55e?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/platform-Windows_%7C_macOS_%7C_Linux-blueviolet?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/countries-6-brightgreen?style=for-the-badge" alt="Countries">
  <img src="https://img.shields.io/badge/UI-customtkinter-60cdff?style=for-the-badge" alt="UI">
</p>

<p>
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-whats-new-in-v205">What's New</a> •
  <a href="#-features">Features</a> •
  <a href="#-countries">Countries</a> •
  <a href="#-build-exe">Build .exe</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

---

*A bilingual desktop app that calculates your real take-home pay, breaks down monthly expenses visually, and tells you exactly how long it will take to reach your savings goal — with a fully modernized Windows 11 Fluent Design interface built on `customtkinter`.*

*Una app de escritorio bilingüe que calcula tu salario neto real, visualiza tus gastos y te dice cuánto tiempo tomará alcanzar tu meta — interfaz Fluent Design con `customtkinter`.*

</div>

---

## 🚀 Quick Start

```bash
# Option A — auto-installs everything on first run
python SalaryGoals_Modern.py

# Option B — install manually then run
pip install customtkinter pillow reportlab
python SalaryGoals_Modern.py
```

> **No Python?** Download the pre-built `.exe` from [Releases](https://github.com/eperez98/Calculadora-de-Salario-Calculadora-de-metas/releases) — no installation needed.

---

## 🆕 What's New in v2.0.5

> **April 10, 2026** — Stability patch for the v2.0 Modern Edition. All Python 3.14 + Windows launch issues resolved.

### Fixes in this release

| # | Bug | Fix |
|---|-----|-----|
| 1 | `pyimage1 doesn't exist` — app crashed after splash screen | `_icon_cache` cleared before `CalcApp` builds widget tree |
| 2 | `ModuleNotFoundError: customtkinter` — `.py` file wouldn't open | `_ensure_deps()` auto-installs missing packages on first run |
| 3 | `importlib.util` AttributeError on Python 3.14 | Explicit `import importlib.util` as required by the language spec |
| 4 | Crash log never generated | `sys.excepthook` + `sys.stderr` redirect installed at **line 1**, before any imports |

### Why v1.1.1 was cancelled

After v1.1 shipped, two bugs were found. A v1.1.1 hotfix was started but **cancelled** — rather than patch the aging plain-`tkinter` architecture again, both fixes were folded into the **v2.0 Modern Edition** rewrite using `customtkinter`. See [`CHANGELOG.html`](CHANGELOG.html) for the full story.

### v2.0 vs v1.1 at a glance

| Area | v1.1 (tkinter) | v2.0 (customtkinter) |
|------|---------------|----------------------|
| UI framework | Plain `tkinter` | `customtkinter ≥ 5.2` — native rounded corners |
| Design tokens | Flat `THEME_LIGHT/DARK` dicts | `DesignTokens` frozen dataclass (38 typed tokens) |
| Theme system | Global dict rebuild | `ThemeManager` singleton + `subscribe()` |
| Theme / lang persistence | Lost on restart | Saved to `~/.sgc_prefs.json` |
| Sidebar | 56px icon-only | 210px — logo, nav items, 3px accent bar |
| Status bar | None | 30px bar with live HH:MM:SS clock |
| Error visibility | Silent exit | Crash log + error dialog on any failure |

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

**🧭 Navigation**
- 210px Win11 sidebar with logo, 8 steps, footer card
- 3px left accent bar on active step
- Horizontal pip breadcrumb with live step colors
- Click any visited step to jump back

**📊 Results & Visuals**
- Circular savings % progress ring
- Expense breakdown horizontal bar chart
- Savings projection line chart with goal line
- Hover detail popups on every result row
- Color-coded status: on track / partial / deficit

**🎨 Interface**
- `customtkinter` native rounded corners throughout
- Live Dark / Light mode toggle (no restart)
- Theme + language saved to disk automatically
- Real-time HH:MM:SS clock in status bar
- Auto-installs dependencies on first run

</td>
<td width="50%" valign="top">

**💼 Financial Tools**
- Real-time tax breakdown as you type gross salary
- Pay stub override (enter your actual net)
- 7 expense categories + 3 fully custom extras
- Goal analysis: months remaining, projection
- PDF export — bilingual, formatted report

**💾 Sessions**
- Save and load named sessions (local JSON)
- Data never leaves your machine
- New Query without restarting

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

The app **auto-installs** missing packages on first run. To install manually:

```bash
pip install customtkinter pillow reportlab
```

| Package | Purpose | Min Version |
|---------|---------|-------------|
| Python | Runtime | 3.10 – 3.14 ✅ |
| `customtkinter` | Modern rounded widgets | ≥ 5.2 |
| `pillow` | PIL icon rendering | ≥ 10.0 |
| `reportlab` | PDF export | ≥ 4.0 |
| `tkinter` | Canvas + dialogs | Bundled |

---

## 📦 Build .exe

**One-click:** run `build.bat` — handles PyInstaller + optional Inno Setup automatically.

**Manual:**
```bat
pip install pyinstaller customtkinter pillow reportlab

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

---

## 💾 Data Files

| File | Path |
|------|------|
| Sessions | `~/.salary_calc_sessions.json` |
| Theme + language preference | `~/.sgc_prefs.json` |
| Crash log (if any error) | Next to the script or EXE |

---

## 📁 Project Structure

```
SalaryGoalsCalculator/
│
├── SalaryGoals_Modern.py    ← Main app v2.0.5 (~2,680 lines)
├── assets/
│   └── icon.ico             ← App icon (256/128/64/48/32/16px)
├── build.bat                ← One-click build
├── installer.iss            ← Inno Setup 6 script
├── requirements.txt         ← pip dependencies
├── README.md                ← This file
└── CHANGELOG.html           ← Full version history (open in browser)
```

---

## 🗺️ Roadmap

| Version | Status | Target | Highlights |
|---------|--------|--------|-----------|
| v0.1 Beta | ✅ | 2024 | Panama only |
| v0.2 Beta | ✅ | 2024 | Colombia, dark mode, sessions |
| ~~v0.3 Beta~~ | ⊘ | — | Python 3.14 crashes → merged into v1.0 RC |
| v1.0 RC | ✅ | Mar 15 2026 | Full Fluent UI, Mexico |
| v1.1 | ✅ | Mar 24 2026 | USA, Costa Rica, Peru, charts |
| ~~v1.1.1~~ | ⊘ | — | Cancelled → fixes folded into v2.0 |
| v2.0 | ✅ | Mar 29 2026 | customtkinter rewrite |
| **v2.0.5** | ✅ **Current** | Apr 10 2026 | Launch fixes, crash logger, auto-install |
| v2.1 | 🔜 | Q2 2026 | Animated counters, pie chart, accent picker |
| v2.2 | 🔜 | Q3 2026 | Argentina, Chile, Spain, Excel export |
| v3.0 | 🔜 | 2027 | Android APK, web version, cloud sync |

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

**[github.com/eperez98/Calculadora-de-Salario-Calculadora-de-metas](https://github.com/eperez98/Calculadora-de-Salario-Calculadora-de-metas)**

</div>
