# ADR 0002 — SQLite en WebAssembly (sql.js) con persistencia en archivo

- **Estado:** aceptada
- **Fecha:** 2026-11-06

## Contexto
Requisitos: SQLite local, sin servidor, funcionamiento sin conexión, copias de seguridad, restauración, validación de integridad y protección opcional con contraseña. Además, toda la lógica debe poder probarse automáticamente.

## Opciones consideradas
1. **tauri-plugin-sql (SQLx, nativo)**: SQLite nativo, pero las consultas son asíncronas por IPC, el cifrado requiere SQLCipher (compilación compleja en Windows) y la lógica no se puede probar sin la app nativa.
2. **rusqlite con comandos propios**: rendimiento nativo, pero duplica el modelo de datos en Rust y TypeScript.
3. **sql.js (SQLite oficial compilado a WASM)** ejecutado en el WebView, con el archivo `.db` persistido mediante `tauri-plugin-fs`.

## Decisión
Opción 3. La base de datos es un archivo SQLite estándar (`%APPDATA%\com.monto.finanzas\monto.db`) que se carga en memoria al abrir y se persiste:
- con **escritura atómica** (`monto.db.tmp` → `rename`) y recuperación si se interrumpe;
- de forma **agrupada** (400 ms tras el último cambio) y forzada al cerrar la ventana o bloquear;
- **cifrado opcional**: si el usuario define contraseña, el archivo completo se guarda como `MONTOENC1 | salt | iv | AES-256-GCM(db)` con clave derivada por PBKDF2-SHA256 (310 000 iteraciones).

## Consecuencias
- Consultas síncronas y rápidas en la interfaz; misma capa de datos en la app, el navegador y las pruebas (Vitest ejecuta SQLite real).
- Cifrado completo del archivo sin dependencias nativas.
- El archivo sin cifrar es SQLite estándar: se puede abrir con DB Browser for SQLite.
- Límite práctico: la base de datos completa reside en memoria. Para un hogar (decenas de miles de movimientos y comprobantes de hasta 5 MB) es adecuado; si creciera mucho, se puede migrar a SQLite nativo manteniendo el mismo esquema.
