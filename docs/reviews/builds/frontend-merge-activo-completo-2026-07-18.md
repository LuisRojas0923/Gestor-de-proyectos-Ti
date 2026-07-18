# Revisión frontend — merge activo completo

**Fecha:** 2026-07-18
**Build:** frontend staged + unstaged de `Modulo_Geoface`
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

## Alcance

Se revisó el delta completo de `frontend/src/` contra `HEAD`, el índice staged y los cambios unstaged, con foco en sistema de diseño, React/TypeScript, accesibilidad, `Modal`, `Select`, `DataTable`/`DataTableRow`, `FilterDropdown`, `LineDetailForm`, eliminación durante mutaciones, responsive y riesgos de build/tests.

## Hallazgos

### Bloqueantes / severidad alta

1. **[ALTA] El índice staged no contiene correcciones críticas que solo están unstaged.** Un commit del índice actual perdería el bloqueo del overlay durante una eliminación (`CorporateDeleteConfirmModal.tsx:35`), el bloqueo de campos de consulta/mutación (`LineDetailForm.tsx:51,137-301`), la activación por teclado de filas (`DataTableRow.tsx:44-50`), la asociación de etiqueta de `Select` (`Select.tsx:48-81`) y la corrección para opciones de filtros remotos (`DataTable.tsx:288`, `FilterDropdown.tsx:46,265-269`). El resultado staged y el árbol de trabajo no representan el mismo comportamiento revisado.

2. **[ALTA] El artefacto staged de producción referencia bundles inexistentes.** `frontend/dist/index.html:17-18` en el índice apunta a `index-BP6LRkpo.js` e `index-BTO_GZa3.css`; ninguno existe en `frontend/dist/assets/`. La versión del working tree vuelve a otros hashes que tampoco existen en ese directorio. Una entrega basada en `dist/` queda sin JavaScript/CSS.

3. **[ALTA] Los nuevos gestores ocultan silenciosamente registros después del 200.** `EquiposManager.tsx:124-130` y `PersonasManager.tsx:123-130` recortan con `slice(0, 200)` sin paginación, “Cargar más” ni virtualización. Los registros 201+ no se pueden recorrer ni administrar salvo que el usuario conozca qué buscar, incumpliendo el patrón de tablas de alto rendimiento.

### Severidad media

4. **[MEDIA] `Select` y `SearchableSelect` no exponen programáticamente validación y ayuda.** `Select.tsx:74-99` renderiza error/helper sin `aria-invalid` ni `aria-describedby`. `SearchableSelect.tsx:183-203,274-279` tampoco comunica `required`, error o helper al combobox. La etiqueta visible del segundo tampoco está asociada mediante `htmlFor`/`id`.

5. **[MEDIA] El focus trap de `Modal` permite escapar si no existen controles enfocables.** En `Modal.tsx:98-106`, el handler retorna cuando `focusables.length === 0`; Tab/Shift+Tab puede abandonar un diálogo cuyo foco está en el contenedor. La prueba `Modal.test.tsx` solo cubre título JSX/Escape, no trap, scroll lock, overlay ni pila de modales.

6. **[MEDIA] Hay controles interactivos no operables por teclado.** Las alertas de factura usan un `<div onClick>` sin `role`, `tabIndex` ni Enter/Espacio en `InvoiceDispersionView.tsx:187-200`. Esto impide abrir la línea desde teclado y contradice el patrón aplicado a `DataTableRow`.

7. **[MEDIA] Persisten desbordes mobile-first.** Las pestañas de `LineDetailForm.tsx:101-126` no tienen wrap ni scroll horizontal; `WbsNodeModal.tsx:281-307,314-349,369-383` fuerza grids de dos columnas en móvil; las acciones de `InvoiceDispersionView.tsx:147-166` no envuelven; y `SearchableSelect.tsx:72-80` impone 240 px sin limitar el ancho al viewport.

8. **[MEDIA] Dos vistas de factura omiten el `DataTable` aprobado.** `InvoiceDispersionView.tsx:212-240` e `InvoiceRawDataView.tsx:147-195` mantienen tablas HTML sin altura controlada, sticky header, paginación/virtualización ni filtros de columna aprobados. Pueden renderizar el reporte completo y degradar rendimiento/UX.

9. **[MEDIA] El sistema de diseño sigue mezclado con colores legacy/hardcodeados.** `FilterDropdown.tsx:293-499` conserva `bg-white`, escalas slate y colores primary directos en lugar de variables CSS; `DataTable.tsx:296` usa spinner azul hardcodeado; y `InvoiceDispersionView.tsx:102-108` exporta PDF con `[59,130,246]`, distinto del navy corporativo. También se reimplementan banners/tarjetas inline en vez de `Callout`/`MaterialCard`.

### Severidad baja / riesgos de mantenimiento

10. **[BAJA] La memoización no cubre el caso de tabla más costoso.** `DataTable.tsx:378-490` renderiza las filas draggable inline y no usa `MemoDataTableRow`; además, callbacks inline como `renderRowActions` en `EquiposManager.tsx:249-254` y `PersonasManager.tsx:247-252` invalidan la comparación para las demás filas.

11. **[BAJA] Cobertura incompleta del bloqueo durante mutación.** El working tree sí bloquea botón, Escape y overlay durante eliminación, pero `CorporateLinesManagers.test.tsx` solo verifica overlay. Falta demostrar Escape bloqueado, doble confirmación imposible y conservación del modal tras error. Estas pruebas unstaged también deben incluirse en el índice.

## Aspectos conformes

- El working tree usa `unknown` en los nuevos `catch`; no se detectó `catch (err: any)` nuevo.
- Los endpoints nuevos están centralizados en `config/api.ts`.
- `Modal` conserva `role="dialog"`, `aria-modal`, restauración de foco, pila y body scroll lock.
- `FilterDropdown` usa portal, Escape, detección de bordes y adaptación a `visualViewport` en el working tree.
- `DataTable` conserva altura controlada, encabezado separado/sticky-capable, estados loading/empty y filtros popover.
- Ningún archivo frontend revisado supera 550 líneas (`DataTable.tsx` queda en 517 y `FilterDropdown.tsx` en 504).
- Los textos nuevos visibles están en español.

## Checks requeridos

No ejecutados: el rol de revisión no está autorizado a correr build/tests.

- `cd frontend && npm run lint`
- `cd frontend && npm run test`
- `cd frontend && npm run build`
- Verificar específicamente las pruebas de `Modal`, `SearchableSelect`, `DataTable`, `CorporateLinesManagers`, `InvoiceDispersionView`, `WbsNodeModal` y `ActivityEvidenceService`.
- Después del build, comprobar que los hashes de `frontend/dist/index.html` existen realmente en `frontend/dist/assets/` y que staged/working tree coinciden.

## Decisión final

**Frontend review: blocked.**

Bloquean la aprobación la incoherencia staged/unstaged, el `dist` no autocontenido y la pérdida silenciosa de registros 201+.
