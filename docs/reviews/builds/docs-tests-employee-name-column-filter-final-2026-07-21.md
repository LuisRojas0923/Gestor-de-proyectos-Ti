# Revisión final docs/tests — nombre de empleado y filtros por columna

> **Estado histórico:** revisión focal conservada para auditoría. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21
**Alcance:** cierre de hallazgos del enriquecimiento ERP y filtros de `CalculoListView`; trabajo dirty ajeno excluido
**Reporte previo:** `docs-tests-employee-name-column-filter-2026-07-21.md`
**Decisión:** **approved_with_risks**

## 1. Cierre de hallazgos previos

- **Contrato HTTP/response model — cerrado.** `test_horas_extras_calculos_enriquecimiento.py` ahora ejerce el router con ASGI, overrides de `obtener_db`, `obtener_erp_db_opcional` y permiso, comprueba respuesta 200, serialización de `nombre_empleado` con valor y `null`, y verifica que la sesión ERP llegue al servicio.
- **Fallback backend — cerrado.** La suite cubre bulk único con deduplicación/orden, lista vacía, excepción ERP, respuesta parcial y ausencia de sesión ERP.
- **Fallback y filtros frontend — cerrado.** `CalculoListView.test.tsx` cubre AND nombre+estado, normalización visual y filtro de `No disponible`, presencia del control para limpiar dos filtros, orden entregado por el servicio y navegación.
- **Orden inicial — cerrado.** `CalculoListView` ya no incluye `id` entre los accessors; por ello `useColumnFilters` no aplica su default `id asc`. La regresión usa IDs 1003/1001 y demuestra que conserva el orden reciente del servicio.
- **Error accesible/exclusivo — cerrado.** La prueba exige `role="alert"` y ausencia simultánea del estado vacío exitoso.
- **Catálogo — cerrado.** Registra **7 PASSED** backend y **6 PASSED** frontend, con descripciones acordes al alcance actual.

## 2. Evidencia

- Backend focal comunicado: **7 passed**. Este reviewer confirmó **7 tests collected** mediante `python -m pytest --collect-only -q testing/backend/test_horas_extras_calculos_enriquecimiento.py`.
- Backend relacionado comunicado previamente: **12 passed**.
- Infraestructura/regresiones comunicadas previamente: **4 passed / 4 skipped**, coherente con las entradas 1/1 y 3/3 del catálogo.
- Frontend relacionado comunicado: **30 passed**, coherente con 6 de `CalculoListView`, 14 de `DataTable` y 10 existentes de cascada de `useColumnFilters`.
- ESLint y build: **PASS** comunicados.
- Run mixto posterior: los **7 focales pasaron**; seis casos dependientes de PostgreSQL fallaron al resolver localmente el hostname Docker `db`. Según la evidencia comunicada, el fallo ocurrió en configuración/conectividad antes de la lógica probada, mientras el run relacionado anterior fue 12/12 verde.

## 3. Hallazgos residuales ordenados por severidad

### MEDIO — La secuencia roja TDD original sigue sin evidencia auditable

Las suites continúan nuevas y sin historial previo; solo hay evidencia verde. La cobertura funcional ya es suficiente para cerrar los bloqueos, pero no puede afirmarse cumplimiento estricto del orden test-rojo → implementación → verde exigido por `skill_testing_mandate`. No corresponde fabricar evidencia retroactiva.

### MEDIO — El último run mixto no constituye una ejecución DB verde del snapshot

Los seis fallos reportados son compatibles con ejecutar localmente una configuración destinada a la red de Docker (`db`) y no señalan una regresión focal. No bloquean este cierre porque el focal pasó dentro del mismo run y existe evidencia relacionada anterior de 12 passed. Aun así, antes de una entrega que exija matriz completamente verde, conviene repetir esos seis casos dentro de Docker o con un hostname PostgreSQL local válido y conservar la salida.

### BAJO — Cobertura UI adicional opcional

No hay regresión directa que pulse “Limpiar filtros”, pruebe el filtro de PERÍODO o demuestre recuperación exitosa tras “Reintentar”. La lógica principal AND/fallback/orden/error/navegación sí queda cubierta, y los componentes/hook relacionados tienen evidencia verde; estos casos son seguimiento, no gate.

### BAJO — El test HTTP aísla el servicio

El endpoint prueba wiring y serialización con `listar_calculos` mockeado, mientras los cinco casos de servicio prueban enriquecimiento/fallback. Esta separación es válida y rápida, pero no reemplaza una integración opcional DB real → ERP mock → JSON en un solo caso.

## 4. Documentación aplicable

- `testing/CATALOGO_PRUEBAS.md`: correcto para el alcance y los conteos focales.
- `docs/ESQUEMA_BASE_DATOS.md`: no aplica; no cambia el esquema persistente.
- ADR: no aplica; se reutilizan patrones existentes.
- Bitácora adicional: no requerida; este reporte final conserva la trazabilidad y supersede la decisión bloqueada anterior.
- `errors_memory.json`: no aplica sin error/decisión central preaprobado.

## 5. Decisión final

Los bloqueos funcionales y documentales del reporte previo están cerrados. El resultado pasa a **approved_with_risks** únicamente por ausencia de rojo TDD auditable y por la necesidad operativa de repetir los casos DB en un entorno capaz de resolver `db`; ninguno de esos riesgos atribuye un fallo a la implementación focal.

Docs/tests review: approved_with_risks
Findings: sin hallazgos altos; cobertura HTTP, fallbacks, orden, error y catálogo cerrados. Riesgos residuales: TDD rojo no auditable y run DB mixto afectado por DNS local.
Required tests: ninguno bloqueante; recomendado repetir los seis casos DB en Docker y añadir limpieza/período/reintento UI.
Required docs: ninguna adicional; catálogo correcto y este reporte final sustituye una bitácora.
Blocking reasons: ninguno.
