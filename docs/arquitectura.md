# Arquitectura

```
┌───────────────────────────── Ventana Tauri (WebView2) ─────────────────────────────┐
│                                                                                    │
│  React UI (features/*)  ──hooks──▶  Repositorios (db/repo/*)  ──▶  Engine (sql.js) │
│        │                                │  Zod + permisos             │ SQLite WASM │
│        │                                ▼                              │ en memoria  │
│        │                         Dominio puro (domain/*)               ▼             │
│        │                  salarios · amortización · presupuestos   StorageAdapter    │
│        │                  permisos · recurrencias · análisis        │               │
│        ▼                                                            │               │
│  services/* (export CSV/XLSX/PDF, backups)                          │               │
└─────────────────────────────────────────────────────────────────────┼───────────────┘
                                                                      │ tauri-plugin-fs
                                          %APPDATA%\com.monto.finanzas\monto.db (+ backups\)
```

## Capas

| Capa | Carpeta | Responsabilidad | Pruebas |
|---|---|---|---|
| Dominio | `src/domain` | Cálculos puros y reglas de negocio (sin React ni SQL) | `domain/*.test.ts` |
| Utilidades | `src/lib` | Dinero en céntimos (PAB/USD), fechas locales y periodos | `domain/domain.test.ts` |
| Datos | `src/db` | Motor SQLite, migraciones, cifrado, adaptadores, repositorios | `db/db.test.ts` (SQLite real) |
| Servicios | `src/services` | Exportación, copias de seguridad, diálogos de archivos | E2E |
| Estado | `src/store` | Sesión, ruta, ámbito (Personal/Hogar), periodo, notificaciones | — |
| Interfaz | `src/components`, `src/features`, `src/icons`, `src/brand` | UI kit, layout, módulos, iconos y logotipo | E2E (`scripts/e2e.mjs`) |
| Escritorio | `src-tauri` | Ventana, permisos, instancia única, instaladores | CI Windows (instalación real) |

## Flujo de datos
1. La interfaz llama a un repositorio mediante `useMutate()`, que pasa el **actor** (integrante y rol).
2. El repositorio **valida con Zod**, verifica **permisos** (`assertCan`) y escribe con SQL parametrizado, dentro de una transacción si son varias operaciones; además deja un registro en `activity_log`.
3. El `Engine` incrementa su `revision`, notifica a los suscriptores y **programa el guardado** (400 ms). Las consultas de la interfaz (`useQuery`) se recalculan con la nueva revisión.
4. El adaptador escribe el archivo de forma **atómica**; si hay contraseña, cifra antes de escribir.

## Arranque
`Splash → (¿cifrado? → LockScreen) → Engine.open → migraciones → integrity_check → ¿onboarded? → Onboarding | selección de integrante → App`. Al entrar: inicio de sesión registrado, registro automático de pagos recurrentes vencidos y copia de seguridad diaria.

## Adaptadores de almacenamiento
- `TauriAdapter`: archivo en `appDataDir()` con escritura atómica y carpeta `backups/`.
- `BrowserAdapter`: IndexedDB (modo desarrollo y pruebas E2E).
- `MemoryAdapter`: pruebas unitarias.

## Actualizaciones
`src-tauri/src/updater.rs` (comandos `check_update` e `install_update`) consulta `api.github.com/repos/<repo>/releases`, elige la versión SemVer más alta que la instalada (con o sin pre-releases), descarga el paquete `Monto_<versión>_x64.zip` con progreso (`update://progress`), verifica su SHA-256 con el `digest` que publica GitHub, lo descomprime con `tar.exe` de Windows, verifica el instalador contra el `SHA256SUMS.txt` del zip, lanza el instalador en modo pasivo (`/P`) y cierra la app. El flujo `release.yml` publica ese único zip (instalador, `SHA256SUMS.txt` y `LEEME.txt`).

## Seguridad
- CSP estricta (`default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'`), sin recursos remotos ni fuentes externas.
- *Capabilities* de Tauri limitadas a la ventana principal, diálogos y sistema de archivos en `$APPDATA`.
- Cifrado AES-256-GCM opcional (ver [ADR 0002](decisiones/0002-sqlite-wasm.md)).

## Rendimiento
- Módulos cargados bajo demanda (`React.lazy`); exportadores (ExcelJS, jsPDF) solo se cargan al exportar.
- Consultas SQLite síncronas e indexadas por fecha, cuenta y categoría.
- Animaciones con `transform`/`opacity` y desactivables (*reduced motion*).

## Decisiones
- [0001 — Tauri 2 + React](decisiones/0001-arquitectura-escritorio.md)
- [0002 — SQLite en WebAssembly](decisiones/0002-sqlite-wasm.md)
- [0003 — Estimado vs. recibido](decisiones/0003-estimado-vs-recibido.md)
