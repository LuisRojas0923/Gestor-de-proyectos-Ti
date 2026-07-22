# Revisión frontend — estado final de teclado y ARIA

**Fecha:** 2026-07-22  
**Alcance:** `ConsolidatedTableById.tsx`, `ColumnFilterPopover.tsx` y su prueba  
**Modo:** revisión read-only  
**Proyecto:** Gestor-de-proyectos-Ti

## Resultado

**`approved_with_risks`** — la implementación cumple el contrato funcional solicitado y no presenta bloqueos. Queda una brecha no bloqueante de cobertura explícita para Space sobre el trigger.

## Confirmaciones

- **Trigger:** `ConsolidatedTableById.tsx` maneja `Enter`, `' '` y `code === 'Space'`; ejecuta `preventDefault()` antes de `toggleFilter`. La misma ruta abre y cierra el popover, y al cerrar devuelve el foco al trigger.
- **Opciones:** `ColumnFilterPopover.tsx` renderiza opciones con `role="checkbox"` y `aria-checked`. `Enter` y `Space` ejecutan `preventDefault()` y una sola llamada a `onToggleOption`, evitando la activación nativa duplicada.
- **Prueba:** valida foco del buscador al abrir por teclado y estados `aria-checked="false"` y `aria-checked="true"` después de Space y Enter en una opción.
- **Accesibilidad adicional:** se mantienen `role="dialog"`, `aria-labelledby`, autofocus, Escape, cierre exterior y restauración de foco.
- **Arquitectura:** los tres archivos están bajo el límite de 550 líneas (446, 256 y 414 líneas), usan átomos existentes y el popover se monta mediante portal con posicionamiento viewport.

## Hallazgos no bloqueantes

1. La prueba focalizada cubre Enter en el trigger, pero no envía explícitamente Space al trigger ni comprueba `defaultPrevented`/`keyUp` en un navegador real. La implementación sí contiene el `preventDefault()` requerido; conviene añadir esas aserciones en una ampliación de cobertura futura.
2. Persisten clases Tailwind de colores concretos en estos componentes (`white`, `neutral`, `red`, `gray`, `indigo`, `blue`) en lugar de tokens CSS. Es deuda de sistema de diseño preexistente y no afecta el contrato de teclado revisado.
3. El manejo de error usa una aserción `(e as Error)`; la convención preferida es `unknown` con `instanceof Error`. No bloquea este alcance.

## Evidencia de validación

- Prueba focalizada: **15/15 PASS**.
- Suite frontend: **150 passed / 2 skipped**.
- Lint focalizado: **PASS**.
- Build: **PASS**.
- `git diff --check` sobre los tres archivos: **PASS**.

Los comandos de test, lint y build no se reejecutaron por las restricciones read-only del subagente; los resultados anteriores son la evidencia proporcionada para el estado final.

## Decisión

- [ ] `approved`
- [x] `approved_with_risks`
- [ ] `blocked`

**Bloqueos:** ninguno.
