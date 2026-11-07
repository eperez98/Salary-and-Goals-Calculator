<div align="center">

[English](README.md) · **Español**

<img src="assets/brand/readme-hero-es.png" alt="Monto: finanzas personales y familiares para Panamá" width="100%" />

<br />

[![Descargar para Windows](https://img.shields.io/badge/Descargar%20para%20Windows-0.5.3%20Beta%206-E8930F?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/eperez98/monto/releases)

[![CI](https://github.com/eperez98/monto/actions/workflows/ci.yml/badge.svg)](https://github.com/eperez98/monto/actions/workflows/ci.yml)
![Windows 10 | 11](https://img.shields.io/badge/Windows-10%20%7C%2011-14304D)
![Sin conexión](https://img.shields.io/badge/funciona-sin%20conexi%C3%B3n-14304D)
![Español | English](https://img.shields.io/badge/Espa%C3%B1ol%20%7C%20English-14304D)
![MIT](https://img.shields.io/badge/licencia-MIT-14304D)

**Ingresos, quincenas, gastos, presupuestos, ahorros y deudas — en balboas y dólares, para ti o para todo tu hogar.**<br />
Sin nube y sin cuentas en línea: tus datos se quedan en tu equipo.

[Características](#características) · [Capturas](#capturas) · [Descargar](#descargar) · [Licencia](#licencia)

</div>

---

## Por qué Monto

<table>
<tr>
<td width="33%" valign="top">

### 🇵🇦 Hecho para Panamá
Balboa (`B/.`) y dólar a la par, **quincenas**, CSS y Seguro Educativo, décimo tercer mes, Yappy, ACH y Panapass.

</td>
<td width="33%" valign="top">

### 👨‍👩‍👧 Para todo el hogar
Perfil individual, en pareja o familiar con roles, gastos compartidos, quién le debe a quién y vista **Personal / Hogar**.

</td>
<td width="33%" valign="top">

### 🔒 Privado por diseño
Base de datos SQLite 100 % local, cifrado **AES‑256** opcional, bloqueo automático y copias diarias. Nada sale de tu PC.

</td>
</tr>
</table>

## Capturas

<div align="center">
<img src="assets/screenshots/es/dashboard.png" alt="Resumen" width="100%" />
<sub><b>Resumen</b> — saldo disponible, ingresos vs. gastos, distribución de gastos, próximo cobro y alertas.</sub>
</div>

<br />

| | |
|:---:|:---:|
| <img src="assets/screenshots/es/plan.png" alt="Plan mensual" /><br /><sub><b>Plan mensual</b> — tus gastos uno por uno, lo que te queda y cuánto puedes ahorrar</sub> | <img src="assets/screenshots/es/income.png" alt="Ingresos" /><br /><sub><b>Ingresos y salario</b> — estimado vs. realmente recibido, calendario de cobros</sub> |
| <img src="assets/screenshots/es/transactions.png" alt="Movimientos" /><br /><sub><b>Movimientos</b> — búsqueda, filtros, comprobantes, importar y exportar CSV</sub> | <img src="assets/screenshots/es/accounts.png" alt="Cuentas" /><br /><sub><b>Cuentas y tarjetas</b> — saldos por moneda y uso de tarjetas</sub> |
| <img src="assets/screenshots/es/budgets.png" alt="Presupuestos" /><br /><sub><b>Presupuestos</b> — límites mensuales con alertas al 70, 90 y 100 %</sub> | <img src="assets/screenshots/es/goals.png" alt="Objetivos" /><br /><sub><b>Objetivos de ahorro</b> — progreso, ritmo y aportaciones</sub> |
| <img src="assets/screenshots/es/debts.png" alt="Préstamos y deudas" /><br /><sub><b>Préstamos y deudas</b> — cuotas, intereses y amortización</sub> | <img src="assets/screenshots/es/family.png" alt="Familia" /><br /><sub><b>Familia</b> — gastos compartidos, roles y permisos</sub> |
| <img src="assets/screenshots/es/calendar.png" alt="Calendario" /><br /><sub><b>Calendario</b> — cobros, cuotas, servicios y recordatorios</sub> | <img src="assets/screenshots/es/reports.png" alt="Informes" /><br /><sub><b>Informes</b> — exportación a Excel, CSV y PDF</sub> |

<details>
<summary><b>🌙 Modo oscuro, configuración guiada y análisis</b></summary>
<br />

| | |
|:---:|:---:|
| <img src="assets/screenshots/es/dashboard-dark.png" alt="Modo oscuro" /><br /><sub>Modo claro y oscuro con un clic</sub> | <img src="assets/screenshots/es/plan-dark.png" alt="Plan mensual en modo oscuro" /><br /><sub>Plan mensual en modo oscuro</sub> |
| <img src="assets/screenshots/es/onboarding-salary.png" alt="Configuración guiada: salario" /><br /><sub>Configuración guiada: salario neto con totales mensual y anual en vivo</sub> | <img src="assets/screenshots/es/onboarding-expenses.png" alt="Configuración guiada: gastos" /><br /><sub>Configuración guiada: gastos del mes y ahorro posible</sub> |
| <img src="assets/screenshots/es/insights.png" alt="Análisis" /><br /><sub>Análisis basado solo en tus datos</sub> | <img src="assets/screenshots/es/onboarding-welcome.png" alt="Bienvenida" /><br /><sub>Bienvenida con selector de idioma y tema</sub> |

</details>

<sub>Las capturas usan datos ficticios de ejemplo. Se regeneran con `node scripts/screenshots.mjs`.</sub>

## Características

<details open>
<summary><b>Ingresos y salario</b></summary>

- Semanal, bisemanal, **quincenal** (primera y segunda quincena pueden ser distintas), mensual, por horas y variable/freelance.
- Ingreso por pago, mensual, anual y promedio real, próxima fecha de pago y total recibido en el año. Ejemplo: B/. 1,250 por quincena → B/. 2,500 al mes → B/. 30,000 al año.
- Descuentos de ley opcionales (**CSS 9,75 %**, **Seguro Educativo 1,25 %**) y **décimo tercer mes** estimado (abril, agosto y diciembre).
- **Estimado ≠ recibido:** un pago solo cuenta cuando lo confirmas, y nunca con fecha futura.
</details>

<details>
<summary><b>Plan mensual</b></summary>

- Monto te pregunta tus gastos del mes **uno por uno** (vivienda, luz, agua, gas, internet, alimentación, transporte, préstamos, tarjetas, salud, educación, entretenimiento…) y puedes añadir los tuyos.
- Los resta de tu ingreso mensual neto y te muestra el **fondo restante**, si **puedes ahorrar** y **cuánto**.
- Disponible para cada integrante en los modos individual, pareja y familia.
</details>

<details>
<summary><b>Finanzas del día a día</b></summary>

- Ingresos, gastos, transferencias, pagos de tarjeta, préstamos y reembolsos, con categoría, cuenta, método de pago (ACH, **Yappy**, efectivo, tarjetas), notas, responsable y **comprobantes adjuntos**.
- Búsqueda, filtros, importación y exportación CSV. Cuentas de ahorro, corrientes, efectivo, tarjetas de crédito y débito e inversiones en PAB o USD.
- Categorías y subcategorías personalizables.
</details>

<details>
<summary><b>Planificación</b></summary>

- **Presupuestos** por categoría con alertas al 70, 90 y 100 %.
- **Objetivos de ahorro** con anillo de progreso y celebración al cumplirlos.
- **Préstamos y deudas** con cuota, intereses, saldo pendiente y **tabla de amortización**.
- **Calendario financiero** con cobros, cuotas, pagos recurrentes y recordatorios.
</details>

<details>
<summary><b>Familia</b></summary>

- Integrantes con avatar y rol (**Administrador, Adulto, Miembro, Solo lectura**), aplicados también en la capa de datos.
- Vista **Personal / Hogar**, gastos compartidos repartidos entre integrantes, deudas entre integrantes con liquidación e historial del hogar.
</details>

<details>
<summary><b>Informes, análisis y privacidad</b></summary>

- Ingresos, gastos, flujo de efectivo, ahorros, deudas, por categoría, evolución mensual y comparación anual. Exportación a **Excel**, **CSV** y **PDF**.
- Detección de duplicados, alertas de presupuesto, recordatorios de pagos, hábitos de consumo y proyecciones de ahorro, siempre marcadas como estimaciones.
- Contraseña opcional con cifrado **AES‑256‑GCM**, bloqueo automático (`Ctrl + L`), PIN por integrante, registro de sesiones, copias automáticas y manuales, verificación de integridad.
- **Actualizaciones:** al iniciar, Monto te avisa si hay una versión nueva y te pregunta si quieres descargarla. Nada se instala sin tu permiso; el instalador se verifica con SHA‑256 y antes se respaldan tus datos.
</details>

## Descargar

1. Entra en **[Releases](https://github.com/eperez98/monto/releases)** y descarga `Monto_x.y.z_x64.zip`.
2. Descomprímelo y ejecuta `Monto_x.y.z_x64-setup.exe`. Elige **Español** o **English**. No necesita permisos de administrador.
3. Windows SmartScreen puede mostrar un aviso porque el instalador aún no está firmado: **Más información → Ejecutar de todas formas**.

El zip incluye también `SHA256SUMS.txt` (para verificar el instalador) y `LEEME.txt`. Al actualizar se conservan tus datos en `%APPDATA%\com.monto.finanzas`. Consulta la [guía de instalación](docs/instalacion.md) y el [manual de usuario](docs/manual-de-usuario.md).

**Requisitos:** Windows 10 (1803+) u 11 de 64 bits. WebView2 viene con Windows 11; el instalador lo añade si falta.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Escritorio | [Tauri 2](https://tauri.app) (Rust + WebView2), instalador NSIS |
| Interfaz | React 18, TypeScript estricto, Vite 7, Tailwind CSS 4, Motion, Recharts |
| Datos | SQLite con sql.js (WebAssembly), validación con Zod, estado con Zustand |
| Exportación | ExcelJS, jsPDF + AutoTable |
| Idiomas | Sistema propio: textos fuente en español y diccionario en inglés |
| Calidad | Vitest, E2E con Playwright, ESLint, GitHub Actions (compilación y prueba de instalación en Windows) |

Más detalles en [docs/arquitectura.md](docs/arquitectura.md) y en las [decisiones de arquitectura](docs/decisiones/).

## Contribuir

Las contribuciones son bienvenidas. Lee [CONTRIBUTING.md](CONTRIBUTING.md) y [SECURITY.md](SECURITY.md). Los cambios se registran en [CHANGELOG.md](CHANGELOG.md) con [Versionado Semántico](https://semver.org/lang/es/).

## Licencia

**MIT** — consulta [LICENSE](LICENSE). © 2026 Erick Arturo Pérez Cazorla.

<div align="center"><br /><sub>Monto · Hecho en Panamá 🇵🇦</sub></div>
