# Frontend review — migración `EmpleadosActivosView` a `DataTable`

Frontend review: approved_with_risks

## Alcance revisado

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView.tsx`
- `frontend/src/components/molecules/DataTable.tsx`
- `frontend/src/components/molecules/FilterDropdown.tsx` como dependencia funcional de filtros/ordenamiento.
- `frontend/src/pages/ServicePortal.tsx` solo para confirmar la ruta `/service-portal/horas-extras/empleados` protegida.

## Findings

1. **Media — no bloquea — filtros combinados pueden dejar estados “vacíos” poco explicables**
   - Referencias: `EmpleadosActivosView.tsx:45-47`, `:89-124`, `:247-252`, `:273-285`.
   - El filtro superior `Autorizado HE` aplica por defecto `si` y las opciones de columna se recalculan sobre esa base. Si el usuario combina filtros por columna y luego cambia el filtro superior, puede quedar una selección activa no obvia que produce tabla vacía.
   - Recomendación: agregar contador/botón global “Limpiar filtros” o limpiar/validar `columnFilters` al cambiar `filtroAutoriza`.

2. **Media — no bloquea — rendimiento aceptable con límite actual, pero sin virtualización/paginación visible**
   - Referencias: `EmpleadosActivosView.tsx:9-10`, `:63-72`, `DataTable.tsx:322-351`, `FilterDropdown.tsx:318-326`.
   - La vista carga hasta 2.000 empleados en lotes y renderiza todas las filas/opciones de filtros. Para catálogos medianos está bien, pero no cumple completamente el patrón de tablas de alto rendimiento si el ERP crece.
   - Recomendación: mostrar microcopy si se alcanza el tope, o incorporar paginación/virtualización ligera para filas y listas de opciones.

3. **Media — no bloquea — accesibilidad de tabla/filtros queda por debajo de la tabla HTML nativa**
   - Referencias: `EmpleadosActivosView.tsx:238-252`, `DataTable.tsx:260-307`, `FilterDropdown.tsx:127-138`.
   - La migración a `DataTable` usa `div`/grid sin roles de tabla o `aria-sort`; el buscador y el select dependen de placeholder/opciones, sin label explícito; el popover cierra por click fuera pero no se observa cierre por `Escape`.
   - Recomendación: añadir label/aria-label a filtros y mejorar `DataTable`/`FilterDropdown` con roles/aria-sort/Escape en el componente base.

4. **Baja — no bloquea — falsa affordance de selección/click en filas**
   - Referencias: `EmpleadosActivosView.tsx:294-295`, `DataTable.tsx:323-327`.
   - Aunque la vista es catálogo/consulta sin selección, `DataTable` aplica `cursor-pointer`, hover de fila y `showRowIndicator`. Puede sugerir que la fila es accionable.
   - Recomendación: permitir modo lectura en `DataTable` (`cursor-default` sin indicador) o desactivar el indicador en esta vista.

5. **Baja — no bloquea — deuda menor de design tokens/Callout**
   - Referencias: `EmpleadosActivosView.tsx:256-259`, `DataTable.tsx:251`, `FilterDropdown.tsx:214-227`.
   - La vista usa átomos/moléculas correctamente, pero el error local reimplementa banner con `MaterialCard` + colores `red-*`; `DataTable`/`FilterDropdown` mantienen colores Tailwind directos heredados.
   - Recomendación: migrar el error a `Callout` y sustituir colores hardcoded por tokens/variantes del sistema cuando se toque el componente base.

## Required checks

- Reportado por el implementador: `npx eslint "src/pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView.tsx"` pasó.
- Reportado por el implementador: `npm run build` pasó.
- Reportado por el implementador: `npx vitest run src/tests/horasExtrasService.test.ts` pasó 33 tests.
- Reportado por el implementador: `git diff --check` sin errores funcionales; solo warnings LF/CRLF.
- Recomendado antes de merge si hay tiempo: test RTL/Vitest de la ruta `/service-portal/horas-extras/empleados` cubriendo filtro global, filtro por columna y estado vacío.

## Design-system risks

- Positivo: usa `Button`, `Input`, `Select`, `MaterialCard`, `Text`, `Title`, `Badge` y `DataTable`; no hay endpoints hardcodeados en la vista; `catch` usa `unknown`; textos visibles están en español.
- Riesgos no bloqueantes: error no usa `Callout`, colores directos heredados en `DataTable`/`FilterDropdown`, y falta modo explícito “solo lectura” para filas no accionables.

## Blocking reasons

Ninguno. La migración queda **approved_with_risks**: mejora consistencia al centralizar la tabla en `DataTable`, con riesgos no bloqueantes de UX/a11y/performance a priorizar en el componente base y en la ruta.
