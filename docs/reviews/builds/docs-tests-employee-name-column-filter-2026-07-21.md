# Revisión docs/tests — nombre de empleado y filtros por columna

> **Estado histórico:** revisión intermedia no vigente. El comportamiento final se documenta en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21
**Alcance:** enriquecimiento ERP de nombres en la lista de cálculos de horas extras y filtros locales de `CalculoListView`; trabajo dirty ajeno excluido
**Decisión:** **blocked**

## 1. Evidencia revisada

- Reportado por el orquestador: backend focal **3 passed**; backend relacionado **12 passed**; infraestructura/regresiones **4 passed / 4 skipped**.
- Reportado por el orquestador: frontend relacionado **27 passed**; ESLint y build **PASS**.
- Este reviewer ejecutó únicamente `python -m pytest --collect-only -q testing/backend/test_horas_extras_calculos_enriquecimiento.py`: **3 tests collected**. No ejecutó suites ni comandos npm por las restricciones del rol.
- Los 3 casos focales backend cubren consulta bulk única con cédulas deduplicadas/ordenadas, lista vacía y excepción del ERP.
- Los 3 casos de `CalculoListView.test.tsx` cubren render tabular con nombre, combinación nombre+estado, consulta superior por cédula y navegación.
- El agregado frontend de 27 casos es coherente con 3 de `CalculoListView`, 14 de `DataTable` y 10 casos existentes de las dos suites de cascada de `useColumnFilters`.

## 2. Hallazgos ordenados por severidad

### ALTO — Falta cubrir el contrato público modificado del endpoint y su serialización

`testing/backend/test_horas_extras_calculos_enriquecimiento.py:26-69` llama directamente a `listar_calculos` con `SimpleNamespace`; no atraviesa `GET /calculos`, la nueva dependencia `obtener_erp_db_opcional`, el paso de `db_erp` del router ni `response_model=List[CalculoSemanalRead]` (`horas_extras_consultas.py:30-58`). Tampoco demuestra que el atributo dinámico llegue como `nombre_empleado` al JSON.

El test histórico de response model en `test_horas_extras_s2.py:481-490` solo comprueba detalles eager-loaded y no el campo nuevo. Por tanto, los verdes focales no cerrarían una regresión de wiring o serialización del contrato HTTP.

**Requerido antes de merge:** pruebas HTTP/ASGI del endpoint para (a) respuesta 200 con `nombre_empleado` y una sola consulta bulk sobre las cédulas visibles y (b) degradación 200 con `nombre_empleado: null` cuando el ERP opcional no existe o falla. La aserción sobre JSON debe ejercer realmente `CalculoSemanalRead`.

### MEDIO — La matriz de fallback queda incompleta en backend y frontend

El caso de error backend solo cubre una excepción del bulk. Faltan `db_erp=None` y respuesta parcial del ERP (una cédula conocida y otra ausente). En frontend no se prueba `nombre_empleado: null`, el texto `No disponible` ni la opción canónica `(Vacío)` del filtro de NOMBRE. Es la ruta esperada precisamente cuando opera la degradación segura documentada en el catálogo.

**Requerido:** parametrizar los fallbacks backend y agregar una regresión UI que filtre la fila sin nombre mediante `(Vacío)` sin ocultar las filas enriquecidas incorrectamente.

### MEDIO — Cobertura insuficiente de los filtros y riesgo de alterar el orden cronológico

`CalculoListView.test.tsx:72-96` solo ejerce filtros categóricos de nombre y estado. No valida período, columnas numéricas, ordenación, limpieza/cascada, ni que las tarjetas resumen se recalculen después de filtrar. Los tests genéricos de cascada tampoco validan `filteredData`, nulos ni sort.

Además, el backend entrega año/semana descendentes, pero `useColumnFilters.ts:102-105` aplica silenciosamente `id asc` cuando no existe sort explícito, mientras `CalculoListView.tsx:244-246` muestra indicador únicamente desde `sortState`. Los fixtures 1001/1002/1003 ya vienen ascendentes y no detectan que la nueva tabla puede invertir el historial sin anunciar `aria-sort`.

**Requerido:** una prueba con IDs desordenados y semanas distintas que fije el orden inicial esperado y su indicador accesible. **Recomendado:** cubrir al menos período, una columna numérica, limpiar filtro y actualización de resúmenes.

### MEDIO — El catálogo no refleja el estado verde comunicado

`testing/CATALOGO_PRUEBAS.md:51` y `:113` mantienen `⏳ EN VALIDACIÓN`, aunque la evidencia comunicada indica 3/3 focales backend y 3/3 de `CalculoListView`. Las entradas de infraestructura/regresiones sí son coherentes con el agregado 4 passed/4 skipped, y `DataTable` registra correctamente 14 passed.

**Requerido:** cambiar las dos entradas focales a `✅ 3 PASSED el 2026-07-21`; el agregado frontend de 27 no debe atribuirse completo a `CalculoListView`.

### MEDIO — No existe evidencia auditable de la fase roja TDD

Ambas suites focales son archivos nuevos sin historial y coexisten en el mismo snapshot dirty que la implementación. Solo se aportó evidencia verde; no hay salida previa fallida que demuestre tests antes del cambio, como exige `skill_testing_mandate`.

Esto no invalida los verdes, pero impide aprobar cumplimiento TDD estricto. El reporte debe conservar la limitación; no corresponde fabricar una fase roja retroactiva.

### BAJO — Los comandos y salidas completas de la evidencia no fueron aportados

Se recibieron conteos y estados, no las invocaciones exactas ni logs crudos. Este reporte deja trazabilidad de la evidencia comunicada, pero una evidencia de build reproducible debería registrar comandos, fecha y salida final.

## 3. Documentación aplicable

- `testing/CATALOGO_PRUEBAS.md`: **requiere corrección de los dos estados focales**.
- `docs/ESQUEMA_BASE_DATOS.md`: no aplica; se añadió un campo de respuesta derivado, no una tabla/columna ORM ni migración.
- ADR: no aplica; se reutilizan el servicio ERP bulk y el hook/tabla existentes, sin decisión arquitectónica durable nueva.
- Bitácora adicional: no requerida. Esta revisión de build conserva el contexto durable y evita duplicarlo.
- `errors_memory.json`: no aplica sin error/decisión central preaprobado.

## 4. Decisión final

**BLOCKED** hasta cubrir el endpoint/response y sus fallbacks públicos, fijar mediante test el orden inicial de la tabla y actualizar los estados del catálogo. Los casos adicionales de columnas numéricas, limpieza y resúmenes pueden quedar como riesgo posterior si el contrato mínimo anterior queda verde.

Docs/tests review: blocked
Findings: contrato HTTP/serialización sin prueba; fallbacks null/parcial y filtros incompletos; posible inversión silenciosa del orden; catálogo focal aún “EN VALIDACIÓN”; fase roja TDD no auditable.
Required tests: HTTP 200 con nombre y bulk único; HTTP 200/null con ERP ausente/fallido; mapa ERP parcial; UI `No disponible`/`(Vacío)`; orden inicial e indicador; recomendado período/número/limpieza/resúmenes.
Required docs: actualizar las dos entradas focales de `testing/CATALOGO_PRUEBAS.md` a 3 PASSED; este reporte sustituye una bitácora adicional.
Blocking reasons: el nuevo contrato público no está probado end-to-end, la degradación visible no está cubierta y el orden inicial potencialmente regresivo carece de especificación/test.
