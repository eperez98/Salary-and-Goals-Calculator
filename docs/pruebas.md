# Pruebas y control de calidad — v0.4.8 Beta 2

Fecha: 2026-11-06. Cada punto indica **cómo** se verificó. Lo que no se pudo verificar se indica explícitamente.

## Automatizadas

| Conjunto | Comando | Resultado |
|---|---|---|
| Unitarias + integración con SQLite real y cobertura de traducciones (53 pruebas) | `npm test` | ✅ |
| Validación de TypeScript (modo estricto) | `npm run typecheck` | ✅ |
| Lint (ESLint + typescript-eslint + react-hooks) | `npm run lint` | ✅ |
| Build de producción | `npm run build` | ✅ |
| Recorrido E2E en Chromium (Playwright) | `npm run e2e` | ✅ |
| Compilación del shell Tauri (Linux, debug) + ejecución en Xvfb | `npx tauri build --debug --no-bundle` | ✅ La ventana nativa carga, SQLite WASM funciona con la CSP y se crea `monto.db` (cabecera `SQLite format 3`) en la carpeta de datos usando los permisos declarados |
| Build de Windows + instalación silenciosa + ejecución + desinstalación | CI `windows-latest` (`scripts/windows-smoke-test.ps1`) | ✅ [Ejecución #1](https://github.com/eperez98/monto/actions/runs/42162024055): `Monto_0.4.8-beta.2_x64-setup.exe` instalado en `%LOCALAPPDATA%\Monto\Monto.exe` , acceso directo en el menú Inicio, la app arrancó y creó `monto.db` (SQLite válido) en `%APPDATA%\com.monto.finanzas`, desinstalación correcta conservando los datos. Se generaron también el `.msi` y el `.exe` como artefactos |

## Lista de verificación funcional

| # | Requisito | Verificación |
|---|---|---|
| 1 | Funcionalidades | Recorrido E2E por todos los módulos + pruebas de repositorios |
| 2 | Crear, editar y eliminar movimientos | E2E (gasto, ingreso, edición, eliminación con confirmación) + `db.test.ts` |
| 3 | Cálculos de ingresos, gastos y balances | `db.test.ts` (saldos, transferencias, tarjetas sin doble conteo) + E2E (B/. 2,500 → 2,454.80 → 2,450.00) |
| 4 | PAB y USD | `domain.test.ts` (formato `B/. 1,500.00` / `$1,500.00`, paridad 1:1) + `db.test.ts` (saldos separados, moneda obligatoria por cuenta) |
| 5 | Salario quincenal y equivalentes | `salary.test.ts` (1,500 → 3,000 → 36,000; quincenas distintas; CSS/SE; décimo; fines de semana; febrero) + E2E en el asistente |
| 6 | Presupuestos y objetivos | Umbrales 70/90/100 % (unitarias e integración) + E2E (alerta al 83 %, objetivo completado con celebración) |
| 7 | Permisos familiares | `db.test.ts` (Miembro no edita de otros, Solo lectura no crea, Miembro no gestiona presupuestos ni integrantes) + E2E (Adulto no ve “Añadir integrante” ni puede cambiar la seguridad) |
| 8 | Persistencia al reiniciar | `db.test.ts` (reabrir el motor) + E2E (recarga completa: datos y tema conservados) + escritorio (archivo en disco) |
| 9 | Exportaciones | E2E: CSV, Excel (.xlsx) y PDF descargados; cabecera `%PDF` verificada |
| 10 | Funcionamiento offline | Sin dependencias de red en tiempo de ejecución: fuentes, WASM y librerías empaquetadas; CSP `default-src 'self'` en escritorio |
| 11 | Instalador de Windows 11 | Instalación, ejecución y desinstalación automatizadas en CI `windows-latest` (Windows Server, mismo motor WebView2). **Pendiente: prueba manual en un equipo físico con Windows 11.** |
| 12 | Documentación actualizada | README, CHANGELOG, CONTRIBUTING, SECURITY y `docs/` revisados para v0.4.8 Beta 2 |
| 13 | Sin información privada | `.gitignore` excluye `*.db`, `*.monto`, copias, exportaciones y secretos; revisión del árbol antes del commit |

Seguridad adicional verificada en E2E: contraseña establecida, base de datos **cifrada en reposo** (`MONTOENC1`), bloqueo con `Ctrl + L`, rechazo de contraseña incorrecta y desbloqueo con la correcta. Integración: contraseña incorrecta → `WrongPasswordError`; copias no válidas rechazadas antes de restaurar.

## Limitaciones conocidas
- El instalador no está firmado con un certificado de código: SmartScreen mostrará un aviso.
- Las reglas de deducciones de Panamá son estimaciones (no calculan ISR); verifica con tu comprobante de pago.
- La base de datos se mantiene completa en memoria: adecuado para uso personal y familiar (ver ADR 0002).
