# Revisión docs/tests — cobertura de teclado de `ConsolidatedTableById`

**Fecha:** 2026-07-22  
**Alcance:** `frontend/src/components/__tests__/ConsolidatedTableById.test.tsx`, `ConsolidatedTableById.tsx`, `ColumnFilterPopover.tsx`, `Button.tsx`  
**Modo:** revisión estática read-only

## Veredicto

**`blocked` para la cobertura solicitada.** La suite cubre foco inicial, foco del checkbox por `focus()`, foco restaurado al trigger y activación por clic, pero no demuestra la apertura con Enter ni la activación de una opción con Space y Enter. Tampoco valida navegación real con Tab/Shift+Tab.

## Evidencia

- `ConsolidatedTableById.test.tsx:271-289` valida `aria-expanded` y autofocus del buscador después de `fireEvent.click`, no después de Enter.
- `ConsolidatedTableById.test.tsx:366-383` enfoca una opción manualmente y ejecuta `fireEvent.click`; el nombre del caso no implica una prueba de teclado.
- `ConsolidatedTableById.test.tsx:291-310` sí protege cierre externo, `aria-expanded=false` y restauración de foco.
- `ColumnFilterPopover.tsx:204-210` usa un `<Button role="checkbox">` con `aria-checked` y `onClick`, pero no define `onKeyDown`.
- `Button.tsx:15,118` ya acepta y reenvía `onKeyDown`; no falta infraestructura de props en el átomo.
- `Checkbox.tsx` no participa en este flujo: el popover renderiza opciones mediante `Button`.
- `frontend/package.json` no incluye `@testing-library/user-event`.

## Casos mínimos requeridos

1. **Apertura con Enter:** enfocar el trigger de Estado, enviar Enter, comprobar `aria-expanded="true"`, dialog accesible `Filtrar: Estado` y foco en `Buscar en filtro de Estado`.
2. **Foco/navegación:** conservar la aserción de autofocus y restauración al trigger; para verificar la secuencia real de Tab/Shift+Tab se necesita `user-event` o una prueba de navegador. `fireEvent.keyDown(..., { key: 'Tab' })` no mueve el foco en jsdom y no es evidencia válida de navegación.
3. **Activación de opción:** enfocar `pendiente`, enviar Space (`key: ' '`, `code: 'Space'`) y comprobar desaparición de `Tarea 2` y `aria-checked="false"`; enviar Enter (`key: 'Enter'`) y comprobar reaparición y `aria-checked="true"`.
4. **Estado final ARIA:** la aserción final debe leer el atributo del elemento con `role="checkbox"`; no basta con verificar la clase visual del check.

## Evaluación de `onKeyDown`

Añadir handlers es válido **solo como comportamiento explícito de producción**, no como simulacro exclusivo para que pase el test. El handler debe vivir en el uso de la opción dentro de `ColumnFilterPopover`, reutilizar `onToggleOption`, llamar `preventDefault()` para evitar el clic nativo duplicado y cubrir Space y Enter. No se recomienda añadirlo globalmente a `Button` ni modificar el átomo `Checkbox`: el primero afectaría todos los botones y el segundo no está en la ruta revisada.

El trigger ya es un botón HTML nativo y los navegadores le proporcionan activación por teclado. Sin `user-event`, `fireEvent.keyDown` por sí solo no reproduce esa activación nativa. Si se desea probar exactamente ese contrato sin añadir dependencia, debe añadirse un handler deliberado al uso del trigger (también con `preventDefault()` y una única llamada a `toggleFilter`); no debe combinarse `keyDown` con un `fireEvent.click` artificial y presentarlo como prueba de teclado.

## Tests / comandos

- No se ejecutó Vitest: este revisor opera read-only y el protocolo solo autoriza `pytest --collect-only`; además no se instalan dependencias.
- La suite está registrada en `testing/CATALOGO_PRUEBAS.md`.

## Documentación

- No aplican `docs/ESQUEMA_BASE_DATOS.md` ni ADR: el alcance es frontend, teclado y pruebas, sin modelos, esquema ni arnés.
- Este reporte aporta la trazabilidad de la revisión; no se modificó código ni documentación funcional.

## Bloqueos

1. Falta cobertura automatizada de Enter en el trigger y de Space/Enter en las opciones.
2. No puede confirmarse navegación Tab/Shift+Tab real con `fireEvent` y sin `user-event`.

## Seguimiento recomendado

- Implementador frontend: decidir entre incorporar `user-event` en una tarea aprobada o formalizar handlers locales con prevención de activación nativa duplicada.
- Implementador frontend: agregar los casos mínimos anteriores y reportar el comando focalizado `npm run test -- src/components/__tests__/ConsolidatedTableById.test.tsx`.
