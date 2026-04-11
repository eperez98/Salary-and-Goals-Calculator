# ============================================================
#  Salary & Goals Calculator — Modern CTk Edition
#  by Erick Perez  |  v2.0  |  2026
#
#  pip install customtkinter pillow reportlab
#
#  ARCHITECTURE
#  ─────────────────────────────────────────────────────────
#  • engine.py  : CalcEngine   — pure business logic, zero UI
#  • tokens.py  : DesignTokens — frozen color/spacing system
#  • theme.py   : ThemeManager — singleton, live subscriber
#  • app.py     : CalcApp      — ctk root, wires everything
#
#  All packed into ONE file for easy distribution.
#  No monkey-patching globals — engine is instantiated per app.
# ============================================================
"""
Installation
────────────
    pip install customtkinter pillow reportlab

Run
────
    python SalaryGoals_Modern.py
"""

# ══════════════════════════════════════════════════════════
#  CRASH CATCHER — must be the very first executable code.
#  Catches crashes at import time, module level, AND inside
#  the app — even when there is no console window (EXE).
#  Log is written next to the script / EXE.
# ══════════════════════════════════════════════════════════
import sys as _sys, os as _os, traceback as _tb

def _crash_log_path() -> str:
    """Return log path next to the running script or EXE."""
    if getattr(_sys, "frozen", False):          # PyInstaller EXE
        base = _os.path.dirname(_sys.executable)
    else:                                        # plain .py
        base = _os.path.dirname(_os.path.abspath(__file__))
    return _os.path.join(base, "SalaryGoals_crash.log")

def _write_crash(text: str) -> None:
    """Write crash text to log and show a dialog if possible."""
    path = _crash_log_path()
    try:
        with open(path, "w", encoding="utf-8") as _f:
            _f.write(text)
    except Exception:
        pass
    # Show a GUI error box (works even without a console)
    try:
        import tkinter as _tk
        _r = _tk.Tk(); _r.withdraw()
        _tk.messagebox.showerror(
            "Salary & Goals — Startup Error",
            f"The app failed to start.\n\n{text[:600]}\n\nFull log saved to:\n{path}"
        )
        _r.destroy()
    except Exception:
        pass  # If even Tk fails, at least the log file exists

def _excepthook(exc_type, exc_value, exc_tb):
    """Global exception handler — fires for ALL unhandled exceptions."""
    msg = "".join(_tb.format_exception(exc_type, exc_value, exc_tb))
    _write_crash(msg)

# Install hook IMMEDIATELY — catches crashes during the rest of the imports below
_sys.excepthook = _excepthook

# Also redirect stderr so C-extension error messages go to the log
try:
    _stderr_log = open(_crash_log_path(), "w", encoding="utf-8", buffering=1)
    _sys.stderr = _stderr_log
except Exception:
    pass

# ── Auto-install missing dependencies ─────────────────────
def _ensure_deps() -> None:
    """Install any missing pip packages before the app starts."""
    import importlib.util, subprocess           # util must be imported explicitly
    REQUIRED = [
        ("customtkinter", "customtkinter>=5.2.0"),
        ("PIL",           "pillow>=10.0.0"),
        ("reportlab",     "reportlab>=4.0.0"),
    ]
    missing = [pkg for mod, pkg in REQUIRED if not importlib.util.find_spec(mod)]
    if not missing:
        return
    try:
        import tkinter as _tk
        _r = _tk.Tk(); _r.withdraw()
        _tk.messagebox.showinfo(
            "Salary & Goals — Installing",
            f"Installing required packages:\n\n" + "\n".join(missing) +
            "\n\nThis will take a moment. The app will open automatically."
        )
        _r.destroy()
    except Exception:
        pass
    subprocess.check_call(
        [_sys.executable, "-m", "pip", "install", "--quiet"] + missing
    )

_ensure_deps()

# ── Standard library ──────────────────────────────────────
import os, sys, json, math, platform, time
from dataclasses import dataclass
from datetime import date
from typing import Callable, Optional, Any

# ── GUI ───────────────────────────────────────────────────
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog
import customtkinter as ctk

# ── Optional: PIL for icons ───────────────────────────────
try:
    from PIL import Image, ImageDraw, ImageFont, ImageTk
    PIL_OK = True
except ImportError:
    PIL_OK = False

# ── Optional: PDF ─────────────────────────────────────────
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas as _rlcanvas
    RL_OK = True
except ImportError:
    RL_OK = False


# ═══════════════════════════════════════════════════════════
#  SECTION 1 — DESIGN TOKENS
#  Single source of truth for every color in the app.
# ═══════════════════════════════════════════════════════════
@dataclass(frozen=True)
class DesignTokens:
    # Backgrounds
    win_bg:          str
    sidebar_bg:      str
    card_bg:         str
    input_bg:        str
    header_bg:       str
    nav_act_bg:      str

    # Borders & dividers
    border:          str
    card_border:     str
    input_border:    str
    input_focus:     str
    divider:         str

    # Text
    text1:           str    # primary
    text2:           str    # secondary
    text3:           str    # muted/hint
    text4:           str    # disabled

    # Accent (Win11 blue)
    accent:          str
    accent_hover:    str
    accent_press:    str
    accent_soft:     str

    # Semantic
    success:         str
    success_bg:      str
    danger:          str
    danger_bg:       str
    warning:         str
    warning_bg:      str

    # Step pip states
    step_done:       str
    step_act:        str
    step_pend:       str

    # Nav item active text
    nav_act_fg:      str

    # Buttons (non-accent)
    btn_ghost_bg:    str
    btn_ghost_fg:    str
    btn_ghost_hover: str

    # Progress / chart
    progress_bg:     str

    # Status bar
    status_bg:       str
    status_border:   str

    # Tags / pills
    tag_blue:        str
    tag_green:       str
    tag_red:         str
    tag_purple:      str
    tag_orange:      str

    # Note boxes
    note_bg:         str
    note_border:     str

    # Title bar
    title_bar:       str
    title_fg:        str

    # Scrollbar
    scrollbar:       str


LIGHT = DesignTokens(
    win_bg          = "#F3F3F3",
    sidebar_bg      = "#FFFFFF",
    card_bg         = "#FFFFFF",
    input_bg        = "#FFFFFF",
    header_bg       = "#FFFFFF",
    nav_act_bg      = "#EEF3FC",

    border          = "#E0E0E0",
    card_border     = "#E5E5E5",
    input_border    = "#AAAAAA",
    input_focus     = "#0067C0",
    divider         = "#E5E5E5",

    text1           = "#1A1A1A",
    text2           = "#5A5A5A",
    text3           = "#9A9A9A",
    text4           = "#BBBBBB",

    accent          = "#0067C0",
    accent_hover    = "#0078D4",
    accent_press    = "#005AA8",
    accent_soft     = "#CCE4F7",

    success         = "#107C10",
    success_bg      = "#DFF6DD",
    danger          = "#C42B1C",
    danger_bg       = "#FDE7E9",
    warning         = "#9D5D00",
    warning_bg      = "#FFF4CE",

    step_done       = "#107C10",
    step_act        = "#0067C0",
    step_pend       = "#C8C8C8",

    nav_act_fg      = "#0067C0",

    btn_ghost_bg    = "#F3F3F3",
    btn_ghost_fg    = "#1A1A1A",
    btn_ghost_hover = "#E5E5E5",

    progress_bg     = "#E0E0E0",

    status_bg       = "#F9F9F9",
    status_border   = "#E5E5E5",

    tag_blue        = "#0067C0",
    tag_green       = "#107C10",
    tag_red         = "#C42B1C",
    tag_purple      = "#7719AA",
    tag_orange      = "#9D5D00",

    note_bg         = "#FFF4CE",
    note_border     = "#F0B400",

    title_bar       = "#1F1F1F",
    title_fg        = "#FFFFFF",

    scrollbar       = "#C8C8C8",
)

DARK = DesignTokens(
    win_bg          = "#202020",
    sidebar_bg      = "#181818",
    card_bg         = "#272727",
    input_bg        = "#2C2C2C",
    header_bg       = "#242424",
    nav_act_bg      = "#1E3452",

    border          = "#333333",
    card_border     = "#333333",
    input_border    = "#555555",
    input_focus     = "#60CDFF",
    divider         = "#333333",

    text1           = "#F0F0F0",
    text2           = "#C0C0C0",
    text3           = "#808080",
    text4           = "#555555",

    accent          = "#60AEFF",
    accent_hover    = "#7AB8FF",
    accent_press    = "#4A9AEE",
    accent_soft     = "#0A3A5A",

    success         = "#4EC94E",
    success_bg      = "#0D3B0D",
    danger          = "#F04747",
    danger_bg       = "#3B0D0D",
    warning         = "#FFCA28",
    warning_bg      = "#3B3300",

    step_done       = "#4EC94E",
    step_act        = "#60AEFF",
    step_pend       = "#3C3C3C",

    nav_act_fg      = "#7AB8FF",

    btn_ghost_bg    = "#2C2C2C",
    btn_ghost_fg    = "#F0F0F0",
    btn_ghost_hover = "#383838",

    progress_bg     = "#3C3C3C",

    status_bg       = "#181818",
    status_border   = "#2D2D2D",

    tag_blue        = "#2B5EA7",
    tag_green       = "#1A6B1A",
    tag_red         = "#8B1A1A",
    tag_purple      = "#5C1A7A",
    tag_orange      = "#6B3D00",

    note_bg         = "#3B3300",
    note_border     = "#A08000",

    title_bar       = "#141414",
    title_fg        = "#FFFFFF",

    scrollbar       = "#555555",
)


# ═══════════════════════════════════════════════════════════
#  SECTION 2 — THEME MANAGER
# ═══════════════════════════════════════════════════════════
class ThemeManager:
    """Singleton. Broadcast theme to all subscribed widgets instantly."""
    _inst = None

    def __new__(cls):
        if cls._inst is None:
            cls._inst = super().__new__(cls)
            cls._inst._dark = False
            cls._inst._subs: list[Callable] = []
        return cls._inst

    @property
    def T(self) -> DesignTokens:
        return DARK if self._dark else LIGHT

    @property
    def is_dark(self) -> bool:
        return self._dark

    def subscribe(self, cb: Callable[[DesignTokens], None]):
        self._subs.append(cb)

    def set_theme(self, dark: bool):
        self._dark = dark
        ctk.set_appearance_mode("dark" if dark else "light")
        for cb in self._subs:
            try: cb(self.T)
            except Exception: pass

    def toggle(self):
        self.set_theme(not self._dark)


TM = ThemeManager()

# ── Persist theme preference ──────────────────────────────
_PREFS_FILE = os.path.join(os.path.expanduser("~"), ".sgc_prefs.json")

def _load_prefs() -> dict:
    try:
        if os.path.exists(_PREFS_FILE):
            with open(_PREFS_FILE, "r") as f:
                return json.load(f)
    except Exception: pass
    return {}

def _save_prefs(d: dict):
    try:
        with open(_PREFS_FILE, "w") as f:
            json.dump(d, f)
    except Exception: pass


# ═══════════════════════════════════════════════════════════
#  SECTION 3 — FONTS
# ═══════════════════════════════════════════════════════════
_OS = platform.system()
FS   = "Segoe UI Variable Text" if _OS == "Windows" else (
       "SF Pro Display"          if _OS == "Darwin"  else "Ubuntu")
MONO = "Consolas" if _OS == "Windows" else (
       "Menlo"    if _OS == "Darwin"  else "DejaVu Sans Mono")


# ═══════════════════════════════════════════════════════════
#  SECTION 4 — TRANSLATIONS (100% preserved from original)
# ═══════════════════════════════════════════════════════════
_LANG = "es"

LANGS = {  # dict[str, dict[str, Any]]
    "es": {
        "app_title":      "Calculadora de Salario & Metas — by Erick Perez",
        "steps":          ["Perfil","Meta","Ingresos","Hogar","Deudas","Ocio","Extras","Resultado"],
        "step_of":        "Paso {s} de {t}",
        "back":           "← Atrás",   "next": "Siguiente →",
        "new_query":      "⟳ Nueva Consulta",
        "save_session":   "Guardar",   "load_session": "Cargar",
        "save_name_prompt":"Nombre para esta sesión:",
        "save_success":   "Sesión guardada: {name}",
        "load_select":    "Selecciona una sesión:",
        "load_none":      "No hay sesiones guardadas.",
        "load_success":   "Sesión cargada: {name}",
        "delete_session": "Eliminar",  "cancel": "Cancelar", "ok": "OK",
        "req_name":       "Por favor ingresa tu nombre.",
        "req_meta":       "Ingresa una meta de ahorro válida.",
        "req_anio":       "Ingresa un año válido (ej: 2026).",
        "req_salary":     "Ingresa tu salario mensual bruto.",
        "p0_title":       "Tu Perfil",
        "p0_sub":         "Cuéntanos quién eres para personalizar tu reporte.",
        "p0_name":        "Nombre completo *",
        "p0_country":     "País de residencia *",
        "p0_note":        "v2.0 — Panamá 🇵🇦  Colombia 🇨🇴  México 🇲🇽  USA 🇺🇸  Costa Rica 🇨🇷  Perú 🇵🇪",
        "p1_title":       "Meta de Ahorro",
        "p1_sub":         "Define cuánto quieres ahorrar y para cuándo.",
        "p1_meta":        "Meta de ahorro *",
        "p1_month":       "Mes objetivo *", "p1_year": "Año objetivo *",
        "p1_tip":         "Un ahorro mensual constante tiene un gran impacto a largo plazo.",
        "p2_title":       "Ingresos — {nombre}",
        "p2_sub":         "País: {pais}  |  Deducciones calculadas automáticamente.",
        "p2_gross":       "Salario BRUTO mensual *",
        "p2_extra":       "Ingresos extra este mes",
        "p2_real":        "Salario REAL recibido (opcional)",
        "p2_note":        "Estimado. El monto real puede variar. Verifica con tu recibo de pago.",
        "p2_imp_title":   "Desglose estimado — {pais}",
        "p3_title":       "Gastos del Hogar",
        "p3_sub":         "Servicios básicos y vivienda.",
        "p3_rent":        "Alquiler / Hipoteca",
        "p3_internet":    "Factura de Internet Mensual",
        "p3_electric":    "Factura de Luz",
        "p3_water":       "Agua",
        "p3_mobile":      "Data Móvil / Celular",
        "p4_title":       "Deudas, Auto y Mascotas",
        "p4_sub":         "Préstamos, gastos de vehículo y cuidado de mascotas.",
        "p4_s1":          "Préstamos y Deudas",
        "p4_loan_p":      "Préstamo Personal",
        "p4_loan_a":      "Préstamo de Auto",
        "p4_debts":       "Otras Deudas",
        "p4_s2":          "Gastos de Auto",
        "p4_gas":         "Gasolina",      "p4_maint": "Mantenimiento",
        "p4_s3":          "Mascotas",
        "p4_pet_food":    "Comida",        "p4_pet_vet": "Veterinario", "p4_pet_other": "Otros",
        "p5_title":       "Ocio y Suscripciones",
        "p5_sub":         "Entretenimiento, comida y plataformas digitales.",
        "p5_s1":          "Gastos Variables",
        "p5_grocery":     "Supermercado",  "p5_out": "Salidas", "p5_delivery": "Delivery",
        "p5_s2":          "Suscripciones Digitales",
        "p6_title":       "Gastos Extra",
        "p6_sub":         "Cualquier gasto adicional.",
        "p6_extra":       "Gasto Extra {n}",
        "p6_desc":        "Descripción",
        "p6_hint":        "Al presionar Siguiente se calcularán todos tus resultados.",
        "p7_title":       "Resultados — {nombre}",
        "p7_sub":         "{pais}  ·  Meta: {sym}{meta:,.0f} para {mes} {anio}",
        "p7_deficit":     "DÉFICIT  {sym}{amt:,.0f}/mes  —  Gastos superan ingresos",
        "p7_ontrack":     "EN META  {sym}{amt:,.0f}/mes  —  ¡Alcanzarás tu objetivo!",
        "p7_need":        "PARCIAL  {sym}{amt:,.0f}/mes  —  Faltan {sym}{falta:,.0f} más/mes",
        "p7_summary":     "Resumen Total",
        "p7_tot_inc":     "Total Ingresos",   "p7_tot_exp": "Total Gastos",
        "p7_saving":      "AHORRO MENSUAL",
        "p7_salary_imp":  "Salario e Impuestos",
        "p7_total_ded":   "Total deducciones",
        "p7_net_est":     "Salario Neto (estimado)",
        "p7_net_real":    "Salario Real (recibo)",
        "p7_imp_note":    "Estimado. Puede variar. Verifica con tu recibo.",
        "p7_income":      "Ingresos",
        "p7_net_base":    "Salario Neto (base)",
        "p7_extra_inc":   "Ingreso Extra",
        "p7_total_inc":   "TOTAL INGRESOS",
        "p7_home":        "Hogar",
        "p7_rent":        "Alquiler", "p7_electric": "Luz",
        "p7_water":       "Agua",     "p7_mobile": "Data Móvil",
        "p7_loans":       "Préstamos",
        "p7_loan_p":      "Préstamo personal", "p7_loan_a": "Préstamo auto",
        "p7_debts":       "Otras deudas",
        "p7_auto_pets":   "Auto & Mascotas",
        "p7_gas":         "Gasolina", "p7_maint": "Mantenimiento",
        "p7_pet_food":    "Comida mascotas", "p7_pet_vet": "Veterinario", "p7_pet_other": "Otros",
        "p7_vars":        "Variables & Suscripciones",
        "p7_grocery":     "Supermercado", "p7_out": "Salidas",
        "p7_extras_sec":  "Gastos Extra",
        "p7_extra_lbl":   "Extra: {desc}",
        "p7_goal":        "Análisis de Meta",
        "p7_goal_amt":    "Meta de ahorro",
        "p7_months_left": "Meses restantes",
        "p7_need_mo":     "Ahorro necesario/mes",
        "p7_curr_mo":     "Tu ahorro actual/mes",
        "p7_projection":  "Proyección total",
        "p7_export":      "Exportar PDF",
        "p7_new":         "Usa 'Nueva Consulta' para empezar de nuevo.",
        "p7_chart_exp":   "Desglose de Gastos",
        "p7_chart_proj":  "Proyección de Ahorro",
        "p7_chart_mo":    "Mes",  "p7_chart_goal": "Meta",
        "p7_hover_detail":"Detalle",
        "pdf_save_title": "Guardar reporte PDF",
        "pdf_saved":      "PDF Generado",
        "pdf_saved_msg":  "Guardado en:\n{ruta}",
        "months": ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                   "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
        "tax_css":          "CSS (9.75%)",
        "tax_edu":          "Seg. Educativo (1.25%)",
        "tax_isr_pa":       "ISR estimado",
        "tax_pension_co":   "Pensión (4%)",
        "tax_salud_co":     "Salud (4%)",
        "tax_renta_co":     "Retención Fuente",
        "tax_imss_mx":      "IMSS (6.5% aprox)",
        "tax_isr_mx":       "ISR estimado",
        "tax_ss_us":        "Social Security (6.2%)",
        "tax_medicare_us":  "Medicare (1.45%)",
        "tax_fed_us":       "Federal Tax (est.)",
        "tax_ccss_cr":      "CCSS — SEM (5.5%)",
        "tax_ivm_cr":       "CCSS — IVM (3.84%)",
        "tax_ccss_ot_cr":   "CCSS — Banco Pop. (~1%)",
        "tax_isr_cr":       "Imp. Renta estimado",
        "tax_onp_pe":       "ONP (13%)",
        "tax_isr_pe":       "Imp. Renta estimado",
        "dark_mode":        "☀ Claro",
        "light_mode":       "◐ Oscuro",
    },
    "en": {
        "app_title":      "Salary & Goals Calculator — by Erick Perez",
        "steps":          ["Profile","Goal","Income","Home","Debts","Leisure","Extras","Results"],
        "step_of":        "Step {s} of {t}",
        "back":           "← Back",    "next": "Next →",
        "new_query":      "⟳ New Query",
        "save_session":   "Save",      "load_session": "Load",
        "save_name_prompt":"Session name:",
        "save_success":   "Session saved: {name}",
        "load_select":    "Select a session:",
        "load_none":      "No saved sessions.",
        "load_success":   "Session loaded: {name}",
        "delete_session": "Delete",    "cancel": "Cancel",  "ok": "OK",
        "req_name":       "Please enter your name.",
        "req_meta":       "Enter a valid savings goal.",
        "req_anio":       "Enter a valid year (e.g. 2026).",
        "req_salary":     "Enter your gross monthly salary.",
        "p0_title":       "Your Profile",
        "p0_sub":         "Tell us about yourself to personalize your report.",
        "p0_name":        "Full name *",
        "p0_country":     "Country of residence *",
        "p0_note":        "v2.0 — Panama 🇵🇦  Colombia 🇨🇴  Mexico 🇲🇽  USA 🇺🇸  Costa Rica 🇨🇷  Peru 🇵🇪",
        "p1_title":       "Savings Goal",
        "p1_sub":         "Define how much you want to save and by when.",
        "p1_meta":        "Savings goal *",
        "p1_month":       "Target month *", "p1_year": "Target year *",
        "p1_tip":         "Consistent monthly savings, even small amounts, have a huge long-term impact.",
        "p2_title":       "Income — {nombre}",
        "p2_sub":         "Country: {pais}  |  Deductions calculated automatically.",
        "p2_gross":       "Gross monthly salary *",
        "p2_extra":       "Extra income this month",
        "p2_real":        "ACTUAL salary received (optional)",
        "p2_note":        "Estimated. Actual amount may vary. Verify with your pay stub.",
        "p2_imp_title":   "Estimated breakdown — {pais}",
        "p3_title":       "Home Expenses",
        "p3_sub":         "Basic services and housing.",
        "p3_rent":        "Rent / Mortgage",
        "p3_internet":    "Monthly Internet Bill",
        "p3_electric":    "Electricity Bill",
        "p3_water":       "Water",
        "p3_mobile":      "Mobile Data / Phone",
        "p4_title":       "Debts, Car & Pets",
        "p4_sub":         "Loans, vehicle expenses and pet care.",
        "p4_s1":          "Loans & Debts",
        "p4_loan_p":      "Personal Loan", "p4_loan_a": "Car Loan", "p4_debts": "Other Debts",
        "p4_s2":          "Car Expenses",
        "p4_gas":         "Gas",           "p4_maint": "Maintenance",
        "p4_s3":          "Pet Expenses",
        "p4_pet_food":    "Pet food",      "p4_pet_vet": "Veterinarian", "p4_pet_other": "Other",
        "p5_title":       "Leisure & Subscriptions",
        "p5_sub":         "Entertainment, food and digital platforms.",
        "p5_s1":          "Variable Expenses",
        "p5_grocery":     "Grocery",       "p5_out": "Outings",  "p5_delivery": "Delivery",
        "p5_s2":          "Digital Subscriptions",
        "p6_title":       "Extra Expenses",
        "p6_sub":         "Any additional expense.",
        "p6_extra":       "Extra Expense {n}",
        "p6_desc":        "Description",
        "p6_hint":        "Pressing Next will calculate all your results.",
        "p7_title":       "Results — {nombre}",
        "p7_sub":         "{pais}  ·  Goal: {sym}{meta:,.0f} for {mes} {anio}",
        "p7_deficit":     "DEFICIT  {sym}{amt:,.0f}/mo  —  Expenses exceed income",
        "p7_ontrack":     "ON TRACK  {sym}{amt:,.0f}/mo  —  You'll reach your goal!",
        "p7_need":        "PARTIAL  {sym}{amt:,.0f}/mo  —  Need {sym}{falta:,.0f} more/mo",
        "p7_summary":     "Total Summary",
        "p7_tot_inc":     "Total Income",     "p7_tot_exp": "Total Expenses",
        "p7_saving":      "MONTHLY SAVINGS",
        "p7_salary_imp":  "Salary & Taxes",
        "p7_total_ded":   "Total deductions (est.)",
        "p7_net_est":     "Net Salary (estimated)",
        "p7_net_real":    "Actual Salary (pay stub)",
        "p7_imp_note":    "Estimated. May vary. Verify with your pay stub.",
        "p7_income":      "Income",
        "p7_net_base":    "Net Salary (base)",
        "p7_extra_inc":   "Extra Income",
        "p7_total_inc":   "TOTAL INCOME",
        "p7_home":        "Home",
        "p7_rent":        "Rent",     "p7_electric": "Electricity",
        "p7_water":       "Water",    "p7_mobile": "Mobile Data",
        "p7_loans":       "Loans",
        "p7_loan_p":      "Personal loan", "p7_loan_a": "Car loan",
        "p7_debts":       "Other debts",
        "p7_auto_pets":   "Car & Pets",
        "p7_gas":         "Gas",      "p7_maint": "Maintenance",
        "p7_pet_food":    "Pet food", "p7_pet_vet": "Vet", "p7_pet_other": "Other pets",
        "p7_vars":        "Variable & Subscriptions",
        "p7_grocery":     "Grocery",  "p7_out": "Outings",
        "p7_extras_sec":  "Extra Expenses",
        "p7_extra_lbl":   "Extra: {desc}",
        "p7_goal":        "Goal Analysis",
        "p7_goal_amt":    "Savings goal",
        "p7_months_left": "Months remaining",
        "p7_need_mo":     "Required savings/mo",
        "p7_curr_mo":     "Your current savings/mo",
        "p7_projection":  "Total projection",
        "p7_export":      "Export PDF",
        "p7_new":         "Use 'New Query' to start over.",
        "p7_chart_exp":   "Expense Breakdown",
        "p7_chart_proj":  "Savings Projection",
        "p7_chart_mo":    "Month", "p7_chart_goal": "Goal",
        "p7_hover_detail":"Detail",
        "pdf_save_title": "Save PDF report",
        "pdf_saved":      "PDF Generated",
        "pdf_saved_msg":  "Saved at:\n{ruta}",
        "months": ["January","February","March","April","May","June",
                   "July","August","September","October","November","December"],
        "tax_css":          "CSS (9.75%)",
        "tax_edu":          "Educational Insurance (1.25%)",
        "tax_isr_pa":       "ISR (estimated)",
        "tax_pension_co":   "Pension (4%)",
        "tax_salud_co":     "Health (4%)",
        "tax_renta_co":     "Income Withholding",
        "tax_imss_mx":      "IMSS (~6.5%)",
        "tax_isr_mx":       "ISR (estimated)",
        "tax_ss_us":        "Social Security (6.2%)",
        "tax_medicare_us":  "Medicare (1.45%)",
        "tax_fed_us":       "Federal Tax (est.)",
        "tax_ccss_cr":      "CCSS — SEM (5.5%)",
        "tax_ivm_cr":       "CCSS — IVM (3.84%)",
        "tax_ccss_ot_cr":   "CCSS — Banco Pop. (~1%)",
        "tax_isr_cr":       "Income Tax (estimated)",
        "tax_onp_pe":       "ONP (13%)",
        "tax_isr_pe":       "Income Tax (estimated)",
        "dark_mode":        "☀ Light",
        "light_mode":       "◐ Dark",
    },
}

def T(key: str, **kw) -> str:
    txt = LANGS[_LANG].get(key, LANGS["es"].get(key, key))
    return txt.format(**kw) if kw else txt

def get_months() -> list[str]:
    return T("months")


# ═══════════════════════════════════════════════════════════
#  SECTION 5 — TAX ENGINE  (pure logic, zero UI imports)
# ═══════════════════════════════════════════════════════════

def _calcular_impuestos_panama(s: float) -> dict:
    css = s * 0.0975;  edu = s * 0.0125
    anual = (s - css - edu) * 12
    if anual <= 11000:   isr_a = 0
    elif anual <= 50000: isr_a = (anual - 11000) * 0.15
    else:                isr_a = (50000 - 11000) * 0.15 + (anual - 50000) * 0.25
    isr = isr_a / 12;  tot = css + edu + isr
    return {"total_imp": round(tot, 2), "salario_neto": round(s - tot, 2),
            "detalle": [(T("tax_css"), round(css, 2)),
                        (T("tax_edu"), round(edu, 2)),
                        (T("tax_isr_pa"), round(isr, 2))]}

def _calcular_impuestos_colombia(s: float) -> dict:
    pen = s * 0.04;  sal = s * 0.04;  uvt = 47065
    au = (s / uvt) * 12
    if   au <= 95:   r = 0
    elif au <= 150:  r = (au - 95) * 0.19 * uvt / 12
    elif au <= 360:  r = ((au - 150) * 0.28 + 10.45) * uvt / 12
    elif au <= 640:  r = ((au - 360) * 0.33 + 69.25) * uvt / 12
    elif au <= 945:  r = ((au - 640) * 0.35 + 162.65) * uvt / 12
    elif au <= 2300: r = ((au - 945) * 0.37 + 269.40) * uvt / 12
    else:            r = ((au - 2300) * 0.39 + 770.85) * uvt / 12
    tot = pen + sal + r
    return {"total_imp": round(tot, 2), "salario_neto": round(s - tot, 2),
            "detalle": [(T("tax_pension_co"), round(pen, 2)),
                        (T("tax_salud_co"),   round(sal, 2)),
                        (T("tax_renta_co"),   round(r, 2))]}

def _calcular_impuestos_mexico(s: float) -> dict:
    imss = s * 0.065
    tabla = [
        (746.04, 0, 0.0192), (6332.05, 14.32, 0.0640),
        (11128.01, 371.83, 0.1088), (12935.82, 893.63, 0.1600),
        (15487.71, 1182.88, 0.1792), (31236.49, 1227.07, 0.2136),
        (49233.00, 1281.96 + (31236.49 - 15487.71) * 0.2136, 0.2352),
        (93993.90, 0, 0.3000), (125325.20, 0, 0.3200),
        (375975.61, 0, 0.3400), (float('inf'), 0, 0.3500),
    ]
    isr = 0; lp = 0
    for ls, cf, t in tabla:
        if s <= ls: isr = cf + (s - lp) * t; break
        lp = ls
    isr = max(0, isr);  tot = imss + isr
    return {"total_imp": round(tot, 2), "salario_neto": round(s - tot, 2),
            "detalle": [(T("tax_imss_mx"), round(imss, 2)),
                        (T("tax_isr_mx"),  round(isr, 2))]}

def _calcular_impuestos_usa(s: float) -> dict:
    ss = min(s, 168600 / 12) * 0.062
    med = s * 0.0145
    taxable = max(0, s * 12 - 14600)
    bkts = [(11600, 0, 0.10), (47150, 1160, 0.12), (100525, 5426, 0.22),
            (191950, 17168.5, 0.24), (243725, 39110.5, 0.32),
            (609350, 55578.5, 0.35), (float('inf'), 183647.25, 0.37)]
    fa = 0; prev = 0
    for lim, bt, rate in bkts:
        if taxable <= lim: fa = bt + (taxable - prev) * rate; break
        prev = lim
    fed = fa / 12;  tot = ss + med + fed
    return {"total_imp": round(tot, 2), "salario_neto": round(s - tot, 2),
            "detalle": [(T("tax_ss_us"),        round(ss, 2)),
                        (T("tax_medicare_us"),  round(med, 2)),
                        (T("tax_fed_us"),        round(fed, 2))]}

def _calcular_impuestos_costa_rica(s: float) -> dict:
    sem = s * 0.055;  ivm = s * 0.0384;  ot = s * 0.01;  ccss = sem + ivm + ot
    base = max(0, s - ccss)
    tramos = [(929000, 0, 0.0), (1363000, 0, 0.10), (2392000, 43400, 0.15),
              (4783000, 198050, 0.20), (float('inf'), 676250, 0.25)]
    isr = 0; prev = 0
    for lim, bt, rate in tramos:
        if base <= lim: isr = bt + max(0, base - prev) * rate; break
        prev = lim
    tot = ccss + max(0, isr)
    return {"total_imp": round(tot, 2), "salario_neto": round(s - tot, 2),
            "detalle": [(T("tax_ccss_cr"),    round(sem, 2)),
                        (T("tax_ivm_cr"),     round(ivm, 2)),
                        (T("tax_ccss_ot_cr"), round(ot, 2)),
                        (T("tax_isr_cr"),     round(isr, 2))]}

def _calcular_impuestos_peru(s: float) -> dict:
    onp = s * 0.13;  uit = 5150
    neta = max(0, s * 12 - 7 * uit);  nu = neta / uit
    tramos = [(5, 0.08), (20, 0.14), (35, 0.17), (45, 0.20), (float('inf'), 0.30)]
    ia = 0; pu = 0
    for lu, rate in tramos:
        if nu <= lu: ia += (nu - pu) * rate * uit; break
        ia += (lu - pu) * rate * uit; pu = lu
    tot = onp + ia / 12
    return {"total_imp": round(tot, 2), "salario_neto": round(s - tot, 2),
            "detalle": [(T("tax_onp_pe"), round(onp, 2)),
                        (T("tax_isr_pe"), round(ia / 12, 2))]}

PAISES = {
    "Panamá":     {"moneda": "USD", "simbolo": "$",  "flag": "🇵🇦", "calcular": _calcular_impuestos_panama,    "int_fmt": False},
    "Colombia":   {"moneda": "COP", "simbolo": "$",  "flag": "🇨🇴", "calcular": _calcular_impuestos_colombia,  "int_fmt": True},
    "México":     {"moneda": "MXN", "simbolo": "$",  "flag": "🇲🇽", "calcular": _calcular_impuestos_mexico,    "int_fmt": True},
    "USA":        {"moneda": "USD", "simbolo": "$",  "flag": "🇺🇸", "calcular": _calcular_impuestos_usa,       "int_fmt": False},
    "Costa Rica": {"moneda": "CRC", "simbolo": "₡",  "flag": "🇨🇷", "calcular": _calcular_impuestos_costa_rica,"int_fmt": True},
    "Perú":       {"moneda": "PEN", "simbolo": "S/", "flag": "🇵🇪", "calcular": _calcular_impuestos_peru,      "int_fmt": False},
}

def get_sym(pais: str) -> str: return PAISES.get(pais, {}).get("simbolo", "$")
def is_int_fmt(pais: str) -> bool: return PAISES.get(pais, {}).get("int_fmt", False)
def f_v(v: float, pais: str) -> str:
    sym = get_sym(pais)
    return f"{sym}{v:,.0f}" if is_int_fmt(pais) else f"{sym}{v:,.2f}"

def calcular_meses(anio: int, mes: int) -> int:
    hoy = date.today();  meta = date(anio, mes, 1)
    if hoy >= meta: return 0
    return (meta.year - hoy.year) * 12 + (meta.month - hoy.month)


# ═══════════════════════════════════════════════════════════
#  SECTION 6 — SESSION PERSISTENCE
# ═══════════════════════════════════════════════════════════
SESSIONS_FILE = os.path.join(os.path.expanduser("~"), ".salary_calc_sessions.json")

def load_sessions() -> dict:
    try:
        if os.path.exists(SESSIONS_FILE):
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception: pass
    return {}

def save_sessions(sessions: dict) -> bool:
    try:
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(sessions, f, ensure_ascii=False, indent=2)
        return True
    except Exception: return False


# ═══════════════════════════════════════════════════════════
#  SECTION 7 — PDF EXPORT  (100% preserved logic)
# ═══════════════════════════════════════════════════════════
def generar_pdf(d: dict, ruta: str) -> bool:
    if not RL_OK: return False
    try:
        c = _rlcanvas.Canvas(ruta, pagesize=letter)
        W, H = letter

        # Header bar
        c.setFillColorRGB(0, 0.404, 0.753)
        c.rect(0, H - 50, W, 50, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(30, H - 32, "Salary & Goals Calculator — by Erick Perez")
        c.setFont("Helvetica", 9)
        c.drawRightString(W - 30, H - 32, f"v2.0 Modern Edition  •  {date.today()}")

        c.setFillColorRGB(0, 0, 0)
        pais = d.get("pais", "Panamá");  sym = get_sym(pais)
        imp  = d.get("impuestos", {});  sal_base = d.get("salario_neto", 0)
        total_i = d.get("total_ingresos", 0);  total_g = d.get("total_gastos", 0)
        ahorro  = d.get("ahorro_mensual", 0);  meta = d.get("meta", 0)

        y = H - 70
        sections = [
            (T("p7_salary_imp"), [
                *[(n, f_v(m, pais)) for n, m in imp.get("detalle", [])],
                (T("p7_total_ded"), f_v(imp.get("total_imp", 0), pais)),
                (T("p7_net_est"),   f_v(imp.get("salario_neto", 0), pais)),
            ]),
            (T("p7_income"), [
                (T("p7_net_base"),  f_v(sal_base, pais)),
                (T("p7_extra_inc"),f_v(d.get("ingreso_extra", 0), pais)),
                (T("p7_total_inc"),f_v(total_i, pais)),
            ]),
            (T("p7_summary"), [
                (T("p7_tot_inc"),  f_v(total_i, pais)),
                (T("p7_tot_exp"),  f_v(total_g, pais)),
                (T("p7_saving"),   f_v(ahorro, pais)),
            ]),
            (T("p7_goal"), [
                (T("p7_goal_amt"),   f_v(meta, pais)),
                (T("p7_curr_mo"),    f_v(ahorro, pais)),
                (T("p7_projection"), f_v(max(ahorro, 0) * d.get("meses_restantes", 0), pais)),
            ]),
        ]

        for sec_title, rows in sections:
            if y < 80: c.showPage(); y = H - 40
            c.setFont("Helvetica-Bold", 11)
            c.setFillColorRGB(0, 0.404, 0.753)
            c.drawString(30, y, sec_title);  y -= 18
            c.setFillColorRGB(0, 0, 0)
            for lbl, val in rows:
                if y < 60: c.showPage(); y = H - 40
                c.setFont("Helvetica", 10)
                c.drawString(40, y, lbl)
                c.setFont("Helvetica-Bold", 10)
                c.drawRightString(W - 40, y, val)
                y -= 16
            y -= 8

        # Footer
        c.setFont("Helvetica", 8)
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.drawString(30, 30, f"Salary & Goals Calculator  •  by Erick Perez  •  {d.get('nombre', '')}  •  {pais}")
        c.save()
        return True
    except Exception:
        return False


# ═══════════════════════════════════════════════════════════
#  SECTION 8 — PIL ICON HELPERS
# ═══════════════════════════════════════════════════════════
_icon_cache: dict = {}

def _pill_icon(w: int, h: int, bg: str, fg: str, sym: str) -> Optional[object]:
    if not PIL_OK: return None
    key = ("pill", w, h, bg, fg, sym)
    if key in _icon_cache: return _icon_cache[key]
    S = 2
    img = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    br = int(bg.lstrip("#"), 16)
    bg_rgba = ((br >> 16) & 255, (br >> 8) & 255, br & 255, 255)
    draw.rounded_rectangle((0, 0, w * S - 1, h * S - 1), radius=h * S // 3, fill=bg_rgba)
    fr = int(fg.lstrip("#"), 16)
    fg_rgba = ((fr >> 16) & 255, (fr >> 8) & 255, fr & 255, 255)
    fnt = None
    try:
        fs = int(h * S * 0.5)
        for fn in ["segoeuib.ttf", "segoeui.ttf", "arial.ttf"]:
            try: fnt = ImageFont.truetype(fn, fs); break
            except: pass
    except: pass
    if fnt:
        bb = draw.textbbox((0, 0), sym[:2], font=fnt)
        tx = (w * S - (bb[2] - bb[0])) // 2 - bb[0]
        ty = (h * S - (bb[3] - bb[1])) // 2 - bb[1]
        draw.text((tx, ty), sym[:2], font=fnt, fill=fg_rgba)
    img = img.resize((w, h), Image.LANCZOS)
    ph = ImageTk.PhotoImage(img)
    _icon_cache[key] = ph
    return ph

def _circle_icon(size: int, bg: str, fg: str, sym: str, scale: float = 0.45) -> Optional[object]:
    if not PIL_OK: return None
    key = ("circle", size, bg, fg, sym)
    if key in _icon_cache: return _icon_cache[key]
    S = size * 2
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    br = int(bg.lstrip("#"), 16)
    draw.ellipse((0, 0, S - 1, S - 1), fill=((br >> 16) & 255, (br >> 8) & 255, br & 255, 255))
    fr = int(fg.lstrip("#"), 16)
    fg_rgba = ((fr >> 16) & 255, (fr >> 8) & 255, fr & 255, 255)
    fnt = None
    try:
        fs = int(S * scale)
        for fn in ["segoeuib.ttf", "segoeui.ttf", "arial.ttf"]:
            try: fnt = ImageFont.truetype(fn, fs); break
            except: pass
    except: pass
    if fnt:
        bb = draw.textbbox((0, 0), sym[:1], font=fnt)
        draw.text(((S - (bb[2] - bb[0])) // 2 - bb[0],
                   (S - (bb[3] - bb[1])) // 2 - bb[1]), sym[:1], font=fnt, fill=fg_rgba)
    img = img.resize((size, size), Image.LANCZOS)
    ph = ImageTk.PhotoImage(img)
    _icon_cache[key] = ph
    return ph


# ═══════════════════════════════════════════════════════════
#  SECTION 9 — MODERN WIDGET LIBRARY
# ═══════════════════════════════════════════════════════════

class Card(ctk.CTkFrame):
    """Rounded card with 1px border. Auto-subscribes to theme."""
    def __init__(self, parent, padx=20, pady=8, **kw):
        T_ = TM.T
        super().__init__(parent,
                         fg_color=T_.card_bg,
                         border_color=T_.card_border,
                         border_width=1,
                         corner_radius=10, **kw)
        self.pack(fill="x", padx=padx, pady=pady)
        TM.subscribe(lambda t: self.configure(fg_color=t.card_bg, border_color=t.card_border))

    def inner(self, padx=16, pady=(12, 16)) -> ctk.CTkFrame:
        f = ctk.CTkFrame(self, fg_color="transparent")
        f.pack(fill="x", padx=padx, pady=pady)
        return f


class SectionHeader(ctk.CTkFrame):
    """Bold section label + thin accent underline."""
    def __init__(self, parent, text: str, sym: str = "", **kw):
        T_ = TM.T
        super().__init__(parent, fg_color="transparent", **kw)
        self.pack(fill="x", padx=16, pady=(14, 4))

        if sym and PIL_OK:
            ico = _pill_icon(28, 20, T_.accent_soft, T_.accent, sym)
            if ico:
                il = tk.Label(self, image=ico, bg=T_.card_bg)
                il._ico = ico; il.pack(side="left", padx=(0, 8))
                TM.subscribe(lambda t, w=il: w.configure(bg=t.card_bg))

        self._lbl = ctk.CTkLabel(self, text=text,
                                  font=ctk.CTkFont(FS, 12, "bold"),
                                  text_color=T_.text1,
                                  anchor="w")
        self._lbl.pack(side="left")
        TM.subscribe(lambda t: self._lbl.configure(text_color=t.text1))

        # Accent underline
        div = tk.Frame(parent, bg=T_.divider, height=1)
        div.pack(fill="x", padx=16, pady=(0, 8))
        TM.subscribe(lambda t, w=div: w.configure(bg=t.divider))


class ModernEntry(ctk.CTkFrame):
    """
    Labeled input field with:
    • Animated focus border (1→2px, gray→accent color)
    • Currency prefix label
    • Theme-aware background
    """
    def __init__(self, parent, label: str = "", prefix: str = "", **kw):
        T_ = TM.T
        super().__init__(parent, fg_color="transparent")
        self._label_text = label
        if label:
            ctk.CTkLabel(self, text=label,
                         font=ctk.CTkFont(FS, 10, "normal"),
                         text_color=T_.text3,
                         anchor="w").pack(anchor="w", pady=(0, 2))
            TM.subscribe(lambda t, w=self.winfo_children()[-1]: w.configure(text_color=t.text3))

        self._row = ctk.CTkFrame(self,
                                  fg_color=T_.input_bg,
                                  border_color=T_.input_border,
                                  border_width=1,
                                  corner_radius=8)
        self._row.pack(fill="x")
        TM.subscribe(lambda t: self._row.configure(fg_color=t.input_bg, border_color=t.input_border))

        if prefix:
            ctk.CTkLabel(self._row, text=prefix,
                         font=ctk.CTkFont(FS, 11),
                         text_color=T_.text3,
                         width=26).pack(side="left", padx=(10, 0))

        self._var = tk.StringVar()
        self._entry = ctk.CTkEntry(self._row,
                                    textvariable=self._var,
                                    font=ctk.CTkFont(FS, 12),
                                    fg_color=T_.input_bg,
                                    text_color=T_.text1,
                                    border_width=0,
                                    corner_radius=0)
        self._entry.pack(side="left", fill="x", expand=True, padx=4, pady=7)
        self._entry.bind("<FocusIn>",  self._on_focus)
        self._entry.bind("<FocusOut>", self._on_blur)
        TM.subscribe(lambda t: self._entry.configure(fg_color=t.input_bg, text_color=t.text1))

    def _on_focus(self, _=None):
        self._row.configure(border_color=TM.T.input_focus, border_width=2)
    def _on_blur(self, _=None):
        self._row.configure(border_color=TM.T.input_border, border_width=1)

    def get(self) -> str: return self._var.get()
    def set(self, v: str): self._var.set(str(v) if v is not None else "")


class ModernCombo(ctk.CTkFrame):
    """Labeled combobox with optional flag canvas preview."""
    def __init__(self, parent, label: str = "", values: list = None,
                 width: int = 180, show_flags: bool = False, **kw):
        T_ = TM.T
        super().__init__(parent, fg_color="transparent")
        self._show_flags = show_flags
        if label:
            ctk.CTkLabel(self, text=label,
                         font=ctk.CTkFont(FS, 10),
                         text_color=T_.text3,
                         anchor="w").pack(anchor="w", pady=(0, 2))
        row = ctk.CTkFrame(self, fg_color=T_.input_bg,
                           border_color=T_.input_border,
                           border_width=1, corner_radius=8)
        row.pack(fill="x")
        self._row = row
        TM.subscribe(lambda t: row.configure(fg_color=t.input_bg, border_color=t.input_border))

        if show_flags:
            self._fc = tk.Canvas(row, width=44, height=28,
                                 bg=T_.input_bg, highlightthickness=0)
            self._fc.pack(side="left", padx=(8, 2), pady=6)
            TM.subscribe(lambda t: self._fc.configure(bg=t.input_bg))

        self._combo = ctk.CTkComboBox(row, values=values or [],
                                       font=ctk.CTkFont(FS, 12),
                                       fg_color=T_.input_bg,
                                       text_color=T_.text1,
                                       button_color=T_.border,
                                       border_width=0,
                                       corner_radius=0,
                                       width=width,
                                       command=self._on_change)
        self._combo.pack(side="left", fill="x", expand=True, padx=4, pady=6)
        if values: self._combo.set(values[0])
        TM.subscribe(lambda t: self._combo.configure(fg_color=t.input_bg,
                                                      text_color=t.text1,
                                                      button_color=t.border))
        if show_flags: self._update_flag()

    def _on_change(self, _=None):
        if self._show_flags: self._update_flag()

    def _update_flag(self):
        val = self._combo.get()
        self._fc.delete("all")
        self._fc.configure(bg=TM.T.input_bg)
        country = next((p for p in FLAG_DRAW_FN if p in val), None)
        if country: FLAG_DRAW_FN[country](self._fc, 3, 3, 38, 22)

    def get(self) -> str: return self._combo.get()
    def set(self, v: str):
        self._combo.set(v)
        if self._show_flags: self._update_flag()


class AccentButton(ctk.CTkButton):
    """Primary action button — Win11 blue with press animation."""
    _VARIANTS = {
        "primary": lambda t: dict(fg_color=t.accent, hover_color=t.accent_hover, text_color="#FFFFFF"),
        "ghost":   lambda t: dict(fg_color=t.btn_ghost_bg, hover_color=t.btn_ghost_hover,
                                   text_color=t.btn_ghost_fg, border_color=t.border, border_width=1),
        "danger":  lambda t: dict(fg_color=t.danger, hover_color="#E53935", text_color="#FFFFFF"),
        "success": lambda t: dict(fg_color=t.success, hover_color="#2E7D32", text_color="#FFFFFF"),
    }

    def __init__(self, parent, text: str, variant: str = "primary",
                 command: Callable = None, width: int = None, **kw):
        T_ = TM.T
        props = self._VARIANTS.get(variant, self._VARIANTS["primary"])(T_)
        extra = {"width": width} if width else {}
        super().__init__(parent, text=text,
                         font=ctk.CTkFont(FS, 12, "bold"),
                         corner_radius=8,
                         command=command,
                         **props, **extra, **kw)
        self._variant = variant
        TM.subscribe(lambda t: self.configure(**self._VARIANTS.get(variant, self._VARIANTS["primary"])(t)))


class NoteBox(ctk.CTkFrame):
    """Colored info/warning box with icon prefix."""
    def __init__(self, parent, text: str, icon: str = "ℹ", **kw):
        T_ = TM.T
        super().__init__(parent,
                         fg_color=T_.note_bg,
                         border_color=T_.note_border,
                         border_width=1,
                         corner_radius=8, **kw)
        self.pack(fill="x", padx=16, pady=(0, 8))
        row = ctk.CTkFrame(self, fg_color="transparent")
        row.pack(fill="x", padx=12, pady=10)
        ctk.CTkLabel(row, text=icon, font=ctk.CTkFont(FS, 13, "bold"),
                     text_color=T_.warning).pack(side="left", anchor="n", padx=(0, 10))
        ctk.CTkLabel(row, text=text, font=ctk.CTkFont(FS, 10),
                     text_color=T_.text2, wraplength=650,
                     justify="left", anchor="w").pack(side="left", fill="x", expand=True)
        TM.subscribe(lambda t: (self.configure(fg_color=t.note_bg, border_color=t.note_border)))


class ScrollableContent(ctk.CTkScrollableFrame):
    """Main scrollable content area with themed scrollbar."""
    def __init__(self, parent, **kw):
        T_ = TM.T
        super().__init__(parent, fg_color=T_.win_bg,
                         scrollbar_button_color=T_.scrollbar,
                         scrollbar_button_hover_color=T_.border,
                         corner_radius=0, **kw)
        TM.subscribe(lambda t: self.configure(fg_color=t.win_bg,
                     scrollbar_button_color=t.scrollbar,
                     scrollbar_button_hover_color=t.border))


class Tooltip:
    """Dark popup tooltip on hover."""
    def __init__(self, widget: tk.Widget, text: str):
        self._win = None
        widget.bind("<Enter>", lambda e: self._show(widget, text))
        widget.bind("<Leave>", lambda e: self._hide())

    def _show(self, w, text):
        self._hide()
        x = w.winfo_rootx() + 4
        y = w.winfo_rooty() + w.winfo_height() + 4
        self._win = tk.Toplevel(w)
        self._win.overrideredirect(True)
        self._win.attributes("-topmost", True)
        try: self._win.attributes("-alpha", 0.92)
        except: pass
        self._win.configure(bg=TM.T.title_bar)
        tk.Label(self._win, text=text, font=(FS, 9),
                 bg=TM.T.title_bar, fg="#FFFFFF",
                 padx=10, pady=5).pack()
        self._win.geometry(f"+{x}+{y}")

    def _hide(self):
        if self._win:
            try: self._win.destroy()
            except: pass
            self._win = None


# ═══════════════════════════════════════════════════════════
#  SECTION 10 — FLAG CANVAS HELPERS
# ═══════════════════════════════════════════════════════════
def _draw_flag_panama(cv, x, y, w=38, h=24):
    hw, hh = w//2, h//2
    cv.create_rectangle(x,y,x+hw,y+hh,fill="#FFFFFF",outline="")
    cv.create_rectangle(x+hw,y+hh,x+w,y+h,fill="#FFFFFF",outline="")
    cv.create_rectangle(x+hw,y,x+w,y+hh,fill="#D21034",outline="")
    cv.create_rectangle(x,y+hh,x+hw,y+h,fill="#003580",outline="")

def _draw_flag_colombia(cv, x, y, w=38, h=24):
    cv.create_rectangle(x,y,x+w,y+h*2//6,fill="#FCD116",outline="")
    cv.create_rectangle(x,y+h*2//6,x+w,y+h*4//6,fill="#003893",outline="")
    cv.create_rectangle(x,y+h*4//6,x+w,y+h,fill="#CE1126",outline="")

def _draw_flag_mexico(cv, x, y, w=38, h=24):
    t=w//3
    cv.create_rectangle(x,y,x+t,y+h,fill="#006847",outline="")
    cv.create_rectangle(x+t,y,x+2*t,y+h,fill="#FFFFFF",outline="")
    cv.create_rectangle(x+2*t,y,x+w,y+h,fill="#CE1126",outline="")

def _draw_flag_usa(cv, x, y, w=38, h=24):
    sh=h/13
    for i in range(13):
        cv.create_rectangle(x,y+i*sh,x+w,y+(i+1)*sh,
                            fill="#B22234" if i%2==0 else "#FFFFFF",outline="")
    cw,ch=w*0.4,h*7/13
    cv.create_rectangle(x,y,x+cw,y+ch,fill="#3C3B6E",outline="")

def _draw_flag_costa_rica(cv, x, y, w=38, h=24):
    bands=[("#002B7F",0.15),("#FFFFFF",0.175),("#CE1126",0.30),
           ("#FFFFFF",0.175),("#002B7F",0.20)]
    cy=y
    for col,frac in bands:
        bh=h*frac; cv.create_rectangle(x,cy,x+w,cy+bh,fill=col,outline=""); cy+=bh

def _draw_flag_peru(cv, x, y, w=38, h=24):
    bw=w//3
    cv.create_rectangle(x,y,x+bw,y+h,fill="#D91023",outline="")
    cv.create_rectangle(x+bw,y,x+bw*2,y+h,fill="#FFFFFF",outline="")
    cv.create_rectangle(x+bw*2,y,x+w,y+h,fill="#D91023",outline="")

FLAG_DRAW_FN = {
    "Panamá":    _draw_flag_panama,
    "Colombia":  _draw_flag_colombia,
    "México":    _draw_flag_mexico,
    "USA":       _draw_flag_usa,
    "Costa Rica":_draw_flag_costa_rica,
    "Perú":      _draw_flag_peru,
}


# ═══════════════════════════════════════════════════════════
#  SECTION 11 — SIDEBAR NAVIGATION
# ═══════════════════════════════════════════════════════════
# Step symbols (ASCII — safe on all platforms / PIL versions)
_STEP_SYMS = ["P", "G", "$", "H", "D", "L", "+", "R"]
_STEP_COLS = ["#0067C0","#7719AA","#107C10","#D83B01",
              "#C42B1C","#B06B00","#7719AA","#107C10"]

class Sidebar(ctk.CTkFrame):
    """
    210px fixed sidebar — Win11 Navigation Pane style.
    Logo area → section label → 8 step nav items → footer card.
    """
    def __init__(self, parent, on_step_click: Callable, **kw):
        T_ = TM.T
        super().__init__(parent, width=210, fg_color=T_.sidebar_bg,
                         border_color=T_.border, border_width=0,
                         corner_radius=0, **kw)
        self.pack_propagate(False)
        self._on_click = on_step_click
        self._items: list[ctk.CTkFrame] = []
        self._step = 0

        # ── Logo ──────────────────────────────────────────
        logo = ctk.CTkFrame(self, fg_color=T_.sidebar_bg, height=64, corner_radius=0)
        logo.pack(fill="x"); logo.pack_propagate(False)
        self._logo_frame = logo

        ico = _circle_icon(36, T_.accent, "#FFFFFF", "$", 0.48) if PIL_OK else None
        if ico:
            il = tk.Label(logo, image=ico, bg=T_.sidebar_bg)
            il._ico = ico; il.pack(side="left", padx=(14, 10), pady=14)
            self._logo_ico_lbl = il
            TM.subscribe(lambda t, w=il: w.configure(bg=t.sidebar_bg))

        txt = ctk.CTkFrame(logo, fg_color="transparent")
        txt.pack(side="left", fill="y", pady=12)
        self._name_lbl = ctk.CTkLabel(txt, text="Salary & Goals",
                                       font=ctk.CTkFont(FS, 14, "bold"),
                                       text_color=T_.text1, anchor="w")
        self._name_lbl.pack(anchor="w")
        self._sub_lbl = ctk.CTkLabel(txt, text="by Erick Perez",
                                      font=ctk.CTkFont(FS, 9),
                                      text_color=T_.text3, anchor="w")
        self._sub_lbl.pack(anchor="w")

        # Divider
        self._div = tk.Frame(self, bg=T_.border, height=1)
        self._div.pack(fill="x")

        # Section label
        self._steps_frame = ctk.CTkFrame(self, fg_color="transparent")
        self._steps_frame.pack(fill="x", pady=(4, 0))
        self._sec_lbl = ctk.CTkLabel(self._steps_frame, text="PASOS",
                                      font=ctk.CTkFont(FS, 8, "bold"),
                                      text_color=T_.text3, anchor="w")
        self._sec_lbl.pack(fill="x", padx=16, pady=(8, 4))

        # Footer card
        self._footer = ctk.CTkFrame(self, fg_color=T_.card_bg,
                                     border_color=T_.card_border,
                                     border_width=1, corner_radius=8)
        self._footer.pack(side="bottom", fill="x", padx=8, pady=8)
        self._ver_lbl = ctk.CTkLabel(self._footer, text="v2.0 Modern  •  2026",
                                      font=ctk.CTkFont(FS, 8),
                                      text_color=T_.text3)
        self._ver_lbl.pack(padx=10, pady=8)

        TM.subscribe(self._on_theme)

    def build_steps(self, step_names: list[str]):
        for w in self._items:
            try: w.destroy()
            except: pass
        self._items.clear()
        for i, name in enumerate(step_names):
            item = self._make_item(i, name)
            self._items.append(item)

    def _make_item(self, idx: int, name: str) -> ctk.CTkFrame:
        T_ = TM.T
        col = _STEP_COLS[idx % len(_STEP_COLS)]
        sym = _STEP_SYMS[idx % len(_STEP_SYMS)]

        f = ctk.CTkFrame(self._steps_frame, fg_color="transparent",
                          corner_radius=6, height=42, cursor="hand2")
        f.pack(fill="x", padx=8, pady=1)
        f.pack_propagate(False)

        # 3px left accent bar
        bar = tk.Frame(f, bg=T_.sidebar_bg, width=3)
        bar.pack(side="left", fill="y")

        inner = ctk.CTkFrame(f, fg_color="transparent")
        inner.pack(side="left", fill="both", expand=True, padx=(4, 8))

        row = ctk.CTkFrame(inner, fg_color="transparent")
        row.pack(fill="x", pady=(8, 0))

        # Badge icon
        ico = _pill_icon(26, 20, col, "#FFFFFF", sym) if PIL_OK else None
        if ico:
            il = tk.Label(row, image=ico, bg=T_.sidebar_bg)
            il._ico = ico; il.pack(side="left", padx=(2, 6))
        else:
            ctk.CTkLabel(row, text=sym, font=ctk.CTkFont(FS, 10, "bold"),
                         text_color="#FFFFFF", fg_color=col,
                         corner_radius=4, width=26, height=20).pack(side="left", padx=(2, 6))

        lbl = ctk.CTkLabel(row, text=name, font=ctk.CTkFont(FS, 11),
                           text_color=T_.text2, anchor="w")
        lbl.pack(side="left", fill="x", expand=True)

        item_data = {"frame": f, "bar": bar, "lbl": lbl, "inner": inner,
                     "ico_lbl": il if ico else None, "idx": idx}

        # Bind clicks and hover
        for w in [f, inner, row, lbl] + ([il] if ico else []):
            w.bind("<Button-1>", lambda e, i=idx: self._on_click(i))
            w.bind("<Enter>",    lambda e, d=item_data: self._hover(d, True))
            w.bind("<Leave>",    lambda e, d=item_data: self._hover(d, False))

        self._items.append(item_data)
        return item_data

    def _hover(self, d: dict, entering: bool):
        if d["idx"] == self._step: return
        T_ = TM.T
        bg = T_.nav_act_bg if entering else "transparent"
        d["frame"].configure(fg_color=bg)

    def update_step(self, step: int):
        self._step = step
        T_ = TM.T
        for i, d in enumerate(self._items):
            active = (i == step)
            done   = (i < step)
            d["frame"].configure(fg_color=T_.nav_act_bg if active else "transparent")
            d["bar"].configure(bg=T_.accent if active else T_.sidebar_bg)
            d["lbl"].configure(
                text_color=T_.nav_act_fg if active else (T_.text2 if done else T_.text3),
                font=ctk.CTkFont(FS, 11, "bold" if active else "normal"),
            )
            if d.get("ico_lbl"):
                bg = T_.nav_act_bg if active else T_.sidebar_bg
                d["ico_lbl"].configure(bg=bg)

    def _on_theme(self, t: DesignTokens):
        self.configure(fg_color=t.sidebar_bg)
        self._logo_frame.configure(fg_color=t.sidebar_bg)
        self._div.configure(bg=t.border)
        self._name_lbl.configure(text_color=t.text1)
        self._sub_lbl.configure(text_color=t.text3)
        self._sec_lbl.configure(text_color=t.text3)
        self._footer.configure(fg_color=t.card_bg, border_color=t.card_border)
        self._ver_lbl.configure(text_color=t.text3)
        self.update_step(self._step)


# ═══════════════════════════════════════════════════════════
#  SECTION 12 — PAGE HEADER  (fixed 64px)
# ═══════════════════════════════════════════════════════════
class PageHeader(ctk.CTkFrame):
    def __init__(self, parent, **kw):
        T_ = TM.T
        super().__init__(parent, height=64, fg_color=T_.header_bg,
                         corner_radius=0, **kw)
        self.pack_propagate(False)
        self._border = tk.Frame(self, bg=T_.border, height=1)
        self._border.pack(fill="x", side="bottom")
        inner = ctk.CTkFrame(self, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=24, pady=8)
        self._title = ctk.CTkLabel(inner, text="", font=ctk.CTkFont(FS, 18, "bold"),
                                    text_color=T_.text1, anchor="w")
        self._title.pack(anchor="w")
        self._sub   = ctk.CTkLabel(inner, text="", font=ctk.CTkFont(FS, 11),
                                    text_color=T_.text3, anchor="w")
        self._sub.pack(anchor="w")
        self._flag_cv = tk.Canvas(inner, width=44, height=26,
                                   bg=T_.header_bg, highlightthickness=0)
        self._flag_cv.place(relx=1.0, rely=0.5, anchor="e", x=-8)
        TM.subscribe(self._on_theme)

    def set(self, title: str, sub: str = "", pais: str = ""):
        self._title.configure(text=title)
        self._sub.configure(text=sub)
        self._flag_cv.delete("all")
        self._flag_cv.configure(bg=TM.T.header_bg)
        if pais and pais in FLAG_DRAW_FN:
            FLAG_DRAW_FN[pais](self._flag_cv, 2, 2, 40, 22)

    def _on_theme(self, t: DesignTokens):
        self.configure(fg_color=t.header_bg)
        self._border.configure(bg=t.border)
        self._title.configure(text_color=t.text1)
        self._sub.configure(text_color=t.text3)
        self._flag_cv.configure(bg=t.header_bg)


# ═══════════════════════════════════════════════════════════
#  SECTION 13 — STEP BREADCRUMB BAR
# ═══════════════════════════════════════════════════════════
class StepBar(ctk.CTkFrame):
    """Horizontal pip breadcrumb above content."""
    def __init__(self, parent, **kw):
        T_ = TM.T
        super().__init__(parent, height=38, fg_color=T_.header_bg,
                         corner_radius=0, **kw)
        self.pack_propagate(False)
        self._pips: list = []
        self._lines: list = []
        self._inner = ctk.CTkFrame(self, fg_color="transparent")
        self._inner.place(relx=0.5, rely=0.5, anchor="center")
        TM.subscribe(lambda t: self.configure(fg_color=t.header_bg))

    def build(self, names: list[str]):
        for w in self._inner.winfo_children(): w.destroy()
        self._pips.clear(); self._lines.clear()
        for i, _ in enumerate(names):
            if i > 0:
                ln = tk.Frame(self._inner, bg=TM.T.border, height=1, width=16)
                ln.pack(side="left", anchor="center")
                self._lines.append(ln)
            ico = _circle_icon(18, TM.T.step_pend, "#FFFFFF", str(i+1), 0.42) if PIL_OK else None
            if ico:
                lbl = tk.Label(self._inner, image=ico, bg=TM.T.header_bg)
                lbl._ico = ico
            else:
                lbl = tk.Label(self._inner, text=str(i+1), width=3,
                               bg=TM.T.step_pend, fg="#FFFFFF",
                               font=(FS, 7, "bold"))
            lbl.pack(side="left", padx=2)
            self._pips.append(lbl)

    def update_step(self, step: int):
        T_ = TM.T
        for i, pip in enumerate(self._pips):
            state = "active" if i == step else ("done" if i < step else "pending")
            col = {"active": T_.step_act, "done": T_.step_done, "pending": T_.step_pend}[state]
            sym = "✓" if state == "done" else str(i + 1)
            if PIL_OK:
                ico = _circle_icon(18, col, "#FFFFFF", sym, 0.42)
                pip.configure(image=ico, bg=T_.header_bg); pip._ico = ico
            else:
                pip.configure(bg=col)
        for i, ln in enumerate(self._lines):
            ln.configure(bg=T_.step_done if i < step else T_.border)


# ═══════════════════════════════════════════════════════════
#  SECTION 14 — STATUS BAR
# ═══════════════════════════════════════════════════════════
class StatusBar(ctk.CTkFrame):
    """30px bottom bar — status message left, clock right."""
    def __init__(self, parent, **kw):
        T_ = TM.T
        super().__init__(parent, height=30, fg_color=T_.status_bg,
                         corner_radius=0, **kw)
        self.pack_propagate(False)
        self._top_border = tk.Frame(self, bg=T_.status_border, height=1)
        self._top_border.pack(fill="x", side="top")
        self._msg_lbl = ctk.CTkLabel(self, text="", font=ctk.CTkFont(MONO, 9),
                                      text_color=T_.text3, anchor="w")
        self._msg_lbl.pack(side="left", padx=16)
        self._clk_lbl = ctk.CTkLabel(self, text="", font=ctk.CTkFont(MONO, 9),
                                      text_color=T_.text3, anchor="e")
        self._clk_lbl.pack(side="right", padx=16)
        self._tick()
        TM.subscribe(self._on_theme)

    def set_status(self, msg: str):
        self._msg_lbl.configure(text=msg)

    def _tick(self):
        self._clk_lbl.configure(text=time.strftime("%H:%M:%S"))
        self.after(1000, self._tick)

    def _on_theme(self, t: DesignTokens):
        self.configure(fg_color=t.status_bg)
        self._top_border.configure(bg=t.status_border)
        self._msg_lbl.configure(text_color=t.text3)
        self._clk_lbl.configure(text_color=t.text3)


# ═══════════════════════════════════════════════════════════
#  SECTION 15 — PROGRESS RING HELPER (canvas draw)
# ═══════════════════════════════════════════════════════════
def draw_progress_ring(cv: tk.Canvas, cx: int, cy: int, r: int,
                       pct: float, fg: str, bg: str, width: int = 10):
    cv.create_oval(cx-r, cy-r, cx+r, cy+r, outline=bg, width=width)
    if pct > 0:
        cv.create_arc(cx-r, cy-r, cx+r, cy+r,
                      start=90, extent=-min(pct, 1.0) * 359.9,
                      style="arc", outline=fg, width=width)


# ═══════════════════════════════════════════════════════════
#  SECTION 16 — MAIN APPLICATION
# ═══════════════════════════════════════════════════════════
class CalcApp(ctk.CTkFrame):
    """
    Root window.
    Orchestrates: Sidebar, PageHeader, StepBar, step builders, NavBar, StatusBar.
    All calculator state lives in self._datos (dict).
    """

    def __init__(self, root: ctk.CTk):
        global _LANG
        # Load preferences
        prefs = _load_prefs()
        _LANG = prefs.get("lang", "es")
        dark  = prefs.get("dark", False)

        # super().__init__ MUST come before any ctk calls (set_appearance_mode etc.)
        super().__init__(root, fg_color=DARK.win_bg if dark else LIGHT.win_bg, corner_radius=0)
        self.root = root          # keep reference for window-level calls
        self.pack(fill="both", expand=True)

        # Now safe to set theme — CTkFrame is initialized
        TM.set_theme(dark)

        self._step   = 0
        self._datos: dict = {}
        self._fields: dict = {}

        self._setup_window()
        self._build_chrome()
        self._show_step(0)

    # ── Window setup ──────────────────────────────────────
    def _setup_window(self):
        # All window-level calls go through self.root (the ctk.CTk instance)
        self.root.title(T("app_title"))
        self.root.resizable(True, True)
        self.root.minsize(880, 620)
        ctk.set_default_color_theme("blue")
        self.configure(fg_color=TM.T.win_bg)
        TM.subscribe(lambda t: self.configure(fg_color=t.win_bg))
        TM.subscribe(lambda t: self.root.configure(fg_color=t.win_bg))

        # Icon
        try:
            ico_path = os.path.join(
                getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__))),
                "assets", "icon.ico")
            if os.path.isfile(ico_path): self.root.iconbitmap(ico_path)
        except Exception: pass

    # ── Chrome ────────────────────────────────────────────
    def _build_chrome(self):
        T_ = TM.T

        # Title bar (always dark)
        self._tb = tk.Frame(self, bg=T_.title_bar, height=42)
        self._tb.pack(fill="x"); self._tb.pack_propagate(False)
        TM.subscribe(lambda t: self._tb.configure(bg=t.title_bar))

        # Left: icon + title
        left = tk.Frame(self._tb, bg=T_.title_bar)
        left.pack(side="left", fill="y", padx=(14, 0))
        TM.subscribe(lambda t: left.configure(bg=t.title_bar))

        ico = _circle_icon(24, T_.accent, "#FFFFFF", "$", 0.48) if PIL_OK else None
        if ico:
            il = tk.Label(left, image=ico, bg=T_.title_bar); il._ico = ico
            il.pack(side="left", padx=(0, 10), pady=9)
            TM.subscribe(lambda t, w=il: w.configure(bg=t.title_bar))

        self._tb_lbl = tk.Label(left, text=T("app_title"),
                                 font=(FS, 9, "bold"),
                                 bg=T_.title_bar, fg=T_.title_fg)
        self._tb_lbl.pack(side="left")
        TM.subscribe(lambda t: self._tb_lbl.configure(bg=t.title_bar, fg=t.title_fg))

        # Right: controls
        right = tk.Frame(self._tb, bg=T_.title_bar)
        right.pack(side="right", padx=12)
        TM.subscribe(lambda t: right.configure(bg=t.title_bar))

        self._theme_btn = self._tb_btn(right, T("dark_mode"), self._toggle_theme)
        self._save_btn  = self._tb_btn(right, T("save_session"), self._save_dialog)
        self._load_btn  = self._tb_btn(right, T("load_session"), self._load_dialog)
        self._btn_es    = self._tb_btn(right, "ES", lambda: self._change_lang("es"), accent=True)
        self._btn_en    = self._tb_btn(right, "EN", lambda: self._change_lang("en"))
        self._update_lang_btns()
        TM.subscribe(lambda t: self._update_lang_btns())

        # Body
        body = tk.Frame(self, bg=T_.win_bg)
        body.pack(fill="both", expand=True)
        TM.subscribe(lambda t: body.configure(bg=t.win_bg))

        # Sidebar
        self._sidebar = Sidebar(body, on_step_click=self._sidebar_click)
        self._sidebar.pack(side="left", fill="y")

        # Sidebar / content divider
        self._sb_div = tk.Frame(body, bg=T_.border, width=1)
        self._sb_div.pack(side="left", fill="y")
        TM.subscribe(lambda t: self._sb_div.configure(bg=t.border))

        # Right panel
        rp = tk.Frame(body, bg=T_.win_bg)
        rp.pack(side="left", fill="both", expand=True)
        TM.subscribe(lambda t: rp.configure(bg=t.win_bg))

        # Page header
        self._header = PageHeader(rp)
        self._header.pack(fill="x")

        # Step pip breadcrumb
        self._stepbar = StepBar(rp)
        self._stepbar.pack(fill="x")
        sep = tk.Frame(rp, bg=T_.border, height=1)
        sep.pack(fill="x")
        TM.subscribe(lambda t, w=sep: w.configure(bg=t.border))

        # Content area
        self.content = tk.Frame(rp, bg=T_.win_bg)
        self.content.pack(fill="both", expand=True)
        TM.subscribe(lambda t: self.content.configure(bg=t.win_bg))

        # Navigation bar (bottom)
        self._nav = ctk.CTkFrame(rp, height=58, fg_color=T_.header_bg,
                                  border_color=T_.border, border_width=1,
                                  corner_radius=0)
        self._nav.pack(fill="x", side="bottom")
        self._nav.pack_propagate(False)
        TM.subscribe(lambda t: self._nav.configure(fg_color=t.header_bg, border_color=t.border))

        self.btn_back = AccentButton(self._nav, text=T("back"), variant="ghost",
                                      command=self._prev_step)
        self.btn_back.pack(side="left", padx=16, pady=12)

        self.lbl_step = ctk.CTkLabel(self._nav, text=T("step_of", s=1, t=8),
                                      font=ctk.CTkFont(FS, 10),
                                      text_color=T_.text3)
        self.lbl_step.pack(side="left", expand=True)
        TM.subscribe(lambda t: self.lbl_step.configure(text_color=t.text3))

        self.btn_next = AccentButton(self._nav, text=T("next"), variant="primary",
                                      command=self._next_step)
        self.btn_next.pack(side="right", padx=16, pady=12)

        # Status bar
        self._status = StatusBar(rp)
        self._status.pack(fill="x", side="bottom")

        # Build sidebar steps
        self._sidebar.build_steps(T("steps"))
        self._stepbar.build(T("steps"))

    def _tb_btn(self, parent, text: str, cmd: Callable, accent: bool = False) -> tk.Button:
        T_ = TM.T
        bg  = T_.accent if accent else "#333333"
        fg  = "#FFFFFF"
        b   = tk.Button(parent, text=text, font=(FS, 8),
                        bg=bg, fg=fg, relief="flat",
                        padx=8, pady=4, cursor="hand2",
                        bd=0, highlightthickness=0, command=cmd)
        b.pack(side="left", padx=2)
        hover = T_.accent_hover if accent else "#444444"
        b.bind("<Enter>", lambda _, w=b, h=hover: w.configure(bg=h))
        b.bind("<Leave>", lambda _, w=b, bg_=bg: w.configure(bg=bg_))
        return b

    def _update_lang_btns(self):
        T_ = TM.T
        for btn, lng in [(self._btn_es, "es"), (self._btn_en, "en")]:
            active = (_LANG == lng)
            btn.configure(bg=T_.accent if active else "#333333",
                          fg="#FFFFFF")

    def _change_lang(self, lang: str):
        global _LANG
        _LANG = lang
        _save_prefs({**_load_prefs(), "lang": lang})
        self._tb_lbl.configure(text=T("app_title"))
        self._update_lang_btns()
        self._sidebar.build_steps(T("steps"))
        self._stepbar.build(T("steps"))
        self._show_step(self._step)
        self._status.set_status(f"Language: {lang.upper()}")

    def _toggle_theme(self):
        TM.toggle()
        _save_prefs({**_load_prefs(), "dark": TM.is_dark})
        icon = T("dark_mode") if not TM.is_dark else T("light_mode")
        self._theme_btn.configure(text=icon)

    def _sidebar_click(self, step: int):
        if step <= self._step:
            self._save_step(self._step)
            self._show_step(step)

    # ── Step navigation ───────────────────────────────────
    def _show_step(self, step: int):
        self._step = step
        steps = T("steps")
        self._sidebar.update_step(step)
        self._stepbar.update_step(step)
        self.lbl_step.configure(text=T("step_of", s=step+1, t=8))
        self.btn_back.configure(state="normal" if step > 0 else "disabled")
        if step == 7:
            self.btn_next.configure(text=T("new_query"), command=self._reset)
        else:
            self.btn_next.configure(text=T("next"), command=self._next_step)

        for w in self.content.winfo_children():
            try: w.destroy()
            except: pass

        builders = [self._step_perfil, self._step_meta, self._step_ingresos,
                    self._step_hogar,  self._step_deudas_auto, self._step_ocio,
                    self._step_extras, self._step_resultado]
        builders[step]()
        self._status.set_status(f"{steps[step]}  •  {T('step_of', s=step+1, t=8)}")

    def _next_step(self):
        if not self._validate(self._step): return
        self._save_step(self._step)
        if self._step < 7: self._show_step(self._step + 1)

    def _prev_step(self):
        self._save_step(self._step)
        if self._step > 0: self._show_step(self._step - 1)

    def _reset(self):
        self._datos = {};  self._fields = {}
        self._show_step(0)

    # ── Validation ────────────────────────────────────────
    def _validate(self, step: int) -> bool:
        f = self._fields
        def _v(k):
            try: return max(0.0, float(f[k].get().replace(",", ".")))
            except: return 0.0
        if step == 0:
            if not f.get("nombre") or not f["nombre"].get().strip():
                messagebox.showwarning("", T("req_name")); return False
        elif step == 1:
            try:
                if float(f["meta"].get().replace(",", ".")) <= 0: raise ValueError()
            except: messagebox.showwarning("", T("req_meta")); return False
            try:
                if int(f["anio"].get()) < 2024: raise ValueError()
            except: messagebox.showwarning("", T("req_anio")); return False
        elif step == 2:
            try:
                if float(f["salario"].get().replace(",", ".")) <= 0: raise ValueError()
            except: messagebox.showwarning("", T("req_salary")); return False
        return True

    # ── Data save ─────────────────────────────────────────
    def _save_step(self, step: int):
        d = self._datos;  f = self._fields
        def _n(k): return f[k].get().strip() if k in f else d.get(k, "")
        def _v(k):
            try: return max(0.0, float(f[k].get().replace(",", ".")))
            except: return 0.0

        if step == 0:
            d["nombre"] = _n("nombre")
            raw = f["pais"].get() if "pais" in f else ""
            d["pais"] = next((p for p in PAISES if p in raw), "Panamá")
        elif step == 1:
            try: d["meta"] = float(f["meta"].get().replace(",", "."))
            except: pass
            months = T("months")
            if "mes" in f:
                mv = f["mes"].get()
                d["mes_num"] = months.index(mv) + 1 if mv in months else 11
            try: d["anio_meta"] = int(f["anio"].get())
            except: pass
        elif step == 2:
            try: d["salario"] = float(f["salario"].get().replace(",", "."))
            except: pass
            d["salario_real"]  = _v("salario_real")
            d["ingreso_extra"] = _v("ingreso_extra")
        elif step == 3:
            for k in ["alquiler", "internet", "luz", "agua", "data_movil"]: d[k] = _v(k)
        elif step == 4:
            for k in ["prestamo_personal", "prestamo_auto", "deudas",
                      "gasolina", "mantenimiento_auto",
                      "mascota_comida", "mascota_vet", "mascota_otros"]: d[k] = _v(k)
        elif step == 5:
            for k in ["comida", "salidas", "delivery",
                      "apple_one", "netflix", "hbo", "disney"]: d[k] = _v(k)
        elif step == 6:
            extras = []
            for i in range(3):
                amt  = f.get(f"extra_m_{i}")
                desc = f.get(f"extra_d_{i}")
                if amt and desc:
                    try: extras.append({"monto": float(amt.get().replace(",", ".")), "desc": desc.get().strip()})
                    except: extras.append({"monto": 0, "desc": desc.get().strip()})
            d["gastos_extra"] = extras

    # ── Scrollable helper ─────────────────────────────────
    def _scrollable(self) -> ScrollableContent:
        sf = ScrollableContent(self.content)
        sf.pack(fill="both", expand=True)
        return sf

    # ── Grid entry helper ─────────────────────────────────
    def _grid_entry(self, parent, key: str, label: str, prefix: str,
                    row: int, col: int, padx=(0, 12)) -> ModernEntry:
        e = ModernEntry(parent, label=label, prefix=prefix)
        e.grid(row=row, column=col, sticky="ew",
               padx=padx if col == 0 else (0, 0), pady=6)
        e.set(str(self._datos.get(key, "")))
        self._fields[key] = e
        return e

    # ── Step builders ─────────────────────────────────────

    # STEP 0 — PROFILE
    def _step_perfil(self):
        f = self._scrollable()
        pais = self._datos.get("pais", "Panamá")
        self._header.set(T("p0_title"), T("p0_sub"), pais)

        c = Card(f); g = c.inner()
        SectionHeader(c, T("p0_title"), "P")
        g.columnconfigure(0, weight=1); g.columnconfigure(1, weight=1)

        nom = ModernEntry(g, label=T("p0_name"), prefix="")
        nom.grid(row=0, column=0, sticky="ew", padx=(0, 12), pady=6)
        nom.set(self._datos.get("nombre", ""))
        self._fields["nombre"] = nom

        pais_list = [f"{PAISES[p]['flag']} {p}" for p in PAISES]
        pw = ModernCombo(g, label=T("p0_country"), values=pais_list,
                         show_flags=True, width=220)
        saved = self._datos.get("pais", "Panamá")
        match = next((o for o in pais_list if saved in o), pais_list[0])
        pw.set(match)
        pw.grid(row=0, column=1, sticky="ew", pady=6)
        self._fields["pais"] = pw

        # Country pills
        T_ = TM.T
        pills = ctk.CTkFrame(c, fg_color="transparent")
        pills.pack(fill="x", padx=16, pady=(0, 8))
        for txt, col in [("Panama", T_.tag_blue), ("Colombia", T_.tag_green),
                          ("Mexico", T_.tag_red),  ("USA", T_.tag_purple),
                          ("Costa Rica", T_.tag_orange), ("Peru", T_.tag_blue)]:
            ctk.CTkLabel(pills, text=f"  {txt}  ", font=ctk.CTkFont(FS, 8, "bold"),
                         text_color="#FFFFFF", fg_color=col, corner_radius=8,
                         ).pack(side="left", padx=3)

        NoteBox(c, T("p0_note"), "🌎")

    # STEP 1 — GOAL
    def _step_meta(self):
        f = self._scrollable()
        pais = self._datos.get("pais", "Panamá"); sym = get_sym(pais)
        self._header.set(T("p1_title"), T("p1_sub"), pais)

        c = Card(f); g = c.inner()
        SectionHeader(c, T("p1_title"), "G")
        g.columnconfigure(0, weight=2); g.columnconfigure(1, weight=1); g.columnconfigure(2, weight=1)

        meta_e = ModernEntry(g, label=T("p1_meta"), prefix=sym)
        meta_e.grid(row=0, column=0, sticky="ew", padx=(0, 12), pady=6)
        meta_e.set(str(self._datos.get("meta", "")))
        self._fields["meta"] = meta_e

        months = T("months")
        mes_c = ModernCombo(g, label=T("p1_month"), values=months, width=130)
        mes_c.set(months[self._datos.get("mes_num", 11) - 1])
        mes_c.grid(row=0, column=1, sticky="ew", padx=(0, 12), pady=6)
        self._fields["mes"] = mes_c

        anio_e = ModernEntry(g, label=T("p1_year"), prefix="")
        anio_e.grid(row=0, column=2, sticky="ew", pady=6)
        anio_e.set(str(self._datos.get("anio_meta", "2027")))
        self._fields["anio"] = anio_e

        tip = Card(f, pady=4)
        ctk.CTkLabel(tip, text=f"💡  {T('p1_tip')}",
                     font=ctk.CTkFont(FS, 10), text_color=TM.T.text2,
                     wraplength=780, justify="left", anchor="w"
                     ).pack(padx=16, pady=12, anchor="w")
        TM.subscribe(lambda t, w=tip.winfo_children()[-1] if tip.winfo_children() else tip:
                     True)  # tip auto-subscribes via Card

    # STEP 2 — INCOME
    def _step_ingresos(self):
        f = self._scrollable()
        pais = self._datos.get("pais", "Panamá"); sym = get_sym(pais)
        nombre = self._datos.get("nombre", "")
        self._header.set(T("p2_title", nombre=nombre), T("p2_sub", pais=pais), pais)

        c = Card(f); g = c.inner()
        SectionHeader(c, T("p2_title", nombre=nombre), "$")
        g.columnconfigure(0, weight=1); g.columnconfigure(1, weight=1); g.columnconfigure(2, weight=1)

        for col, (k, lk) in enumerate([
            ("salario",       "p2_gross"),
            ("salario_real",  "p2_real"),
            ("ingreso_extra", "p2_extra"),
        ]):
            e = ModernEntry(g, label=T(lk), prefix=sym)
            e.grid(row=0, column=col, sticky="ew",
                   padx=(0, 12) if col < 2 else 0, pady=6)
            e.set(str(self._datos.get(k, "")))
            self._fields[k] = e

        NoteBox(c, T("p2_note"), "ℹ")

        # Tax preview card
        sal = self._datos.get("salario", 0)
        if sal > 0:
            imp = PAISES[pais]["calcular"](sal)
            tax_c = Card(f, pady=4)
            SectionHeader(tax_c, T("p2_imp_title", pais=pais), "D")
            for name, amt in imp["detalle"]:
                self._result_row(tax_c, name, f_v(amt, pais), TM.T.danger, None)
            self._divider(tax_c)
            self._result_row(tax_c, T("p7_net_est"),
                             f_v(imp["salario_neto"], pais), TM.T.success, None)

    # STEP 3 — HOME
    def _step_hogar(self):
        f = self._scrollable()
        pais = self._datos.get("pais", "Panamá"); sym = get_sym(pais)
        self._header.set(T("p3_title"), T("p3_sub"), pais)
        c = Card(f); g = c.inner()
        SectionHeader(c, T("p3_title"), "H")
        g.columnconfigure(0, weight=1); g.columnconfigure(1, weight=1)
        for i, (k, lk) in enumerate([
            ("alquiler",   "p3_rent"),    ("internet",   "p3_internet"),
            ("luz",        "p3_electric"),("agua",       "p3_water"),
            ("data_movil", "p3_mobile"),
        ]):
            e = ModernEntry(g, label=T(lk), prefix=sym)
            e.grid(row=i//2, column=i%2, sticky="ew",
                   padx=(0, 12) if i%2 == 0 else 0, pady=6)
            e.set(str(self._datos.get(k, ""))); self._fields[k] = e

    # STEP 4 — DEBTS / CAR / PETS
    def _step_deudas_auto(self):
        f = self._scrollable()
        pais = self._datos.get("pais", "Panamá"); sym = get_sym(pais)
        self._header.set(T("p4_title"), T("p4_sub"), pais)
        for sec, sym_icon, fields in [
            (T("p4_s1"), "D", [("prestamo_personal","p4_loan_p"),
                               ("prestamo_auto","p4_loan_a"),("deudas","p4_debts")]),
            (T("p4_s2"), "C", [("gasolina","p4_gas"),("mantenimiento_auto","p4_maint")]),
            (T("p4_s3"), "~", [("mascota_comida","p4_pet_food"),
                               ("mascota_vet","p4_pet_vet"),("mascota_otros","p4_pet_other")]),
        ]:
            c = Card(f, pady=6); g = c.inner()
            SectionHeader(c, sec, sym_icon)
            g.columnconfigure(0, weight=1); g.columnconfigure(1, weight=1)
            for i, (k, lk) in enumerate(fields):
                e = ModernEntry(g, label=T(lk), prefix=sym)
                e.grid(row=i//2, column=i%2, sticky="ew",
                       padx=(0, 12) if i%2 == 0 else 0, pady=6)
                e.set(str(self._datos.get(k, ""))); self._fields[k] = e

    # STEP 5 — LEISURE
    def _step_ocio(self):
        f = self._scrollable()
        pais = self._datos.get("pais", "Panamá"); sym = get_sym(pais)
        self._header.set(T("p5_title"), T("p5_sub"), pais)
        for sec, sym_icon, fields in [
            (T("p5_s1"), "L", [("comida","p5_grocery"),("salidas","p5_out"),("delivery","p5_delivery")]),
            (T("p5_s2"), "@", [("apple_one","Apple One"),("netflix","Netflix"),
                               ("hbo","HBO Max"),("disney","Disney+")]),
        ]:
            c = Card(f, pady=6); g = c.inner()
            SectionHeader(c, sec, sym_icon)
            g.columnconfigure(0, weight=1); g.columnconfigure(1, weight=1)
            for i, (k, lk) in enumerate(fields):
                lbl = T(lk) if lk in LANGS["es"] else lk
                e = ModernEntry(g, label=lbl, prefix=sym)
                e.grid(row=i//2, column=i%2, sticky="ew",
                       padx=(0, 12) if i%2 == 0 else 0, pady=6)
                e.set(str(self._datos.get(k, ""))); self._fields[k] = e

    # STEP 6 — EXTRAS
    def _step_extras(self):
        f = self._scrollable()
        pais = self._datos.get("pais", "Panamá"); sym = get_sym(pais)
        self._header.set(T("p6_title"), T("p6_sub"), pais)
        c = Card(f)
        SectionHeader(c, T("p6_title"), "+")
        extras = self._datos.get("gastos_extra", [{} for _ in range(3)])
        while len(extras) < 3: extras.append({})
        for i in range(3):
            row = ctk.CTkFrame(c, fg_color="transparent")
            row.pack(fill="x", padx=16, pady=4)
            row.columnconfigure(0, weight=1); row.columnconfigure(1, weight=2)
            me = ModernEntry(row, label=T("p6_extra", n=i+1), prefix=sym)
            me.grid(row=0, column=0, sticky="ew", padx=(0, 12))
            me.set(str(extras[i].get("monto", "")))
            self._fields[f"extra_m_{i}"] = me
            de = ModernEntry(row, label=T("p6_desc"), prefix="")
            de.grid(row=0, column=1, sticky="ew")
            de.set(extras[i].get("desc", ""))
            self._fields[f"extra_d_{i}"] = de
        self._divider(c)
        ctk.CTkLabel(c, text=T("p6_hint"),
                     font=ctk.CTkFont(FS, 9), text_color=TM.T.text3,
                     ).pack(padx=16, pady=(0, 12), anchor="w")
        TM.subscribe(lambda t, w=c.winfo_children()[-1] if c.winfo_children() else c:
                     True)

    # STEP 7 — RESULTS
    def _step_resultado(self):
        self._save_step(6)
        d = self._datos
        pais = d.get("pais", "Panamá")
        cfg  = PAISES.get(pais, PAISES["Panamá"])
        sym  = cfg["simbolo"]
        imp  = cfg["calcular"](d.get("salario", 0))
        d["impuestos"] = imp

        sal_real = d.get("salario_real", 0)
        sal_base = sal_real if sal_real > 0 else imp["salario_neto"]
        d["salario_neto"]   = sal_base
        d["total_ingresos"] = sal_base + d.get("ingreso_extra", 0)

        total_g = sum(d.get(k, 0) for k in [
            "alquiler","internet","luz","agua","data_movil",
            "prestamo_personal","prestamo_auto","deudas",
            "gasolina","mantenimiento_auto",
            "mascota_comida","mascota_vet","mascota_otros",
            "comida","salidas","delivery",
            "apple_one","netflix","hbo","disney",
        ]) + sum(g.get("monto", 0) for g in d.get("gastos_extra", []))
        d["total_gastos"]   = total_g
        d["ahorro_mensual"] = d["total_ingresos"] - total_g

        meses_r = calcular_meses(d.get("anio_meta", 2027), d.get("mes_num", 11))
        d["meses_restantes"] = meses_r
        meta    = d.get("meta", 0)
        nec_mes = meta / meses_r if meses_r > 0 else 0
        proyecc = max(d["ahorro_mensual"], 0) * meses_r
        ahorro  = d["ahorro_mensual"]
        months  = T("months")
        mes_n   = months[d.get("mes_num", 11) - 1]
        fmt_v   = lambda v: f_v(v, pais)

        T_ = TM.T
        SU = T_.success;  DA = T_.danger;  WA = T_.warning;  AC = T_.accent

        f = self._scrollable()
        self._header.set(T("p7_title", nombre=d.get("nombre", "")),
                         T("p7_sub", pais=pais, sym=sym, meta=meta,
                           mes=mes_n, anio=d.get("anio_meta", 2027)), pais)

        # ── Status banner ──────────────────────────────────
        if ahorro <= 0:
            bg_c=T_.danger_bg; fg_c=DA; pfx="✗"; bm=T("p7_deficit",sym=sym,amt=abs(ahorro))
        elif proyecc >= meta:
            bg_c=T_.success_bg; fg_c=SU; pfx="✓"; bm=T("p7_ontrack",sym=sym,amt=ahorro,
                                                          mes=mes_n,anio=d.get("anio_meta",2027))
        else:
            bg_c=T_.warning_bg; fg_c=WA; pfx="⚡"; bm=T("p7_need",sym=sym,amt=ahorro,
                                                          falta=nec_mes-ahorro)

        banner = ctk.CTkFrame(f, fg_color=bg_c, corner_radius=10,
                               border_color=fg_c, border_width=2)
        banner.pack(fill="x", padx=20, pady=(4, 12))
        ctk.CTkLabel(banner, text=f"  {pfx}  {bm}",
                     font=ctk.CTkFont(FS, 12, "bold"),
                     text_color=fg_c, anchor="w",
                     wraplength=800).pack(fill="x", padx=16, pady=12)

        # ── Summary ring + stats ───────────────────────────
        sc = Card(f, pady=6)
        SectionHeader(sc, T("p7_summary"), "=")
        ring_row = ctk.CTkFrame(sc, fg_color="transparent")
        ring_row.pack(fill="x", padx=16, pady=(0, 12))

        ring_cv = tk.Canvas(ring_row, width=100, height=100,
                            bg=T_.card_bg, highlightthickness=0)
        ring_cv.pack(side="left", padx=(0, 24))
        TM.subscribe(lambda t, w=ring_cv: w.configure(bg=t.card_bg))

        pct = max(0, min(ahorro / d["total_ingresos"], 1.0)) if d["total_ingresos"] > 0 else 0
        rc  = SU if ahorro >= 0 else DA
        draw_progress_ring(ring_cv, 50, 50, 40, pct, rc, T_.progress_bg, 10)
        ring_cv.create_text(50, 50, text=f"{int(pct*100)}%",
                            font=(FS, 14, "bold"), fill=rc)
        ring_cv.create_text(50, 67, text=T("p7_saving")[:8],
                            font=(FS, 7), fill=T_.text3)

        stats = ctk.CTkFrame(ring_row, fg_color="transparent")
        stats.pack(side="left", fill="x", expand=True)
        for lbl, amt, col in [
            (T("p7_tot_inc"), d["total_ingresos"], SU),
            (T("p7_tot_exp"), d["total_gastos"],   DA),
            (T("p7_saving"),  abs(ahorro),          SU if ahorro >= 0 else DA),
        ]:
            r = ctk.CTkFrame(stats, fg_color="transparent")
            r.pack(fill="x", pady=3)
            ctk.CTkLabel(r, text=lbl, font=ctk.CTkFont(FS, 11),
                         text_color=T_.text2, anchor="w").pack(side="left")
            ctk.CTkLabel(r, text=fmt_v(amt), font=ctk.CTkFont(FS, 12, "bold"),
                         text_color=col, anchor="e").pack(side="right")
        self._divider(sc)

        # ── Expense detail cards ───────────────────────────
        def res_card(title, rows, sym_icon=""):
            c2 = Card(f, pady=6)
            SectionHeader(c2, title, sym_icon)
            for row_item in rows:
                lbl, amt, col = row_item[0], row_item[1], row_item[2]
                detail = row_item[3] if len(row_item) > 3 else None
                if amt == 0: continue
                self._result_row(c2, lbl, fmt_v(amt), col, detail)
            self._divider(c2)

        imp_detail = [(n, fmt_v(m)) for n, m in imp["detalle"]]
        imp_rows = [(n, m, DA, imp_detail) for n, m in imp["detalle"]]
        imp_rows += [(T("p7_total_ded"), imp["total_imp"], DA, imp_detail)]
        if sal_real > 0:
            imp_rows += [(T("p7_net_est"),  imp["salario_neto"], AC, None),
                         (T("p7_net_real"), sal_real,             SU, None)]
        else:
            imp_rows += [(T("p7_net_est"), imp["salario_neto"], SU, None)]
        res_card(T("p7_salary_imp"), imp_rows, "$")
        NoteBox(Card(f, pady=4), T("p7_imp_note"), "⚠")
        res_card(T("p7_income"),
                 [(T("p7_net_base"),  sal_base,                T_.text1, None),
                  (T("p7_extra_inc"), d.get("ingreso_extra",0),AC,       None),
                  (T("p7_total_inc"), d["total_ingresos"],      SU,       None)], "$")
        res_card(T("p7_home"),
                 [(T("p7_rent"),    d.get("alquiler",0),   T_.text2, None),
                  ("Internet",      d.get("internet",0),   T_.text2, None),
                  (T("p7_electric"),d.get("luz",0),        T_.text2, None),
                  (T("p7_water"),   d.get("agua",0),       T_.text2, None),
                  (T("p7_mobile"),  d.get("data_movil",0), T_.text2, None)], "H")
        res_card(T("p7_loans"),
                 [(T("p7_loan_p"),d.get("prestamo_personal",0),T_.text2,None),
                  (T("p7_loan_a"),d.get("prestamo_auto",0),    T_.text2,None),
                  (T("p7_debts"), d.get("deudas",0),           T_.text2,None)], "D")
        res_card(T("p7_auto_pets"),
                 [(T("p7_gas"),      d.get("gasolina",0),          T_.text2,None),
                  (T("p7_maint"),    d.get("mantenimiento_auto",0), T_.text2,None),
                  (T("p7_pet_food"), d.get("mascota_comida",0),     T_.text2,None),
                  (T("p7_pet_vet"),  d.get("mascota_vet",0),        T_.text2,None),
                  (T("p7_pet_other"),d.get("mascota_otros",0),      T_.text2,None)], "~")
        res_card(T("p7_vars"),
                 [(T("p7_grocery"),d.get("comida",0),    T_.text2,None),
                  (T("p7_out"),    d.get("salidas",0),   T_.text2,None),
                  ("Delivery",     d.get("delivery",0),  T_.text2,None),
                  ("Apple One",    d.get("apple_one",0), T_.text2,None),
                  ("Netflix",      d.get("netflix",0),   T_.text2,None),
                  ("HBO Max",      d.get("hbo",0),       T_.text2,None),
                  ("Disney+",      d.get("disney",0),    T_.text2,None)], "@")
        ge = [(T("p7_extra_lbl", desc=g["desc"]), g.get("monto",0), T_.text2, None)
              for g in d.get("gastos_extra", []) if g.get("monto", 0) > 0]
        if ge: res_card(T("p7_extras_sec"), ge, "+")

        # ── Bar chart ──────────────────────────────────────
        self._bar_chart(f, {
            T("p7_home"):      sum(d.get(k,0) for k in ["alquiler","internet","luz","agua","data_movil"]),
            T("p7_loans"):     sum(d.get(k,0) for k in ["prestamo_personal","prestamo_auto","deudas"]),
            T("p7_auto_pets"): sum(d.get(k,0) for k in ["gasolina","mantenimiento_auto","mascota_comida","mascota_vet","mascota_otros"]),
            T("p7_vars"):      sum(d.get(k,0) for k in ["comida","salidas","delivery","apple_one","netflix","hbo","disney"]),
            T("p7_extras_sec"):sum(g.get("monto",0) for g in d.get("gastos_extra",[])),
        }, fmt_v, d["total_gastos"])

        # ── Projection chart ───────────────────────────────
        self._proj_chart(f, max(ahorro, 0), meta, meses_r, fmt_v)

        # ── Goal analysis ──────────────────────────────────
        gc = Card(f, pady=6)
        SectionHeader(gc, T("p7_goal"), "G")
        for lbl, vs, col in [
            (T("p7_goal_amt"),   fmt_v(meta),       SU),
            (T("p7_months_left"),str(meses_r),       T_.text1),
            (T("p7_need_mo"),    fmt_v(nec_mes),     WA),
            (T("p7_curr_mo"),    fmt_v(ahorro),      SU if ahorro >= 0 else DA),
            (T("p7_projection"), fmt_v(proyecc),     AC),
        ]:
            r = ctk.CTkFrame(gc, fg_color="transparent")
            r.pack(fill="x", padx=16, pady=2)
            ctk.CTkLabel(r, text=lbl, font=ctk.CTkFont(FS, 11),
                         text_color=T_.text2, anchor="w").pack(side="left")
            ctk.CTkLabel(r, text=vs, font=ctk.CTkFont(FS, 12, "bold"),
                         text_color=col, anchor="e").pack(side="right")
        self._divider(gc)

        btn_row = ctk.CTkFrame(gc, fg_color="transparent")
        btn_row.pack(fill="x", padx=16, pady=(4, 14))

        def exportar():
            ruta = filedialog.asksaveasfilename(
                defaultextension=".pdf",
                filetypes=[("PDF", "*.pdf")],
                title=T("pdf_save_title"))
            if ruta:
                ok = generar_pdf(d, ruta)
                if ok:
                    messagebox.showinfo(T("pdf_saved"), T("pdf_saved_msg", ruta=ruta))
                    self._status.set_status(f"PDF → {ruta}")
                else:
                    messagebox.showerror("", "PDF export failed. Is reportlab installed?")

        AccentButton(btn_row, text=f"📄  {T('p7_export')}",
                     variant="primary", command=exportar).pack(side="left", padx=(0, 10))
        ctk.CTkLabel(gc, text=T("p7_new"),
                     font=ctk.CTkFont(FS, 9), text_color=T_.text3,
                     ).pack(padx=16, pady=(0, 10), anchor="w")

    # ── Result row with optional hover popup ──────────────
    def _result_row(self, parent, lbl: str, val_str: str,
                    col: str, detail: Optional[list]):
        T_ = TM.T
        r = ctk.CTkFrame(parent, fg_color="transparent",
                          cursor="hand2" if detail else "")
        r.pack(fill="x", padx=16, pady=2)
        ctk.CTkLabel(r, text=lbl, font=ctk.CTkFont(FS, 11),
                     text_color=T_.text2, anchor="w").pack(side="left")
        vl = ctk.CTkLabel(r, text=val_str, font=ctk.CTkFont(FS, 11, "bold"),
                          text_color=col, anchor="e")
        vl.pack(side="right")

        if detail:
            tip = [None]
            def show(event, w=r):
                if tip[0] and tip[0].winfo_exists(): return
                tw = tk.Toplevel(self)
                tw.overrideredirect(True); tw.attributes("-topmost", True)
                try: tw.attributes("-alpha", 0.96)
                except: pass
                tw.configure(bg=TM.T.title_bar)
                tf = tk.Frame(tw, bg=TM.T.title_bar, padx=10, pady=8); tf.pack()
                tk.Label(tf, text=T("p7_hover_detail"),
                         font=(FS, 9, "bold"), bg=TM.T.title_bar, fg="#fff").pack(anchor="w")
                tk.Frame(tf, bg="#444", height=1).pack(fill="x", pady=(2, 6))
                for dl, dv in detail:
                    dr = tk.Frame(tf, bg=TM.T.title_bar); dr.pack(fill="x", pady=1)
                    tk.Label(dr, text=dl, font=(FS, 8), bg=TM.T.title_bar, fg="#ccc").pack(side="left")
                    tk.Label(dr, text=dv, font=(FS, 8, "bold"),
                             bg=TM.T.title_bar, fg="#fff").pack(side="right", padx=(12, 0))
                rx = w.winfo_rootx(); ry = w.winfo_rooty() + w.winfo_height() + 4
                tw.geometry(f"+{rx}+{ry}"); tip[0] = tw
            def hide(event):
                if tip[0] and tip[0].winfo_exists(): tip[0].destroy()
                tip[0] = None
            r.bind("<Enter>", show); r.bind("<Leave>", hide)
            vl.bind("<Enter>", show); vl.bind("<Leave>", hide)

    # ── Divider helper ────────────────────────────────────
    def _divider(self, parent):
        tk.Frame(parent, bg=TM.T.divider, height=1).pack(fill="x", padx=16, pady=(6, 4))
        TM.subscribe(lambda t, w=parent.winfo_children()[-1] if parent.winfo_children() else parent:
                     True)

    # ── Bar chart ─────────────────────────────────────────
    def _bar_chart(self, parent, data: dict, fmt_v, total: float):
        items = [(l, v) for l, v in data.items() if v > 0]
        items.sort(key=lambda x: x[1], reverse=True)
        if not items: return
        c = Card(parent, pady=6)
        SectionHeader(c, T("p7_chart_exp"), "=")
        T_ = TM.T
        CW, BH, GAP, LW, VW = 500, 18, 6, 170, 90
        ch = len(items) * (BH + GAP) + 24
        cv = tk.Canvas(c, bg=T_.card_bg, width=CW+LW+VW+20,
                       height=ch, highlightthickness=0)
        cv.pack(padx=16, pady=(4, 12))
        TM.subscribe(lambda t, w=cv: w.configure(bg=t.card_bg))
        colors = [T_.accent, T_.tag_blue, T_.tag_purple, T_.success, T_.danger,
                  T_.tag_orange, T_.accent_hover, T_.step_done]
        mv = max(v for _, v in items) or 1
        for i, (lbl, amt) in enumerate(items):
            y0 = 12 + i * (BH + GAP)
            short = lbl[:24] + "…" if len(lbl) > 24 else lbl
            cv.create_text(LW-6, y0+BH//2, text=short, anchor="e",
                           font=(FS, 8), fill=T_.text2)
            cv.create_rectangle(LW, y0, LW+CW, y0+BH,
                                fill=T_.progress_bg, outline="", width=0)
            fw = max(4, int(CW * amt / mv))
            cv.create_rectangle(LW, y0, LW+fw, y0+BH,
                                fill=colors[i % len(colors)], outline="", width=0)
            cv.create_text(LW+CW+6, y0+BH//2, text=fmt_v(amt), anchor="w",
                          font=(FS, 8, "bold"), fill=T_.text1)
            pct = (amt / total * 100) if total > 0 else 0
            tag = f"bar_{i}"
            cv.create_rectangle(LW, y0, LW+CW, y0+BH, fill="", outline="", tags=tag)
            tip_text = f"{lbl}: {fmt_v(amt)}  ({pct:.1f}%)"
            cv.tag_bind(tag, "<Enter>", lambda e, t=tip_text, w=cv: self._bar_tip(e,t,w))
            cv.tag_bind(tag, "<Leave>", lambda e, w=cv: w.delete("_bar_tip"))
        self._divider(c)

    def _bar_tip(self, event, text: str, cv: tk.Canvas):
        cv.delete("_bar_tip")
        x, y = event.x+10, event.y-20
        tw = len(text)*6+8
        cv.create_rectangle(x-4, y-14, x+tw, y+4,
                            fill=TM.T.title_bar, outline="", tags="_bar_tip")
        cv.create_text(x, y-5, text=text, anchor="w",
                       font=(FS, 8), fill="#FFF", tags="_bar_tip")

    # ── Projection chart ──────────────────────────────────
    def _proj_chart(self, parent, ahorro: float, meta: float,
                    meses_r: int, fmt_v):
        if meses_r <= 0 or ahorro <= 0: return
        c = Card(parent, pady=6)
        SectionHeader(c, T("p7_chart_proj"), "+")
        T_ = TM.T
        WC, HC, PL, PR, PT, PB = 560, 160, 72, 20, 16, 30
        pw, ph = WC-PL-PR, HC-PT-PB
        cv = tk.Canvas(c, bg=T_.card_bg, width=WC, height=HC, highlightthickness=0)
        cv.pack(padx=16, pady=(4, 12))
        TM.subscribe(lambda t, w=cv: w.configure(bg=t.card_bg))
        months_plot = min(meses_r + 3, 60)
        max_y = max(meta * 1.15, ahorro * months_plot * 1.1)
        def px(mo): return PL + int(mo / months_plot * pw)
        def py(v):  return PT + ph - int(v / max_y * ph)
        for i in range(5):
            gy = PT + int(i * ph / 4); gv = max_y * (4-i) / 4
            cv.create_line(PL, gy, PL+pw, gy, fill=T_.border, width=1, dash=(3,4))
            cv.create_text(PL-4, gy, text=fmt_v(gv), anchor="e",
                          font=(FS, 7), fill=T_.text3)
        gy_m = py(meta)
        if PT <= gy_m <= PT+ph:
            cv.create_line(PL, gy_m, PL+pw, gy_m, fill=T_.warning, width=1, dash=(6,3))
            cv.create_text(PL+pw+2, gy_m, text=T("p7_chart_goal"),
                          anchor="w", font=(FS, 7, "bold"), fill=T_.warning)
        pts = [(px(mo), py(ahorro*mo)) for mo in range(months_plot+1)]
        poly = list(pts) + [(PL+pw, PT+ph), (PL, PT+ph)]
        cv.create_polygon([c for p in poly for c in p],
                          fill=T_.accent_soft, outline="")
        for i in range(len(pts)-1):
            x1,y1=pts[i]; x2,y2=pts[i+1]
            col = T_.success if ahorro*(i+1) >= meta else T_.accent
            cv.create_line(x1,y1,x2,y2,fill=col,width=2)
        sl = max(1, months_plot//6)
        for mo in range(0, months_plot+1, sl):
            cv.create_text(px(mo), PT+ph+12, text=str(mo),
                          font=(FS, 7), fill=T_.text3)
        cv.create_text(PL+pw//2, HC-4, text=T("p7_chart_mo"),
                      font=(FS, 7), fill=T_.text3)
        # Hover
        self._pc = {"pts":pts, "data":[(mo,ahorro*mo) for mo in range(months_plot+1)],
                    "fmt":fmt_v, "meta":meta, "cv":cv}
        cv.bind("<Motion>", self._proj_hover)
        cv.bind("<Leave>",  lambda e: cv.delete("_ptip"))
        self._divider(c)

    def _proj_hover(self, event):
        pc = self._pc; cv = pc["cv"]; cv.delete("_ptip")
        pts = pc["pts"]
        if not pts: return
        ci = min(range(len(pts)), key=lambda i: abs(pts[i][0] - event.x))
        mo, acc = pc["data"][ci]; x, y = pts[ci]
        cv.create_oval(x-4, y-4, x+4, y+4,
                       fill=TM.T.accent, outline=TM.T.card_bg, width=2, tags="_ptip")
        ok = "✓ " if acc >= pc["meta"] else ""
        tip = f"{ok}{T('p7_chart_mo')} {mo}: {pc['fmt'](acc)}"
        tx = min(x+10, self._pc["cv"].winfo_width()-130)
        ty = max(y-28, 4)
        tw = len(tip)*6+8
        cv.create_rectangle(tx-4, ty-2, tx+tw, ty+16,
                            fill=TM.T.title_bar, outline="", tags="_ptip")
        cv.create_text(tx, ty+7, text=tip, anchor="w",
                      font=(FS, 8), fill="#FFF", tags="_ptip")

    # ── Session save / load ───────────────────────────────
    def _save_dialog(self):
        name = simpledialog.askstring(
            T("save_session"), T("save_name_prompt"), parent=self.root)
        if not name: return
        sessions = load_sessions()
        sessions[name] = {
            "datos": self._datos, "lang": _LANG,
            "step": self._step, "date": str(date.today()),
        }
        if save_sessions(sessions):
            messagebox.showinfo("", T("save_success", name=name))
            self._status.set_status(T("save_success", name=name))

    def _load_dialog(self):
        sessions = load_sessions()
        if not sessions:
            messagebox.showinfo("", T("load_none")); return
        win = tk.Toplevel(self.root)
        win.title(T("load_session"))
        win.configure(bg=TM.T.win_bg)
        win.geometry("420x380")
        win.update_idletasks()
        sw = win.winfo_screenwidth(); sh = win.winfo_screenheight()
        win.geometry(f"420x380+{(sw-420)//2}+{(sh-380)//2}")

        lb = tk.Listbox(win, font=(FS, 11), selectmode="single",
                        bg=TM.T.card_bg, fg=TM.T.text1,
                        selectbackground=TM.T.accent, selectforeground="#FFF",
                        relief="flat", bd=0, highlightthickness=0)
        lb.pack(fill="both", expand=True, padx=14, pady=14)
        keys = list(sessions.keys())
        for k in keys:
            lb.insert("end", f"{k}  —  {sessions[k].get('date','')}")

        def load_it():
            sel = lb.curselection()
            if not sel: return
            k = keys[sel[0]]; s = sessions[k]
            self._datos = s.get("datos", {})
            self._show_step(0)
            messagebox.showinfo("", T("load_success", name=k))
            self._status.set_status(T("load_success", name=k))
            win.destroy()

        def del_it():
            sel = lb.curselection()
            if not sel: return
            k = keys[sel[0]]; del sessions[k]
            save_sessions(sessions); win.destroy()

        bf = tk.Frame(win, bg=TM.T.win_bg); bf.pack(fill="x", padx=14, pady=(0,14))
        for txt, cmd in [(T("ok"), load_it),
                         (T("delete_session"), del_it),
                         (T("cancel"), win.destroy)]:
            tk.Button(bf, text=txt, font=(FS, 10),
                      bg=TM.T.accent if txt==T("ok") else TM.T.card_bg,
                      fg="#FFFFFF" if txt==T("ok") else TM.T.text1,
                      relief="flat", padx=12, pady=6,
                      cursor="hand2", command=cmd,
                      bd=0, highlightthickness=0
                      ).pack(side="left", padx=(0, 8))


# ═══════════════════════════════════════════════════════════
#  SECTION 17 — LANGUAGE BOOT SCREEN
# ═══════════════════════════════════════════════════════════
def show_language_boot(root: ctk.CTk, sw: int = 1920, sh: int = 1080) -> str:
    W, H = 500, 330
    root.geometry(f"{W}x{H}+{(sw-W)//2}+{(sh-H)//2}")
    root.configure(fg_color=LIGHT.win_bg)
    root.resizable(False, False)
    root.title("Salary & Goals Calculator")
    root.deiconify(); root.update_idletasks()
    root.lift(); root.focus_force()

    chosen = {"lang": "es"}
    _done  = tk.BooleanVar(master=root, value=False)

    frame = ctk.CTkFrame(root, fg_color=LIGHT.win_bg, corner_radius=0)
    frame.pack(fill="both", expand=True)

    # Top accent strip
    tk.Frame(frame, bg=LIGHT.accent, height=4).pack(fill="x")

    # Header
    hdr = ctk.CTkFrame(frame, fg_color=LIGHT.win_bg); hdr.pack(fill="x")
    tk.Frame(hdr, bg=LIGHT.accent, width=4).pack(side="left", fill="y")
    ht = ctk.CTkFrame(hdr, fg_color=LIGHT.win_bg); ht.pack(side="left", padx=18, pady=18)
    ctk.CTkLabel(ht, text="Salary & Goals Calculator",
                 font=ctk.CTkFont(FS, 18, "bold"),
                 text_color=LIGHT.text1).pack(anchor="w")
    ctk.CTkLabel(ht, text="Calculadora de Salario & Metas  •  v2.0 Modern Edition",
                 font=ctk.CTkFont(FS, 10),
                 text_color=LIGHT.text3).pack(anchor="w")

    # Separator
    tk.Frame(frame, bg=LIGHT.border, height=1).pack(fill="x", padx=20)

    # Flag strip
    fc_f = ctk.CTkFrame(frame, fg_color=LIGHT.win_bg); fc_f.pack(pady=(14, 6))
    fc = tk.Canvas(fc_f, bg=LIGHT.win_bg, width=300, height=28, highlightthickness=0)
    fc.pack()
    for i, (_, fn) in enumerate(FLAG_DRAW_FN.items()):
        fn(fc, 6 + i*49, 3, 40, 22)

    ctk.CTkLabel(frame, text="Select Language / Selecciona Idioma",
                 font=ctk.CTkFont(FS, 11), text_color=LIGHT.text2).pack(pady=(4, 12))

    btn_row = ctk.CTkFrame(frame, fg_color=LIGHT.win_bg); btn_row.pack()

    def pick(lang: str):
        chosen["lang"] = lang; _done.set(True)

    ctk.CTkButton(btn_row, text="🇪🇸  Español",
                  font=ctk.CTkFont(FS, 13, "bold"),
                  fg_color=LIGHT.accent, hover_color=LIGHT.accent_hover,
                  text_color="#FFFFFF", corner_radius=8,
                  width=150, height=42,
                  command=lambda: pick("es")).pack(side="left", padx=8)

    ctk.CTkButton(btn_row, text="🇺🇸  English",
                  font=ctk.CTkFont(FS, 13, "bold"),
                  fg_color=LIGHT.btn_ghost_bg, hover_color=LIGHT.btn_ghost_hover,
                  text_color=LIGHT.text1,
                  border_color=LIGHT.border, border_width=1,
                  corner_radius=8, width=150, height=42,
                  command=lambda: pick("en")).pack(side="left", padx=8)

    ctk.CTkLabel(frame, text="v2.0  •  Panama · Colombia · Mexico · USA · Costa Rica · Peru",
                 font=ctk.CTkFont(FS, 8),
                 text_color=LIGHT.text3).pack(pady=(14, 6))

    root.wait_variable(_done)
    try: frame.destroy()
    except: pass
    root.update_idletasks()
    _icon_cache.clear()   # invalidate any PhotoImages created during boot screen
    return chosen["lang"]


# ═══════════════════════════════════════════════════════════
#  SECTION 18 — ANIMATED SPLASH SCREEN
# ═══════════════════════════════════════════════════════════
def show_splash(root: ctk.CTk, on_done: Callable,
                sw: int = 1920, sh: int = 1080):
    W, H = 620, 380
    root.geometry(f"{W}x{H}+{(sw-W)//2}+{(sh-H)//2}")
    root.configure(fg_color="#1C1C1C")
    root.resizable(False, False)
    root.overrideredirect(True)
    root.lift(); root.attributes("-topmost", True)
    root.update()

    cv = tk.Canvas(root, bg="#1C1C1C", width=W, height=H,
                   highlightthickness=0, bd=0)
    cv.pack(fill="both", expand=True)
    root.update_idletasks()

    # Card
    CX, CY = W//2, H//2
    cw, ch = 460, 320
    cx0, cy0 = CX-cw//2, CY-ch//2
    cv.create_rectangle(cx0+6, cy0+6, cx0+cw+6, cy0+ch+6, fill="#0a0a0a", outline="")
    cv.create_rectangle(cx0, cy0, cx0+cw, cy0+ch, fill="#272727", outline="#333", width=1)
    cv.create_rectangle(cx0, cy0, cx0+cw, cy0+4, fill="#0067C0", outline="")

    # Coin
    coin_y0 = cy0 + 54
    st = {"y": float(coin_y0)}
    ov  = cv.create_oval(CX-30, coin_y0-30, CX+30, coin_y0+30,
                          fill="#FFD700", outline="#B8860B", width=2)
    sym = cv.create_text(CX, coin_y0, text="$",
                         font=(FS, 22, "bold"), fill="#5a3e00")

    cv.create_text(CX, cy0+108, text="Salary & Goals Calculator",
                   font=(FS, 16, "bold"), fill="#F0F0F0")
    cv.create_text(CX, cy0+132, text="v2.0 Modern Edition  •  by Erick Perez",
                   font=(FS, 9), fill="#777777")
    cv.create_text(CX, cy0+152, text="🇵🇦  🇨🇴  🇲🇽  🇺🇸  🇨🇷  🇵🇪",
                   font=(FS, 12), fill="#60AEFF")

    # Progress bar
    bx0, by = CX-170, cy0+190
    cv.create_rectangle(bx0, by, bx0+340, by+5, fill="#333333", outline="#444")
    bar = cv.create_rectangle(bx0, by, bx0, by+5, fill="#0067C0", outline="")
    msg = cv.create_text(CX, by+20, text="Loading...", font=(FS, 8), fill="#666666")

    MSGS = (["Iniciando sistema...","Cargando módulos...","Configurando impuestos...","¡Listo!"]
            if _LANG == "es" else
            ["Booting system...", "Loading modules...", "Configuring taxes...", "Ready!"])
    total = 2200;  step_ms = 22;  elapsed = [0];  running = [True];  aid = [None]

    def tick():
        if not running[0]: return
        elapsed[0] += step_ms
        pct = min(elapsed[0] / total, 1.0)

        # Coin bounce
        import math as _m
        ny = coin_y0 + _m.sin(elapsed[0] / 360) * 7
        dy = ny - st["y"];  st["y"] = ny
        cv.move(ov, 0, dy);  cv.move(sym, 0, dy)

        # Bar fill
        ease = 1 - (1 - pct) ** 3
        x1 = bx0 + int(340 * ease)
        cv.coords(bar, bx0, by, x1, by+5)
        if pct > 0.8: cv.itemconfig(bar, fill="#60AEFF")

        mi = min(int(pct * len(MSGS)), len(MSGS) - 1)
        cv.itemconfig(msg, text=f"{MSGS[mi]}  {int(pct*100)}%")

        if pct < 1.0:
            aid[0] = root.after(step_ms, tick)
        else:
            root.after(300, finish)

    def finish():
        running[0] = False
        if aid[0]:
            try: root.after_cancel(aid[0])
            except: pass
        try: cv.destroy()
        except: pass
        on_done()

    tick()


# ═══════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════
if __name__ == "__main__":
    try:
        # Create root FIRST — ctk needs a Tk context before appearance calls
        root = ctk.CTk()
        root.withdraw()
        root.update()

        # Safe to configure appearance now that CTk is initialized
        ctk.set_appearance_mode("light")
        ctk.set_default_color_theme("blue")

        # Cache screen dimensions before any UI operations
        _SW = root.winfo_screenwidth()
        _SH = root.winfo_screenheight()
        if _SW < 100: _SW = 1920
        if _SH < 100: _SH = 1080

        # Language selection
        root.deiconify()
        _LANG = show_language_boot(root, _SW, _SH)

        def _on_splash_done():
            root.overrideredirect(False)
            root.resizable(True, True)
            root.attributes("-topmost", False)
            root.geometry(f"1060x720+{(_SW-1060)//2}+{(_SH-720)//2}")
            root.configure(fg_color=TM.T.win_bg)
            # Clear cached PhotoImages — they were created during the splash/boot
            # screens and are now invalid after those widgets were destroyed.
            # CalcApp will recreate all icons fresh under its own widget tree.
            _icon_cache.clear()
            CalcApp(root)          # pass existing root — no second Tk instance

        show_splash(root, _on_splash_done, _SW, _SH)
        root.mainloop()

    except BaseException:
        # BaseException catches SystemExit, KeyboardInterrupt, and C-level exits
        _write_crash(_tb.format_exc())
