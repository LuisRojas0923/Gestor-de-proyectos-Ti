# Revisión frontend — estado final de filtros de `ConsolidatedTableById`

**Fecha:** 2026-07-22  
**Build:** Semántica de selección `Set`/`null` y accesibilidad del filtro por columna  
**Autor:** `frontend-reviewer`  
**Modo:** revisión read-only  
**Proyecto:** Gestor-de-proyectos-Ti

## Archivos revisados

- `frontend/src/components/ConsolidatedTableById.tsx` — 439 líneas.
- `frontend/src/components/molecules/ColumnFilterPopover.tsx` — 222 líneas.
- `frontend/src/components/__tests__/ConsolidatedTableById.test.tsx` — 352 líneas.

## Verificación funcional

- **Set vacío o `undefined`: todos.** El fallback solo convierte `undefined` en `new Set()`; el `null` se conserva.
- **`null`: ninguno.** El filtrado devuelve cero filas y el popover muestra todas las opciones con `aria-checked="false"` y contador `0`.
- **Set no vacío: parcial.** El filtrado usa pertenencia; el indicador se muestra y el contador refleja `size`.
- **Último toggle:** al desmarcar la última opción se normaliza a `null`; al volver a seleccionar una opción se recupera la selección.
- **Columna unitaria:** el ciclo desmarcar/marcar funciona y el estado de una sola opción se normaliza correctamente.
- **Todo/Limpiar:** ambas acciones escriben explícitamente `new Set<string>()`, representando todos y retirando el indicador.
- **Coherencia visual y ARIA:** el punto `bg-yellow-400`, el contador y `aria-checked` derivan de la misma semántica (`null`/vacío/parcial).
- **Popover:** usa `role="dialog"`, `aria-labelledby`, portal, Escape, clic externo, autofocus y reposicionamiento ante viewport/scroll.

## Hallazgos bloqueantes

Ninguno dentro del alcance funcional solicitado.

## Riesgos no bloqueantes de diseño/mantenibilidad

1. Los archivos revisados conservan algunas clases de color Tailwind directas (`white`, `neutral`, `red`, `gray`, `indigo`) en estados y superficies, en lugar de tokens CSS. No afecta la semántica validada, pero mantiene deuda de cumplimiento del sistema de diseño.
2. El `catch` de `ConsolidatedTableById.tsx` usa una aserción `(e as Error)` en vez de `unknown` + `instanceof Error`. No introduce una regresión en los escenarios revisados, pero conviene corregirlo en una tarea separada.

## Evidencia de validación reportada

- Test focalizado: **14/14 PASS**.
- Suite completa: **149 passed / 2 skipped**.
- Build: **exitoso**.
- Lint focalizado: **limpio**.
- `tsc` global: falla únicamente en `RequirementsTab.tsx` por sintaxis preexistente, fuera de estos archivos.

El revisor no ejecutó comandos de npm/build/lint por el protocolo read-only del subagente; la evidencia anterior corresponde a la validación entregada para este estado final.

## Decisión final

**`approved_with_risks`** — la semántica de filtros y sus estados accesibles quedan aprobados; permanecen únicamente riesgos no bloqueantes de tokens de color y manejo tipado del error.
