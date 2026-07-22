# Revisión docs/tests — cobertura final de selección por teclado

**Fecha:** 2026-07-22  
**Alcance:** `frontend/src/components/__tests__/ConsolidatedTableById.test.tsx`, `ConsolidatedTableById.tsx`, `ColumnFilterPopover.tsx` y `Button.tsx`  
**Modo:** revisión estática read-only

## Veredicto

**`approved_with_risks` para los cuatro comportamientos solicitados.** El test final cubre la apertura con Enter, el foco automático del buscador y la alternancia de una opción con Space y Enter, incluyendo `aria-checked` en los estados intermedio y final.

## Cobertura confirmada

- **Apertura con Enter:** el trigger de Estado recibe foco y `fireEvent.keyDown(..., { key: 'Enter' })`; después aparece el diálogo. El handler de producción limita la activación a Enter/Space y ejecuta `preventDefault()`.
- **Foco al buscador:** tras abrir el diálogo, el test obtiene `Buscar en filtro de Estado` y confirma `toHaveFocus()`.
- **Space:** `Sin estado` recibe foco, se activa con Space, pasa a `aria-checked="false"` y desaparece `Tarea 3`.
- **Enter:** la misma opción se activa de nuevo con Enter, pasa a `aria-checked="true"` y `Tarea 3` reaparece.
- **Estado ARIA final:** la aserción final lee directamente `aria-checked="true"` del elemento con `role="checkbox"`; no depende únicamente de la clase visual.

## Riesgos y bloqueos restantes

1. **Evidencia de ejecución:** este revisor no ejecutó Vitest por las restricciones read-only. El comando focalizado pendiente es `cd frontend && npm run test -- src/components/__tests__/ConsolidatedTableById.test.tsx`.
2. **Navegación Tab real:** el test confirma transferencia de foco al buscador, pero no una secuencia real Tab/Shift+Tab; usa `.focus()` para la opción. `fireEvent` en jsdom no demuestra navegación nativa del navegador. Si ese contrato forma parte de la puerta de aceptación, requiere `user-event` ya aprobado o una prueba de navegador.
3. **Hardening:** el caso de teclado no aserta explícitamente `aria-expanded="true"` después de Enter ni verifica `keyUp` sin doble activación. El diálogo visible y el handler con `preventDefault()` sí evidencian la apertura, pero esas aserciones reforzarían el contrato.

No hay bloqueo de esquema/MER, backend, RBAC ni ADR: el alcance es exclusivamente frontend y la suite ya figura en `testing/CATALOGO_PRUEBAS.md`.
