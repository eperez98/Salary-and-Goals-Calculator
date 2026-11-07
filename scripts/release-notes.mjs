// Prints release notes for a tag from CHANGELOG.md plus update instructions.
// Usage: node scripts/release-notes.mjs v0.5.2-beta.5
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
| \`Monto_${version}_x64.zip\` | **Descarga esto.** Contiene el instalador \`Monto_${version}_x64-setup.exe\` (Windows 10/11, español o inglés, sin permisos de administrador), \`SHA256SUMS.txt\` y \`LEEME.txt\`. |

Los archivos *Source code* que GitHub añade automáticamente son el código fuente; no hacen falta para instalar Monto.

## Instalación y actualización

1. Descarga \`Monto_${version}_x64.zip\`, descomprímelo y ejecuta \`Monto_${version}_x64-setup.exe\`.
2. Si ya tienes Monto instalado, el instalador actualiza la aplicación **sin borrar tus datos**: la base de datos vive en \`%APPDATA%\\com.monto.finanzas\\monto.db\`, fuera de la carpeta del programa.
3. Recomendado antes de actualizar: *Configuración → Datos y copias → Crear copia ahora*.
4. Windows SmartScreen puede mostrar un aviso porque el instalador aún no está firmado con un certificado de código. Pulsa *Más información → Ejecutar de todas formas* si descargaste el archivo desde esta página oficial y la suma SHA-256 coincide.
`);
