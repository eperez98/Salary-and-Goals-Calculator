# ADR 0001 — Tauri 2 + React + TypeScript para escritorio

- **Estado:** aceptada
- **Fecha:** 2026-11-06

## Contexto
Se necesita una aplicación de escritorio real para Windows 11, instalable, con un instalador ligero, funcionamiento sin conexión, persistencia local y una interfaz premium con animaciones.

## Opciones
| Criterio | Tauri 2 | Electron |
|---|---|---|
| Tamaño del instalador | ~5–8 MB (usa WebView2 del sistema) | ~80–120 MB (incluye Chromium) |
| Memoria en reposo | Baja | Alta |
| Superficie de seguridad | Permisos explícitos (capabilities), CSP estricta, backend en Rust | Node.js con acceso amplio salvo configuración cuidadosa |
| Instalador Windows | NSIS y MSI integrados | electron-builder |
| WebView en Windows 11 | WebView2 preinstalado | Chromium propio |

## Decisión
**Tauri 2** con frontend **React 18 + TypeScript + Vite + Tailwind CSS 4**, animaciones con **Motion** y gráficos con **Recharts**.

## Consecuencias
- Instalador pequeño y arranque rápido; WebView2 viene con Windows 11 (el instalador incluye además el *bootstrapper* por si falta).
- El código de la interfaz se puede probar en un navegador con Playwright.
- La compilación del instalador necesita Windows (se hace en GitHub Actions con `windows-latest`).
