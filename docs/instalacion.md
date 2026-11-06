# Guía de instalación

## Usuarios (Windows 10/11)
1. Descarga `Monto_x.y.z_x64.zip` desde [Releases](https://github.com/eperez98/monto/releases) y descomprímelo.
2. (Opcional) Verifica la suma: `Get-FileHash .\Monto_0.4.8-beta.3_x64-setup.exe -Algorithm SHA256` y compárala con `SHA256SUMS.txt`.
3. Ejecuta el instalador y elige el idioma (español o inglés). Se instala para tu usuario (sin permisos de administrador) en `%LOCALAPPDATA%\Monto` y crea accesos directos en el menú Inicio y el escritorio.
4. Si aparece **Windows SmartScreen** (el instalador aún no está firmado): *Más información → Ejecutar de todas formas*.

### Actualizar
Ejecuta el instalador de la nueva versión sobre la existente. Tus datos (`%APPDATA%\com.monto.finanzas`) **no se tocan**; las migraciones de la base de datos se aplican automáticamente al abrir. Recomendado: crear una copia en *Configuración → Datos y copias* antes de actualizar.

### Desinstalar
*Configuración de Windows → Aplicaciones → Monto → Desinstalar*. Los datos se conservan salvo que marques la opción de borrarlos; para eliminarlos manualmente borra `%APPDATA%\com.monto.finanzas`.

### Mover a otro equipo
*Exportar respaldo (.monto)* en el equipo antiguo → *Importar respaldo* en el nuevo.

## Desarrolladores
Requisitos: Node.js 22, Rust estable y los [prerrequisitos de Tauri](https://tauri.app/start/prerequisites/) (en Windows: Microsoft C++ Build Tools y WebView2).

```bash
npm ci
npm run tauri dev      # escritorio en modo desarrollo
npm run tauri build    # genera src-tauri/target/release/bundle/nsis/*-setup.exe
```

Prueba automática de instalación (PowerShell, Windows):
```powershell
./scripts/windows-smoke-test.ps1 -Installer .\src-tauri\target\release\bundle\nsis\Monto_0.4.8-beta.3_x64-setup.exe
```
