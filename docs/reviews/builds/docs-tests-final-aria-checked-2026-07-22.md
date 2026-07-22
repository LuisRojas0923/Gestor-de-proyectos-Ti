# Revisión docs/tests final — `aria-checked`

**Fecha:** 2026-07-22  
**Alcance:** `Button.tsx`, `ColumnFilterPopover.tsx` y `ConsolidatedTableById.test.tsx`  
**Modo:** read-only

## Veredicto

**`approved_with_risks` para el alcance focalizado.** La cobertura integrada satisface el bloqueo original: obtiene la opción con `role="checkbox"`, comprueba `aria-checked="true"` antes del clic y `aria-checked="false"` después del cambio de estado. El arreglo también declara, desestructura y reenvía el atributo desde `Button` al `<button>` nativo; `ColumnFilterPopover` ya no conserva el import muerto de `Checkbox`.

## Evidencia evaluada

- Vitest completo: **146 passed / 2 skipped**, reportado por el orquestador; no se ejecutó independientemente bajo las restricciones read-only del revisor.
- Build: **exitoso**, coherente con el alcance frontend.
- Lint focalizado: **limpio**, sin problemas estáticos visibles en el diff.
- `tsc -b`: **falla** en `RequirementsTab.tsx` por sintaxis preexistente fuera del diff de esta corrección (la apertura de `List` alrededor de las líneas 257–272 queda sin cierre).
- Lint global: **503 errores preexistentes** reportados; no atribuidos a los tres archivos revisados.

## Gaps y bloqueos restantes

1. Si la política de integración exige TypeScript y lint global completamente verdes, el repositorio conserva esos dos bloqueos de baseline y deben resolverse aparte.
2. No hay prueba unitaria directa de `Button` para el tercer estado `mixed`; es hardening opcional, no un gap del bloqueo actual porque el consumidor solo usa booleanos y la integración cubre `true → false`.
3. El reporte previo `docs-tests-consolidated-table-aria-checked-2026-07-22.md` todavía expresa el estado bloqueado y no ejecutado; debe tratarse como histórico/superseded para no mezclarlo con esta evaluación final.

No aplican backend, esquema/MER ni ADR: el cambio es exclusivamente de semántica y cobertura frontend, y la suite ya aparece en `testing/CATALOGO_PRUEBAS.md`.
