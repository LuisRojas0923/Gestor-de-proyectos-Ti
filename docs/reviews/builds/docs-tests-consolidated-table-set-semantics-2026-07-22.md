# Revisión docs/tests — semántica `Set` del filtro de columnas

**Fecha:** 2026-07-22  
**Alcance:** `frontend/src/components/__tests__/ConsolidatedTableById.test.tsx` y el contrato observable de `ConsolidatedTableById`/`ColumnFilterPopover`  
**Modo:** revisión estática read-only  
**Resultado:** `blocked`

## Veredicto

La suite actual cubre 11 pruebas y ya verifica el flujo parcial `aria-checked="true" → "false"`, pero no cubre la frontera entre `Set` vacío, todos los valores y ningún valor. Además, la implementación observada hace que al desmarcar la última opción el `Set` quede vacío y vuelva a interpretarse como “todos”; por tanto, los escenarios de “ninguno” y de reactivación desde “ninguno” no están protegidos y actualmente no son alcanzables con el comportamiento esperado.

`Limpiar` debe conservar su contrato existente: `Set` vacío y todas las filas visibles. No debe reutilizarse esa misma aserción como prueba de “ninguno”.

## Cobertura existente relevante

- La prueba de selección de `pendiente` comprueba el atributo ARIA antes y después del primer click y verifica que desaparece `Tarea 2`.
- La misma prueba comprueba que `Limpiar` vuelve a mostrar `Tarea 2`, pero no confirma que vuelvan **todas** las filas ni el estado ARIA de todas las opciones.
- Hay pruebas de opciones normalizadas, búsqueda, Escape, click exterior, foco y responsive.
- No existe una prueba para la última opción, una columna con una sola opción, reactivación desde ningún valor, `Todo` ni la matriz completa de estados `aria-checked`.

## Causa de la inconsistencia observable

- `filteredActividades` trata cualquier `Set` vacío como ausencia de filtro (`ConsolidatedTableById.tsx:115-131`).
- El popover también pinta cada opción como marcada cuando `selectedValues.size === 0` (`ColumnFilterPopover.tsx:173-180`).
- Al quitar la última opción, el callback de `ConsolidatedTableById` devuelve `new Set()` (`ConsolidatedTableById.tsx:389-401`); ese mismo valor vuelve a significar “todos”.
- `Todo` guarda el conjunto completo, mientras `Limpiar` guarda un conjunto vacío. Ambos deben mostrar todas las filas, aunque su representación interna sea distinta.

## Casos mínimos propuestos

Se requieren cinco casos focalizados. Las aserciones de `aria-checked` deben formar parte de cada caso, no quedar solo en la transición parcial ya existente.

1. **Última opción en una columna con varias opciones**
   - Abrir `Estado` con las tres opciones de `mockData`.
   - Desmarcar una por una las tres opciones.
   - Esperar que no aparezca ninguna de `Tarea 1`, `Tarea 2` o `Tarea 3`, y que se muestre el estado “Sin resultados”.
   - Confirmar `aria-checked="false"` en las tres opciones.
   - Este caso debe fallar con la implementación actual al hacer click en la última opción, porque el `Set` vacío vuelve a mostrar todas las filas.

2. **Columna con una sola opción**
   - Renderizar datos donde `Estado` tenga un único valor repetido.
   - Confirmar que la única opción empieza con `aria-checked="true"`.
   - Desmarcarla y esperar cero filas y `aria-checked="false"`.
   - Aísla el borde `allValues.length === 1`, sin depender del orden de varias opciones.

3. **Reactivación desde ningún valor**
   - Llegar primero al estado sin opciones seleccionadas del caso 1.
   - Seleccionar solo `pendiente`.
   - Esperar únicamente `Tarea 2` visible; `Tarea 1` y `Tarea 3` deben permanecer ocultas.
   - Confirmar `pendiente=true` y las otras dos opciones `false`.
   - Este caso documenta que “ninguno” debe ser un estado distinto de “todos”; con el código actual no puede alcanzarse correctamente.

4. **Acción `Todo`**
   - Partir de una selección parcial, por ejemplo desmarcando `pendiente`.
   - Pulsar `Todo`.
   - Confirmar las tres filas visibles y `aria-checked="true"` para cada opción.

5. **Acción `Limpiar`**
   - Partir de una selección parcial.
   - Pulsar `Limpiar`.
   - Confirmar las tres filas visibles —incluidas `Tarea 1`, `Tarea 2` y `Tarea 3`— y `aria-checked="true"` en todas las opciones.
   - No debe esperarse cero filas: el contrato vigente de `Limpiar` es mostrar todo.

## Pruebas requeridas y evidencia

- Añadir los cinco casos anteriores a la suite existente; no hace falta crear una suite nueva ni tocar backend, esquema/MER, ADR o RBAC.
- Ejecutar desde `frontend/`: `npm run test -- src/components/__tests__/ConsolidatedTableById.test.tsx`.
- La revisión no ejecutó Vitest/build/lint por las restricciones read-only del subagente. La evidencia previa reportada para el alcance ARIA (`146 passed, 2 skipped`) valida el baseline anterior, pero no cubre estos nuevos caminos.
- `testing/CATALOGO_PRUEBAS.md` ya registra esta suite; solo requeriría actualización si el proyecto exige detallar cada caso individual.

## Razones de bloqueo

1. La suite no detecta la regresión crítica de “última opción → ningún resultado”.
2. La semántica actual colapsa “ninguno” y “todos” en `Set()`; los casos de reactivación y de columna univaluada quedarían sin contrato automatizado.
