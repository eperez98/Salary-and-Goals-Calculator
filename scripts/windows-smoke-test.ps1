# Installs the NSIS installer silently, launches Monto, verifies that the
# app created its local SQLite database, closes it and uninstalls it while
# checking that user data survives the uninstall (persistence across updates).
param([Parameter(Mandatory = $true)][string]$Installer)
$ErrorActionPreference = 'Stop'

Write-Host "Instalando $Installer ..."
$p = Start-Process -FilePath $Installer -ArgumentList '/S' -PassThru -Wait
if ($p.ExitCode -ne 0) { throw "El instalador terminó con código $($p.ExitCode)" }

$candidates = @("$env:LOCALAPPDATA\Monto\Monto.exe", "$env:LOCALAPPDATA\Programs\Monto\Monto.exe", "$env:ProgramFiles\Monto\Monto.exe")
$exe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) { throw "No se encontró Monto.exe tras la instalación" }
Write-Host "Ejecutable instalado: $exe"
$ver = (Get-Item $exe).VersionInfo
Write-Host "Versión del archivo: $($ver.FileVersion) · Producto: $($ver.ProductName)"

$startMenu = Get-ChildItem "$env:APPDATA\Microsoft\Windows\Start Menu\Programs" -Recurse -Filter 'Monto*.lnk' -ErrorAction SilentlyContinue
if (-not $startMenu) { throw "No se creó el acceso directo del menú Inicio" }
Write-Host "Acceso directo: $($startMenu[0].FullName)"

$uninstaller = Join-Path (Split-Path $exe) 'uninstall.exe'
if (-not (Test-Path $uninstaller)) { throw "No se encontró el desinstalador" }

Write-Host "Iniciando Monto..."
$app = Start-Process -FilePath $exe -PassThru
$db = "$env:APPDATA\com.monto.finanzas\monto.db"
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $db) { $ok = $true; break }
  if ($app.HasExited) { throw "Monto se cerró inesperadamente (código $($app.ExitCode))" }
}
if (-not $ok) { throw "Monto no creó su base de datos en $db en 60 s" }
$size = (Get-Item $db).Length
Write-Host "Base de datos SQLite creada: $db ($size bytes)"
$header = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($db)[0..15])
if (-not $header.StartsWith('SQLite format 3')) { throw "El archivo no es una base de datos SQLite válida" }
Write-Host "Cabecera SQLite verificada"
if ($app.HasExited) { throw "La aplicación no sigue en ejecución" }
Stop-Process -Id $app.Id -Force
Start-Sleep -Seconds 2

Write-Host "Desinstalando..."
$u = Start-Process -FilePath $uninstaller -ArgumentList '/S' -PassThru -Wait
# NSIS uninstallers re-launch themselves from %TEMP%; wait until files are gone.
for ($i = 0; $i -lt 60 -and (Test-Path $exe); $i++) { Start-Sleep -Seconds 1 }
if (Test-Path $exe) { throw "El ejecutable sigue presente tras desinstalar" }
if (-not (Test-Path $db)) { throw "Los datos del usuario se borraron al desinstalar" }
Write-Host "Desinstalación correcta; los datos del usuario se conservaron."
Write-Host "SMOKE TEST OK"
