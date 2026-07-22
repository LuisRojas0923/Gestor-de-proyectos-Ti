# Revisión frontend — estructura final de `ConsolidatedTableById`

**Fecha:** 2026-07-22  
**Alcance:** `ConsolidatedTableById.tsx` y `ConsolidatedTableById.test.tsx`  
**Modo:** revisión read-only  
**Proyecto:** Gestor-de-proyectos-Ti

## Veredicto

**`approved_with_risks`** — la estructura final de la tabla cumple el contrato solicitado y no presenta bloqueos para este alcance.

## Evidencia estructural

- `COLUMNS` contiene seis columnas.
- Los dos caminos de renderizado de encabezados generan seis `<th>` y todos incluyen `scope="col"`.
- Cada fila de datos genera exactamente seis `<td>`.
- La celda decorativa absoluta fue eliminada.
- La franja visual se conserva en la primera celda real mediante `border-l-[6px] border-l-[var(--deep-navy)]`.
- La prueba focalizada cubre estos invariantes y reporta **15/15**.

## Layout y responsive

- La tabla usa `table-fixed` y `border-collapse`.
- El encabezado usa `sticky top-0` dentro de un contenedor con `overflow-auto` y altura máxima.
- `min-w-[1000px]` conserva el ancho fijo; en móvil permite desplazamiento horizontal sin romper las seis columnas.
- El contenido de celdas mantiene los átomos y moléculas existentes (`Text`, `Button`, `Badge`, `Icon`, `ColumnFilterPopover`).
- El componente (440 líneas) y la prueba (374 líneas) permanecen bajo el límite de 550 líneas.

## Evidencia de validación reportada

- Prueba focalizada: **15/15 PASS**.
- Suite completa: **150 passed / 2 skipped**.
- Build: **exitoso**.
- Lint focalizado: **limpio**.

El revisor no ejecutó npm, build ni lint por las restricciones read-only del rol; los resultados anteriores son la evidencia proporcionada para este estado final.

## Riesgos no bloqueantes

1. El archivo conserva algunas clases de color Tailwind directas (`blue`, `red`, `gray`, `indigo`, `white`) en estados y superficies; conviene migrarlas gradualmente a tokens CSS.
2. El `catch` usa `(e as Error)` en lugar de validar `unknown` con `instanceof Error`.

## Checks requeridos

- `npm run test -- src/components/__tests__/ConsolidatedTableById.test.tsx`
- `npm run test`
- `npm run lint`
- `npm run build`

## Hallazgos bloqueantes

Ninguno.
