# Revisión frontend — selección por teclado en `ConsolidatedTableById`

**Fecha:** 2026-07-22  
**Alcance:** `ConsolidatedTableById.test.tsx`, `ConsolidatedTableById.tsx`, `ColumnFilterPopover.tsx`, `Button.tsx`  
**Modo:** revisión read-only  
**Resultado:** `approved_with_risks`

## Hallazgos

### 1. El test actual no prueba teclado — prioridad alta

`permite seleccion por teclado` hace `focus()` y después `fireEvent.click()`. Eso prueba activación por puntero sobre un elemento enfocado, no Enter ni Space. Tampoco verifica el estado final `aria-checked` de `Sin estado`.

La corrección debe mantener el click en una prueba separada y activar el flujo con `fireEvent.keyDown` (sin `@testing-library/user-event`, que no está instalado). El patrón ya existe en `SearchableSelect.test.tsx`.

### 2. Riesgo de doble activación nativa — bloqueante para aprobar el cambio

El trigger y las opciones son `Button`, por tanto terminan siendo `<button>` nativos con `onClick`. El navegador puede sintetizar un click al activar Enter o Space. Si se añade `onKeyDown` que llama directamente a `toggleFilter`/`onToggleOption` sin `preventDefault`, la misma pulsación puede ejecutarse dos veces:

- Enter: abrir y volver a cerrar el filtro, o alternar dos veces la opción.
- Space: alternar en `keydown` y volver a alternar al click generado en `keyup`.
- El resultado visible puede quedar igual al inicial, ocultando el fallo salvo que se compruebe `aria-expanded`/`aria-checked`.

Si se conserva la activación explícita, el handler debe limitarse a Enter y Space, ejecutar `preventDefault()` y después una sola acción. No debe cancelar Tab, Escape ni otras teclas. Conviene considerar `event.repeat` para no alternar repetidamente al mantener la tecla pulsada.

No se debe añadir un segundo `onClick` ni llamar artificialmente a `fireEvent.click` dentro de la prueba de teclado.

### 3. Semántica de las opciones

El uso de `Button` con `role="checkbox"` y `aria-checked` es viable para este popover y reutiliza el átomo del sistema, pero es una semántica personalizada sobre un botón nativo. El repositorio también tiene el átomo `Checkbox`, cuyo `<input type="checkbox">` ya proporciona activación de teclado nativa.

Si se mantiene el patrón actual por sus necesidades visuales y de estado, debe justificarse y cubrirse explícitamente `aria-checked`. El comportamiento estándar de un checkbox prioriza Space; soportar también Enter es una extensión de producto y debe quedar intencionalmente probada, no ser un efecto accidental del botón nativo.

## Pruebas requeridas

1. **Trigger con Enter:** enfocar el botón, enviar `keyDown` con `Enter`, comprobar que el dialog aparece una sola vez, `aria-expanded="true"` y que el buscador `Buscar en filtro de Estado` recibe el foco. Enviar `keyUp` y comprobar que no se cierra ni alterna otra vez.
2. **Trigger con Space:** repetir el caso anterior con `key: ' '` y verificar el mismo resultado.
3. **Opción con Enter:** sobre `Sin estado`, comprobar estado inicial `aria-checked="true"`; enviar `keyDown`, esperar `aria-checked="false"` y verificar que desaparece `Tarea 3`. El `keyUp` no debe cambiar el resultado.
4. **Opción con Space:** repetir la activación y comprobar el mismo contrato.
5. **Reactivación:** tras dejar una opción en falso, activarla por teclado otra vez y comprobar `aria-checked="true"` y la fila restaurada. Incluir la variante de una sola opción, ya cubierta por click, si la lógica de `null`/`Set vacío` se conserva.
6. **Puntero sin regresión:** mantener una prueba de `fireEvent.click` que confirme que cada click alterna una sola vez.
7. **Foco y cierre:** mantener Escape, click fuera y `Aplicar`; después del cierre, el foco debe volver al trigger. La expectativa del buscador debe usar `waitFor` si el montaje del portal vuelve asíncrono el autofocus.
8. **Estado final accesible:** en la prueba existente de `Sin estado`, añadir la aserción final de `aria-checked="false"`; no validar solo la presencia/ausencia de filas.

Con `fireEvent` no se reproduce completamente el click por defecto que un navegador genera para un botón al pulsar una tecla. Por eso las pruebas de `keyDown` validan el handler explícito y el estado; la ausencia de doble activación debe quedar protegida por `preventDefault` y, si existe infraestructura E2E, verificarse adicionalmente en un navegador real. No se justifica instalar una dependencia para esta corrección.

## Diseño, arquitectura y UX

- Reutilizar `Button`, `Input` y `Text` mantiene el cambio dentro del sistema atómico; no añadir elementos `<button>` o `<input>` crudos.
- El portal y la posición viewport del popover no requieren cambios para esta corrección. El foco del buscador debe conservarse tanto al abrir con click como con teclado, especialmente en móvil.
- Los archivos revisados permanecen bajo el límite de 550 líneas (`ConsolidatedTableById.tsx`: 440; `ColumnFilterPopover.tsx`: 250; test: 400).
- Riesgo de diseño existente, fuera del alcance de teclado: `ColumnFilterPopover` contiene clases `bg-white`, `dark:bg-neutral-*` y otros colores concretos. No ampliarlo con nuevos colores al implementar la interacción; preferir tokens si se toca el estilo.

## Checks requeridos

No se ejecutaron comandos de instalación, build, lint ni tests por el carácter read-only de esta revisión.

- `cd frontend && npm run lint`
- `cd frontend && npm run test -- src/components/__tests__/ConsolidatedTableById.test.tsx`
- `cd frontend && npm run test`
- `cd frontend && npm run build`

## Decisión

La estrategia de `onKeyDown` + `preventDefault` es aceptable y consistente con `SearchableSelect`, pero el cambio queda **aprobado con riesgos** solo si se implementa con prevención de la activación nativa duplicada y se agregan las pruebas Enter/Space, foco del buscador y `aria-checked` final descritas arriba. Sin esas garantías, bloquear la aprobación por regresión de teclado es correcto.
