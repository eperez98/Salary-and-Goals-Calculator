// Prints release notes for a tag from CHANGELOG.md plus update instructions.
// Usage: node scripts/release-notes.mjs v0.4.8-beta.3
import { readFileSync } from 'node:fs';
const tag = process.argv[2] ?? '';
const version = tag.replace(/^v/, '');
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const re = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|^\\[[^\\]]+\\]:|$(?![\\s\\S]))`, 'm');
const section = changelog.match(re)?.[1]?.trim() ?? '_Consulta CHANGELOG.md para el detalle de cambios._';
console.log(`# Monto ${tag}

${section}

---

## Descarga

| Archivo | Uso |
| --- | --- |
| \`Monto_${version}_x64-setup.exe\` | **Recomendado.** Instalador para Windows 10/11 en español o inglés (sin permisos de administrador). |
| \`Monto_*_x64_es-ES.msi\` / \`Monto_*_x64_en-US.msi\` | Instaladores MSI (español / inglés) para despliegues gestionados. |
| \`version.json\` | Información de la versión publicada. |
| \`SHA256SUMS.txt\` | Sumas de verificación para comprobar la integridad de las descargas. |

## Instalación y actualización

1. Descarga \`Monto_${version}_x64-setup.exe\` y ejecútalo.
2. Si ya tienes Monto instalado, el instalador actualiza la aplicación **sin borrar tus datos**: la base de datos vive en \`%APPDATA%\\com.monto.finanzas\\monto.db\`, fuera de la carpeta del programa.
3. Recomendado antes de actualizar: *Configuración → Datos y copias → Crear copia ahora*.
4. Windows SmartScreen puede mostrar un aviso porque el instalador aún no está firmado con un certificado de código. Pulsa *Más información → Ejecutar de todas formas* si descargaste el archivo desde esta página oficial y la suma SHA-256 coincide.
`);
