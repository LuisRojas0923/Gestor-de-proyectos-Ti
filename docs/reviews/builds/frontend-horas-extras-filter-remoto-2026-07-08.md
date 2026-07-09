Frontend review: approved_with_risks

Findings:
- Causa raíz confirmada: `DataTable` limpia solo `filterSearchTerm` local al aplicar/cerrar, pero no limpia el estado remoto en `EmpleadosActivosPanel` (`busquedaFiltro`/`busquedaRemota`). Por eso el filtro de columna se aplica contra `empleados` ya reducido por la búsqueda remota del popover.
- Fix mínimo correcto: al aplicar y al cerrar el popover, `DataTable` debe llamar `onFilterSearchChange(activeFilter, activeSubFilter || activeFilter, '')` antes de resetear `activeFilter/activeSubFilter`. Cubrir también X, click fuera, Escape y cierre al reabrir/toggle.
- Riesgo de insuficiencia: limpiar la búsqueda remota puede recargar solo la primera página; si los 4 valores seleccionados están en cache pero no en la página actual, seguirán desapareciendo. Para robustez, `EmpleadosActivosPanel` debe fusionar desde `empleadosCacheRef.current` los empleados que satisfacen `columnFilters`, no solo los `seleccionados` del plan.

Required checks:
- Agregar regression test: con búsqueda remota `tellez`, 2 opciones visibles y 4 valores temporales seleccionados, al hacer Aplicar se limpia la búsqueda remota y se renderizan los 4 empleados esperados desde datos/cache.
- Tests mínimos sugeridos: `npm run test -- src/components/molecules/__tests__/DataTable.test.tsx src/tests/PlanificadorSemanalView.test.tsx`, luego `npm run lint` y `npm run build` desde `frontend/`.

Design-system risks:
- Sin riesgo visual directo; se mantiene `FilterDropdown` del sistema.
- Riesgo arquitectónico: `DataTable.tsx` ya está en 550 líneas y `EmpleadosActivosPanel.tsx` en 546. No añadir líneas netas sin extraer helper/hook o compactar código para respetar el límite.

Blocking reasons:
- No usar solo el clear remoto como solución final si no hay test que demuestre los 4 resultados; por paginación/cache puede quedar un falso positivo.
