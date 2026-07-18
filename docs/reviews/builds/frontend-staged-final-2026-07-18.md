# Revisión frontend — staged final

**Fecha:** 2026-07-18
**Alcance:** únicamente cambios staged bajo `frontend/`
**Decisión:** approved

## Hallazgos

- **Sin bloqueantes.** No hay archivos de `frontend/dist/` staged y `git diff --cached --check -- frontend` no reportó errores.
- La truncación silenciosa quedó resuelta: `EquiposManager.tsx` y `PersonasManager.tsx` muestran hasta 200 filas por lote, informan el conteo y ofrecen “Cargar más” en incrementos de 200. La prueba focal cubre el registro 201.
- `DataTable.tsx` sustituyó el spinner hardcodeado por el átomo `Spinner` y expone el estado de carga mediante `role="status"`/`aria-live`.
- `Modal.tsx` retiene el foco incluso sin controles interactivos, conserva pila de modales, bloqueo de scroll, Escape solo para el modal superior y restauración de foco. Los modales destructivos desactivan Escape, overlay y acciones durante la mutación.
- `Select.tsx` asocia `label`/`htmlFor`, obligatoriedad, `aria-invalid` y `aria-describedby`; la expectativa corregida se revalidó con el rerun focal.
- Las alertas de factura son enfocables y operables con Enter/Espacio. El flujo destructivo usa confirmación; las vistas de consulta ocultan acciones y deshabilitan campos cuando `canEdit=false`.
- Los filtros remotos ya no vuelven a filtrar localmente opciones devueltas por backend (`DataTable.tsx` + `FilterDropdown.tsx`).

## Riesgos residuales no bloqueantes

1. `DataTable` no implementa virtualización genérica. En los gestores nuevos el impacto queda acotado por lotes explícitos de 200; conviene reevaluarlo si el volumen o el costo de cada fila crece.
2. `SearchableSelect` tiene nombre, estado expandido y navegación por teclado, pero sus props latentes `required`, `errorMessage` y `helperText` todavía no se reflejan con `aria-required`, `aria-invalid` y `aria-describedby`. Su uso staged actual no activa esos estados.
3. Persisten estilos legacy con colores Tailwind directos en `FilterDropdown` y tablas HTML históricas en las vistas de factura. No reabren los bloqueos funcionales revisados, pero mantienen deuda frente al sistema de diseño y a una futura virtualización.

## Checks requeridos / evidencia

Evidencia aportada por el solicitante, no reejecutada por este revisor debido a las restricciones del rol:

- TypeScript/tsc — PASS.
- ESLint — PASS.
- Build — PASS.
- Pruebas focales: grupo inicial 24 verdes tras corregir la expectativa de label; rerun `Select` 1 PASS; managers 7 PASS; table 11 PASS; modal 2 PASS; invoice 2 PASS; hook 1 PASS.

## Design-system risks

- Riesgo residual de virtualización genérica y deuda de tokens/tabla histórica; sin regresión bloqueante en el staged final.

## Blocking reasons

Ninguno.
