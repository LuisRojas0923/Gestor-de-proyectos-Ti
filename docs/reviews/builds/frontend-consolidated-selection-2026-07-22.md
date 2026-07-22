# Revisión frontend — selección Excel en tabla consolidada

**Fecha:** 2026-07-22  
**Modo:** read-only  
**Archivos revisados:** `frontend/src/components/ConsolidatedTableById.tsx`, `frontend/src/components/molecules/ColumnFilterPopover.tsx`, `frontend/src/components/__tests__/ConsolidatedTableById.test.tsx`

## Decisión

**Bloqueado para implementar literalmente la propuesta**, hasta corregir la semántica de `??` y cubrir el estado `null` en todos los consumidores. El modelo `Set<string> | null` es adecuado después de esa corrección.

## Hallazgos bloqueantes

1. **`??` no preserva `null`.** `null ?? new Set<string>()` devuelve el `Set` vacío y, bajo el contrato propuesto, convierte “ninguno” en “todos”. Para preservar la distinción se debe aplicar fallback únicamente cuando el valor sea `undefined` (`value === undefined ? new Set<string>() : value`) o aceptar `undefined` directamente en la prop. El `||` actual tiene el mismo defecto.
2. **Deben actualizarse todas las ramas de estado.** El filtrado, `hasActiveFilters`, el punto indicador y el popover deben tratar explícitamente: `undefined`/vacío como todos, `null` como ninguno y `Set` no vacío como parcial. Nunca se debe leer `.size` o `.has` sobre `null`.
3. **Toggle del último valor.** Al desmarcar el último elemento debe guardarse `null`; al hacer click sobre una opción desde `null`, debe crearse un `Set` parcial con esa opción. Al alcanzar todas las opciones, debe normalizarse a `new Set<string>()`. La comparación debe ser por valores, no solo por tamaños, para evitar problemas con opciones obsoletas.

## Riesgos React/TypeScript

- Usar un alias explícito (`Set<string> | null`) y clonar siempre los `Set`; no mutar el valor recibido desde el estado.
- `ColumnFilterPopover.selectedValues` debe aceptar `Set<string> | null`. Si se usa `aria-checked` en el `Button` atómico, el cambio de su interfaz debe viajar junto con la implementación; el cambio actual de `Button.tsx` ya cubre ese contrato.
- El estado `null` no debe mezclarse accidentalmente con `useColumnFilters`/`DataTable`, que actualmente usan `Record<string, Set<string>>`; el alcance revisado solo usa este popover desde `ConsolidatedTableById`.
- El popover debe renderizar `aria-checked=false` para `null`, `true` para vacío/parcial seleccionado y mantener navegación por teclado con `role="checkbox"`.

## UX y diseño atómico

- Contador recomendado: `0 de N` para `null`, `N de N` para vacío y `k de N` para parcial; debe contar `options`, no solo las opciones visibles tras buscar.
- El indicador del encabezado debe activarse para `null` y para un `Set` parcial, pero no para un `Set` vacío. No debe depender solo del color: añadir nombre accesible/estado textual.
- “Todo” y “Limpiar” deben producir `new Set<string>()`, dejar todos los checks marcados, retirar el indicador y restaurar todas las filas. Conviene aclarar que “Todo” afecta todas las opciones de la columna, no solo las coincidencias de búsqueda.
- Se reutilizan `Button`, `Input` y `Text`, además del portal y encabezado sticky. Persisten riesgos no introducidos por esta propuesta: colores Tailwind hardcodeados en ambos archivos y el checkbox visual custom en vez del átomo `Checkbox`; migrarlos a tokens/átomos antes de ampliar el patrón.
- El `dialog` actual cierra con Escape y click exterior, pero no tiene `aria-modal` ni focus trap. Si se mantiene como popover no modal, documentar esa decisión; si se trata como modal, completar `aria-modal`, focus trap y bloqueo de scroll.

## Pruebas necesarias

- Estado inicial: todas las opciones `aria-checked=true`, contador `N de N`, sin indicador y todas las filas visibles.
- Desmarcar una opción: selección parcial, `aria-checked=false` solo para esa opción, contador `N-1 de N`, indicador activo y filtrado correcto.
- Desmarcar la última opción: selección `null`, todas falsas, contador `0 de N`, indicador activo y estado vacío de resultados sin excepción.
- Desde `null`, seleccionar una opción; seleccionar después todas las restantes y verificar normalización a `Set` vacío, `N de N`, indicador apagado y todas las filas.
- Verificar que `Todo` y `Limpiar` normalizan a vacío desde estado parcial y desde `null`, y que el valor `null` no se pierde al abrir/re-renderizar el popover.
- Cubrir columnas de una sola opción, sin opciones, búsqueda activa, filtros simultáneos Estado/Progreso y `aria-checked` tras cada transición.
- Ejecutar desde `frontend/`: `npm run lint`, `npm run test` y `npm run build`. No se ejecutaron por las restricciones read-only del subagente.

## Límites y estado actual

Ambos archivos permanecen bajo el límite de 550 líneas. La implementación actual todavía no puede representar “ninguno”: el último toggle vuelve a `Set` vacío, que significa “todos”.
