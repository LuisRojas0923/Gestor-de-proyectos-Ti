# Revisión docs/tests final — cobertura triestado de `ConsolidatedTableById`

**Fecha:** 2026-07-22  
**Alcance:** `frontend/src/components/__tests__/ConsolidatedTableById.test.tsx` y evidencia final del cambio triestado  
**Modo:** revisión estática read-only  
**Resultado:** `approved_with_risks`

## Veredicto

La cobertura final protege los caminos solicitados del filtro de Estado:

- **Última opción → ninguno:** desmarca las tres opciones, comprueba que no queda ninguna tarea visible y que todas tienen `aria-checked="false"`.
- **Reactivación:** desde ese estado selecciona únicamente `pendiente`, vuelve a mostrar `Tarea 2`, mantiene oculta `Tarea 1` y comprueba `aria-checked="true"`.
- **Columna con una opción:** desmarca y vuelve a marcar la única opción, verificando cero filas, una fila visible y la transición ARIA `true → false → true`.
- **`Todo`:** restaura la selección canónica de todas las opciones, elimina el indicador amarillo y deja todos los checks en `true`.
- **`Limpiar`:** conserva el contrato vigente de mostrar todo, deja todos los checks en `true` y retira el indicador.
- **`aria-checked` e indicador:** quedan cubiertos tanto en transiciones parciales como en la normalización de `Todo`/`Limpiar`.

No hay un bloqueo de cobertura dentro del diff revisado.

## Evidencia proporcionada

- Vitest: **149 passed / 2 skipped**.
- Build frontend: **exitoso**.
- `tsc -b`: **falla en `RequirementsTab.tsx`**, fuera de los archivos del diff revisado; permanece como riesgo de la puerta global, no como regresión atribuible al cambio triestado.
- El revisor no ejecutó Vitest, build ni TypeScript por las restricciones read-only del rol.

## Bloqueos y riesgos restantes

1. Si la integración exige `tsc -b` completamente verde, el fallo externo en `RequirementsTab.tsx` sigue siendo el único bloqueo de esa puerta global y debe resolverse en un cambio separado.
2. Como hardening no bloqueante, podría añadirse una aserción directa del indicador amarillo en el estado `null` y comprobar explícitamente las tres filas tras `Todo` y `Limpiar`; la cobertura actual ya verifica el resultado observable esencial.

No aplican cambios a backend, esquema/MER, RBAC ni ADR. `testing/CATALOGO_PRUEBAS.md` ya registra la suite de la tabla consolidada.

## Trazabilidad

Debe conservarse este reporte como referencia final de la cobertura triestado con la evidencia de **149/2**. El reporte previo bloqueado sobre semántica `Set` debe mantenerse como histórico y considerarse superseded, sin usarlo como veredicto vigente.
