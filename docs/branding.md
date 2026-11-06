# Nombre, identidad y branding

## 1. Propuestas de nombre comercial

Criterios: corto (≤ 8 letras), fácil de pronunciar en español e inglés, memorable, con vínculo a Panamá o al dinero, sin connotaciones negativas, y con potencial de dominio/marca.

| # | Nombre | Concepto | Memorabilidad | Identidad local | Potencial comercial | Riesgos |
|---|--------|----------|:---:|:---:|:---:|---|
| 1 | **Monto** | *Monto* = cantidad de dinero; palabra cotidiana en banca y facturas | ★★★★★ | ★★★★☆ | ★★★★★ | Palabra común: la marca se apoya en el logotipo y el wordmark. |
| 1b | Balbo *(primera elección, descartada)* | Del *balboa* y su signo **B/.** | ★★★☆☆ | ★★★★★ | ★★★☆☆ | En pruebas con el titular sonaba poco natural como nombre de app. |
| 2 | **Quincena** | El ritmo de pago más común en Panamá | ★★★★☆ | ★★★★★ | ★★★☆☆ | Palabra genérica, difícil de registrar como marca. |
| 3 | **Cuadra** | “Cuadrar las cuentas” | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | Ambigua (cuadra = manzana de calles / establo). |
| 4 | **Nido** | El hogar y el ahorro familiar | ★★★★☆ | ★★☆☆☆ | ★★★★☆ | Muy usado en marcas de seguros e inmobiliarias. |
| 5 | **Saldo Claro** | Transparencia del saldo real | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ | Dos palabras; parecido a servicios bancarios. |
| 6 | **Alcancía** | Ahorro cotidiano | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ | Largo y genérico; evoca solo ahorro. |
| 7 | **Faro** | Guía financiera | ★★★★☆ | ★★☆☆☆ | ★★★☆☆ | Nombre muy común en marcas. |
| 8 | **Monedo** | Moneda + “yo” | ★★★☆☆ | ★★☆☆☆ | ★★★☆☆ | Suena a juego; poco serio para finanzas. |
| 9 | **PanaFlow** | Panamá + flujo de caja | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | Mezcla de idiomas; “pana” es coloquial. |
| 10 | **Brújula** | Orientación | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ | Difícil de escribir sin tilde en dominios. |
| 11 | **FinanZen** *(referencia)* | Finanzas + calma | ★★★☆☆ | ★☆☆☆☆ | ★★★☆☆ | Existen productos con nombres muy similares. |
| 12 | **MiConta** *(referencia)* | Contabilidad personal | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ | Suena a software contable para pymes. |

Otros conceptos de referencia evaluados: *CashFlow* (genérico, en inglés), *SaldoPlus* (estilo bancario anticuado), *EcoFinanzas* (confusión con ecología), *AhorraYa* (promocional, limita el alcance a ahorro).

## 2. Los tres mejores

1. **Monto** — corto (5 letras), profesional y entendible en todo el mundo hispanohablante; habla directamente de dinero sin sonar bancario.
2. **Cuadre** — de “cuadrar las cuentas”; muy significativo, pero menos internacional.
3. **Nido** — cálido y familiar, aunque con poca diferenciación.

> Historial: la primera selección fue *Balbo* (por el balboa y su signo B/.). El titular la descartó porque sonaba extraña como nombre comercial y se eligió **Monto** (2026-11-06).

## 3. Selección: **Monto**

*“Monto — tus finanzas, en orden.”*

- Funciona igual en PAB y USD y no depende de una moneda concreta.
- Se convierte en logotipo con naturalidad: una **M** trazada como una línea de gráfico, cuyo trazo derecho sube en oro (crecimiento y valor).
- 5 letras, pronunciación inequívoca en español e inglés y un sonido seguro y moderno.

## 4. Identidad visual

### Logotipo

| Archivo | Uso |
|---|---|
| `assets/brand/logo-mark.svg` / `.png` | Isotipo (M) sobre fondos claros |
| `assets/brand/logo-horizontal.svg` / `.png` | Isotipo + wordmark, cabeceras y documentos |
| `assets/brand/logo-vertical.svg` / `.png` | Versión apilada con lema, portadas |
| `assets/brand/app-icon.svg`, `app-icon-1024.png`, `app-icon.ico` | Icono de la aplicación de Windows |
| `assets/brand/favicon-32.png`, `public/favicon.svg` | Favicon |
| `src-tauri/icons/*` | Iconos generados para el instalador y el ejecutable (`npm run icons`) |

Construcción: la “M” se dibuja con dos trazos de 16 u con extremos y uniones redondeados. El primero (pierna izquierda y diagonal) va en el color de marca o crema; el segundo (subida y pierna derecha) en un degradado **oro** (`#E8930F` → `#FFD36E`), más alto que el izquierdo para sugerir crecimiento. En el splash ambos trazos se dibujan progresivamente.

### Colores del logotipo (medianoche + oro)

| Uso | Color |
|---|---|
| Fondo del icono | degradado `#14304D` → `#0A1626` (azul medianoche) |
| Trazo izquierdo | `#F5F3EE` sobre fondo oscuro · `#14304D` sobre fondo claro |
| Trazo derecho | degradado oro `#E8930F` → `#FFD36E` |

Se evaluaron también *océano + coral* e *índigo + lima*; se eligió medianoche + oro por su asociación con el dinero y el contraste con el verde de la interfaz.

### Paleta de la interfaz

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `brand` (Pino) | `#12291F` | `#0D1F17` | Color principal, botones primarios, tarjetas destacadas |
| `brand-2` (Bosque) | `#1F4B39` | `#1A3E30` | Barras de ingresos, iconos activos |
| `emerald` | `#1FA971` | `#34C98D` | Balances positivos, éxito, progreso |
| `sage` (Salvia) | `#A8C2A3` | `#6F9270` | Barras de gasto, gráficos secundarios |
| `coral` | `#DE5E48` | `#F07A64` | Gastos, alertas, acciones destructivas |
| `amber` | `#C98A1E` | `#E5A93D` | Avisos, estimaciones |
| `blue` | `#3C6E9E` | `#6EA0D2` | Transferencias, información |
| `bg` | `#F3F1EC` | `#0A100D` | Fondo cálido (papel) |
| `surface` | `#FFFFFF` | `#111915` | Tarjetas |
| `ink` / `ink-2` / `muted` | `#121816` / `#4A5550` / `#89928D` | `#EDF2EF` / `#B2BDB7` / `#76827C` | Textos |

### Tipografía

- **Inter Tight** (variable): interfaz, cifras con `tabular-nums` y tracking negativo en titulares.
- **Instrument Serif Italic**: subtítulos editoriales y lemas (“tus finanzas, en orden”).
- Ambas fuentes se empaquetan en la app (sin descargas: funciona sin conexión). Licencia SIL Open Font License.

### Iconografía

Sistema propio en `src/icons/index.tsx`: 24 px, trazo de 1,7 px con extremos redondeados y una capa *duotono* que se ilumina al 16–20 % en hover y en estado activo. Incluye ingresos, gastos, transferencias, bancos, tarjetas, vivienda, alimentación, transporte, mascotas, servicios, ahorros, préstamos, familia, presupuestos, informes, configuración y más de 40 iconos de apoyo.

Estados:
- **Inactivo**: color `muted`, sin relleno.
- **Hover**: color `ink`, relleno duotono 16 %.
- **Activo**: color de marca, relleno duotono 20 %.
