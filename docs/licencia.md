# Licencia

> **Decisión (2026-11-06):** el titular eligió la licencia **MIT** ([LICENSE](../LICENSE)). Abajo se conserva la evaluación de opciones como referencia.

| Opción | Qué permite | Ideal si… | Consideraciones |
|---|---|---|---|
| **MIT** | Uso, copia, modificación y venta, incluso en software cerrado, manteniendo el aviso de copyright. | Quieres máxima adopción y no te importa que otros creen productos cerrados a partir del tuyo. | Muy simple y la más popular. Sin protección de patentes explícita. |
| **Apache 2.0** | Lo mismo que MIT más una concesión explícita de patentes y la obligación de indicar cambios. | Prefieres permisividad con más protección legal. | Ligeramente más larga; compatible con GPLv3. |
| **GPL-3.0** | Uso y modificación libres; las versiones distribuidas deben publicarse con la misma licencia. | Quieres que toda mejora siga siendo libre. | Impide su uso en productos cerrados distribuidos. |
| **AGPL-3.0** | Como GPL, y además cubre el uso a través de la red. | Te preocupa que alguien lo ofrezca como servicio sin liberar cambios. | Muy protectora; puede desalentar a empresas. |
| **Propietaria / todos los derechos reservados** | Nada sin tu permiso expreso. | Quieres comercializar Monto o mantener el control total. | El repositorio puede ser público o privado; conviene un texto de términos de uso. |

## Recomendación
- Si el objetivo es **portafolio y comunidad**: **MIT**.
- Si el objetivo es **comercializar** Monto más adelante: mantener **propietaria** por ahora (se puede abrir después; cerrar una licencia libre ya publicada no es posible para las versiones existentes).

Aplicado: archivo `LICENSE`, campo `license` en `package.json` y `src-tauri/Cargo.toml`, y README actualizado.

Las fuentes tipográficas incluidas (Inter Tight, Instrument Serif) usan **SIL Open Font License 1.1** y las dependencias de npm/Rust mantienen sus propias licencias (MIT/Apache/BSD/ISC).
