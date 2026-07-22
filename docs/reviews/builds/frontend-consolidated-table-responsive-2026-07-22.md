# Revisión frontend — cobertura responsiva de `ConsolidatedTableById`

**Fecha:** 2026-07-22  
**Alcance:** propuesta de ampliación de `frontend/src/components/__tests__/ConsolidatedTableById.test.tsx` para el posicionamiento de `ColumnFilterPopover`  
**Modo:** revisión estática read-only  
**Resultado:** `approved_with_risks`

## Veredicto

La propuesta es adecuada: separar los escenarios de escritorio y móvil, comprobar la actualización por `visualViewport` y blindar la restauración del entorno cubre el hueco detectado en la prueba actual. No se modificó código.

El caso actualmente solo verifica el registro de `resize`/`scroll`; todavía no demuestra que los callbacks reposicionen el popover ni que se desuscriban correctamente. La ampliación debe conservar las siguientes condiciones.

## Riesgos React/JSDOM y requisitos

1. **Orden de limpieza — importante.** `ColumnFilterPopover` consulta `window.visualViewport` también durante el cleanup. El `unmount()` debe ejecutarse antes de restaurar el descriptor de `visualViewport`; de lo contrario, `removeEventListener` se invoca sobre el viewport original y no sobre el doble de prueba. Si se usan dos objetos de viewport, hay que desmontar el primer estado antes de sustituir el objeto por el segundo.
2. **`try/finally` completo.** La instalación del descriptor, la mutación de `innerWidth`/`innerHeight`, el mock de `getBoundingClientRect` y el `render` deben quedar dentro del `try`. Si `defineProperty` o una asignación falla antes de entrar al bloque, el entorno queda contaminado. Restaurar descriptores completos es más seguro que restaurar únicamente valores o funciones.
3. **Callbacks de `visualViewport`.** El doble actual es un objeto plano con `vi.fn()`, no un `EventTarget`; `fireEvent.resize(visualViewport)`/`fireEvent.scroll(visualViewport)` no es fiable. Capturar las funciones pasadas a `addEventListener` e invocarlas dentro de `act` (o esperar con `waitFor`) evita warnings de React y hace determinista la actualización de estado. Debe capturarse por separado el callback de `resize` y el de `scroll`.
4. **Eventos con cambio observable.** No basta con llamar los listeners sin cambiar la geometría. Usar un rectángulo mutable y modificar dimensiones/offsets entre estados; después comprobar con `waitFor` los nuevos `top` y `left`. Así se verifica reposicionamiento y no solo wiring.
5. **Límites sin layout real.** JSDOM no calcula layout: `clientHeight`, `offsetHeight`, `getComputedStyle` y `dialog.getBoundingClientRect()` no prueban el tamaño renderizado. Las aserciones deben usar los estilos inline (`dialog.style.top`, `left`, `width`, `maxHeight`) y aritmética de la fixture: `top + min(350, viewportHeight - 20) <= viewportBottom - 10` y `left + min(250, viewportWidth - 20) <= viewportRight - 10`. La cadena CSS `min(350px, calc(100dvh - 20px))` debe comprobarse aparte; no asumir que JSDOM evalúa `dvh`/`min()`.
6. **Aislamiento de estados.** Es preferible `it.each`/dos casos independientes o un único doble mutable con un solo `render`. Dos `render` simultáneos dejan listeners y portales del primer estado activos, producen consultas ambiguas y pueden generar actualizaciones sobre un árbol desmontado.

## Hallazgos

### Bloqueantes

Ninguno para la propuesta, siempre que se respete el orden `unmount → restauración` y se cubran los callbacks, no solo su registro.

### Riesgos no bloqueantes

- Los límites `350`, `250` y `10` están duplicados entre componente y test; conviene mantenerlos documentados como contrato o centralizar las constantes para evitar drift.
- El componente relacionado conserva clases Tailwind de colores directos (`white`, `neutral`, `gray`, `indigo`) en lugar de tokens CSS. Es deuda de sistema de diseño fuera del alcance de esta prueba.
- El tamaño del test actual es de 431 líneas; la ampliación debe mantener el límite de 550 líneas o extraer fixtures/helpers.

## Checks requeridos

- `cd frontend && npm run test -- src/components/__tests__/ConsolidatedTableById.test.tsx`
- `cd frontend && npm run test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

No se ejecutaron comandos npm/build/lint por el protocolo read-only del revisor.

## Decisión final

**`approved_with_risks`** — la estrategia propuesta es correcta; la aceptación debe quedar condicionada a probar el disparo real de ambos callbacks, aislar/desmontar cada estado y restaurar todos los globals en el orden indicado.
