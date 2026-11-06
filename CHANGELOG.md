# Registro de cambios

Todos los cambios relevantes de Monto se documentan en este archivo.

El formato sigue [Keep a Changelog 1.1.0](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico 2.0.0](https://semver.org/lang/es/):

- **MAJOR**: cambios incompatibles (por ejemplo, migraciones de datos no retrocompatibles).
- **MINOR**: funcionalidades nuevas compatibles.
- **PATCH**: correcciones.

## [Sin publicar]

## [0.4.8-beta.3] - 2026-11-06

Primera versión publicada de **Monto**. Incluye todas las funciones de 0.4.8-beta.2 (descritas más abajo) y añade el inglés.

### Nuevas funcionalidades
- **Interfaz en inglés.** Toda la aplicación está disponible en español e inglés: menús, formularios, avisos, mensajes de error, informes exportados, fechas y categorías predeterminadas. La primera vez se usa el idioma de Windows y se puede cambiar en la configuración inicial o en *Configuración → Apariencia*.
- **Instalador bilingüe.** El instalador pregunta el idioma (español o inglés).
- **Descarga en un solo archivo.** Cada versión se publica como `Monto_<versión>_x64.zip` con el instalador, `SHA256SUMS.txt` y `LEEME.txt`. Se deja de publicar el MSI.
- El actualizador integrado descarga ese zip, comprueba su SHA-256 con el que informa GitHub, lo descomprime y verifica el instalador antes de ejecutarlo.

### Cambios
- Las categorías predeterminadas se crean al terminar la configuración inicial, en el idioma elegido. Las bases de datos existentes conservan sus nombres.
- El repositorio pasa a llamarse `eperez98/monto`; el actualizador busca las versiones en el nuevo nombre.
- Los datos de ejemplo de las pruebas y las capturas de pantalla usan nombres ficticios.

### Cambios técnicos
- Sistema de traducción propio (`src/lib/i18n.ts`, `src/lib/locales/en.ts`) sin dependencias nuevas. `npm run i18n:check` lista los textos sin traducir y una prueba automática impide publicar textos sin traducción.

## [0.4.8-beta.2] - 2026-11-06

Versión Beta de **Monto** (0.4.8 Beta 2).

### Nuevas funcionalidades
- **Actualizaciones integradas** (*Configuración → Actualizaciones*): búsqueda manual o automática al iniciar (opcional), canal estable o Beta, notas de la versión, descarga con progreso, verificación SHA-256 contra `SHA256SUMS.txt`, copia de seguridad previa e instalación en modo pasivo conservando los datos.
- Nombre comercial **Monto** (reemplaza a *Balbo*) y logotipo “M” en colores medianoche + oro.
- Número de versión legible en la app (“0.4.8 Beta 2”).
- Licencia MIT.

### Base funcional incluida en esta Beta

Primera versión funcional de **Monto**, una aplicación nueva que reemplaza por completo al antiguo *Salary and Goals Calculator* (Python).

### Nuevas funcionalidades
- Aplicación de escritorio para Windows 10/11 con instalador NSIS y MSI, accesos directos, desinstalador e información de versión.
- Configuración inicial guiada: perfil individual, en pareja o familiar; moneda principal; frecuencia de ingresos; cuenta principal; contraseña opcional.
- Ingresos y salarios: semanal, bisemanal, quincenal (primera y segunda quincena independientes), mensual, por horas, variable/freelance y otros. Cálculo de ingreso por pago, mensual, anual, promedio real, próxima fecha de pago y total recibido en el año.
- Descuentos de ley de Panamá (CSS 9,75 %, Seguro Educativo 1,25 %), descuentos personalizados y décimo tercer mes estimado.
- Confirmación explícita de pagos recibidos; los estimados nunca se registran como recibidos antes de su fecha.
- Movimientos: ingresos, gastos, transferencias, pagos de tarjeta, préstamos recibidos, abonos y reembolsos, con comprobantes adjuntos, responsable, búsqueda, filtros, edición, eliminación e importación CSV.
- Cuentas de ahorro, corrientes, efectivo, tarjetas de crédito y débito, e inversiones en PAB o USD con saldo inicial y saldo actual.
- Categorías y subcategorías predeterminadas y personalizadas.
- Presupuestos mensuales por categoría con alertas al 70 %, 90 % y 100 %.
- Objetivos de ahorro con aportaciones, retiros, fecha objetivo, ritmo actual y celebración al completarlos.
- Préstamos y deudas con cuota, intereses, saldo pendiente, abonos reales y tabla de amortización.
- Finanzas familiares: integrantes, avatares, roles (Administrador, Adulto, Miembro, Solo lectura), permisos aplicados en la capa de datos, vista Personal/Hogar, gastos compartidos con reparto, distribución de responsabilidades, deudas entre integrantes, liquidaciones e historial.
- Calendario financiero con cobros, cuotas, pagos recurrentes y recordatorios.
- Automatizaciones: pagos recurrentes (manuales o automáticos solo en su fecha), detección de duplicados, alertas de presupuesto, recordatorios de pagos, resumen mensual, comparación de hábitos, categorías con gasto elevado y proyecciones de ahorro.
- Informes de ingresos, gastos, flujo de efectivo, ahorros, deudas, categorías, evolución mensual y comparación anual con exportación a Excel, CSV y PDF.
- Seguridad: cifrado AES-256-GCM opcional de toda la base de datos, bloqueo automático por inactividad, bloqueo manual (`Ctrl + L`), PIN por integrante y registro de sesiones.
- Datos: copia de seguridad automática diaria, copias manuales, restauración con validación de integridad, exportación/importación `.monto` y exportación JSON.

### Mejoras visuales
- Identidad visual completa de Monto: logotipo M, icono de Windows, versiones horizontal y vertical, favicon, paleta y tipografía.
- Sistema de iconos propio con estados inactivo, hover y activo.
- Splash animado, transiciones entre módulos, contadores animados, gráficos progresivos, microinteracciones y notificaciones animadas.
- Modo claro, oscuro y automático según Windows; opción para reducir el movimiento.

### Cambios técnicos
- Versionado SemVer pre-release `0.4.8-beta.2` (MSI con versión numérica `0.4.8.2`).
- Arquitectura Tauri 2 + React 18 + TypeScript + Tailwind CSS 4 + Motion + Recharts.
- SQLite (sql.js/WebAssembly) con migraciones versionadas, escritura atómica y validación de integridad.
- 46 pruebas automatizadas (Vitest) y prueba E2E con Playwright.
- GitHub Actions: lint, validación de tipos, pruebas, build web, build de Windows con prueba de instalación y publicación automática de versiones.

### Cambios incompatibles
- Los datos de prueba de la compilación interna *Balbo* (`com.balbo.finanzas`) no se migran.
- Se elimina la aplicación anterior en Python (`SalaryGoals_Modern.py`). Sus datos no se migran.

[Sin publicar]: https://github.com/eperez98/monto/compare/v0.4.8-beta.3...HEAD
[0.4.8-beta.3]: https://github.com/eperez98/monto/releases/tag/v0.4.8-beta.3
[0.4.8-beta.2]: https://github.com/eperez98/monto/releases/tag/v0.4.8-beta.2
