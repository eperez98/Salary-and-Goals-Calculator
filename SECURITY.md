# Política de seguridad

Monto gestiona información financiera personal. La seguridad y la privacidad son requisitos de diseño, no extras.

## Versiones con soporte

| Versión | Soporte de seguridad |
|---|---|
| 1.x | ✅ |
| < 1.0 (calculadora en Python) | ❌ |

## Reportar una vulnerabilidad

**No abras un issue público.** Usa *Security → Report a vulnerability* (GitHub Private Vulnerability Reporting) en este repositorio e incluye:
- descripción y posible impacto,
- pasos para reproducirla y versión afectada,
- una prueba de concepto si es posible (sin datos reales).

Compromiso orientativo: acuse de recibo en 3 días hábiles, evaluación inicial en 10 días y corrección o mitigación coordinada antes de divulgar.

## Modelo de seguridad
- **Local primero**: la aplicación no tiene servidor, telemetría ni analítica y nunca envía tus datos. La CSP del WebView solo permite recursos propios (`default-src 'self'`).
- **Actualizaciones**: la única conexión de red es la consulta a la API pública de GitHub Releases, que se hace desde Rust solo cuando el usuario pulsa *Buscar actualizaciones* o activa la búsqueda automática. No se envía información personal (solo el *User-Agent* `Monto-Updater/<versión>`). El instalador descargado debe proceder de `github.com` y su SHA-256 debe coincidir con `SHA256SUMS.txt` de la misma versión antes de ejecutarse.
- **Permisos mínimos (Tauri capabilities)**: el WebView solo puede leer y escribir en la carpeta de datos de la app y en los archivos que el usuario elige expresamente mediante diálogos nativos.
- **Cifrado opcional**: con contraseña, toda la base de datos se guarda cifrada con AES-256-GCM; la clave se deriva con PBKDF2-SHA256 (310 000 iteraciones y sal aleatoria). La contraseña nunca se almacena. Una contraseña incorrecta simplemente no descifra el archivo.
- **Bloqueo**: bloqueo automático por inactividad y manual (`Ctrl + L`); al bloquear, la base de datos se guarda cifrada y se libera de memoria.
- **PIN por integrante**: se almacena como hash SHA-256 con sal propia; protege el cambio de usuario en un mismo equipo (no sustituye a la contraseña).
- **Integridad**: escritura atómica del archivo, `PRAGMA integrity_check` y validación de las copias antes de restaurar (con copia previa automática).
- **Instancia única**: impide que dos ventanas escriban el mismo archivo a la vez.

## Recomendaciones para proteger tus datos financieros
1. Activa la **contraseña** en *Configuración → Seguridad* si compartes el equipo, y usa una frase larga y única.
2. Guarda una **copia externa** (`.monto`) en un USB o disco cifrado; con contraseña, la copia exportada también queda cifrada.
3. Mantén Windows actualizado y usa **BitLocker** en portátiles.
4. Descarga Monto solo desde las *Releases* oficiales y verifica `SHA256SUMS.txt`.
5. No compartas archivos `.monto`, `.db`, informes exportados ni capturas con datos reales.
6. Si olvidas la contraseña no hay recuperación posible: esto es intencional.

## Fuera de alcance
- Ataques con acceso físico a un equipo desbloqueado con la sesión de Monto abierta.
- Malware con privilegios en el sistema operativo del usuario.
