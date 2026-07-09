Frontend review: approved_with_risks

Findings:
- Sin bloqueos en el alcance solicitado: `EmpleadosActivosPanel.tsx` queda en 546 líneas y `empleadosPanelFilters.ts` en 53; ambos están dentro del máximo de 550.
- El ajuste cubre la causa reportada: `empleadosCacheRef` conserva empleados cargados/seleccionados, `empleadosRenderizados` reinyecta seleccionados ocultos desde `empleadosInfo` o cache, y `incluirVisibles`/`toggleEmpleado` usan refs actuales para evitar cierres stale sobre `seleccionados` y `empleadosInfo`.
- Type safety correcto en el alcance: `catch (e: unknown)` y validación de storage como `unknown`; no se introduce `any`.
- Riesgo medio de mantenibilidad: el panel queda muy cerca del límite (546/550). No bloquea este ajuste final, pero cualquier cambio posterior debería extraer un hook/utilidad para carga, filtros y selección antes de seguir creciendo.
- Riesgo bajo UX: las filas seleccionadas que no coinciden con el filtro quedan visibles al inicio para preservar el contexto. Es la conducta correcta para evitar “desaparecen seleccionados”, pero podría beneficiarse luego de un badge/nota tipo “Seleccionado fuera del filtro actual”.
- Riesgo bajo de persistencia: `limpiarFiltros()` elimina `FILTROS_PANEL_KEY`, pero el efecto de persistencia puede volver a escribir un estado vacío. No restaura filtros obsoletos, aunque la clave puede permanecer en `sessionStorage`.
- Riesgo bajo de debounce: al limpiar búsqueda, durante ~300 ms puede persistirse `busquedaRemota` anterior si el componente se desmonta exactamente en esa ventana.
- Sin regresión responsive evidente: se conserva `flex-wrap`, la tabla mantiene `maxHeight`/scroll y `DataTable` provee header fijo y popover por portal.

Required checks:
- Evidencia recibida: `npx eslint` de ambos archivos sin salida.
- Pendiente antes de merge: resultado de `npm run build` desde `frontend/` (en ejecución por el orquestador).
- Requeridos/recomendados para cierre completo: `npm run lint` y `npm run test` desde `frontend/`; ideal agregar/regresar una prueba de interacción para selección múltiple + cambio de filtros + seleccionados ocultos reconstruidos.

Design-system risks:
- Bajo. El cambio mantiene `MaterialCard`, `Button`, `Badge`, `Checkbox`, `Text`, `Callout` y `DataTable`; usa variables CSS y no introduce endpoints hardcodeados ni colores legacy nuevos.

Blocking reasons:
- Ninguno en los dos archivos revisados. Si `npm run build` falla, el resultado debe volver a revisión. Nota fuera de alcance: `git status` muestra cambios adicionales en `frontend/dist/` y `planificadorDraft.ts`; no fueron evaluados aquí.
