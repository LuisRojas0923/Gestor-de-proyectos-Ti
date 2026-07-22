# Revisión docs/tests — planilla detallada por empleado

> **Estado histórico:** veredicto bloqueado supersedido. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21  
**Alcance:** endpoint y servicio de planilla detallada de cálculos HE, enriquecimiento ERP, tabla frontend, catálogo, evidencia TDD y necesidades documentales  
**Resultado:** `blocked`

## Evidencia revisada

- Informada por el orquestador:
  - `test_horas_extras_calculos_planilla.py`: **6 passed**.
  - `test_horas_extras_calculos_enriquecimiento.py`: **7 passed**.
  - Backend focal combinado: **14 passed**, sin comando ni lista exacta de tests conservados en el alcance recibido.
  - Frontend servicio + página: **7 passed**.
  - Suite frontend relacionada: **31 passed**; lint y build: **pass**.
  - Lote backend amplio: mostró **35 marcadores pass / 1 skip**, pero agotó timeout durante teardown/reporte. **No constituye un agregado final y no se registra como suite aprobada.**
- Ejecutado por este reviewer:
  - `python -m pytest --collect-only testing/backend/test_horas_extras_calculos_planilla.py testing/backend/test_horas_extras_calculos_enriquecimiento.py -q`
  - Resultado: **13 tests collected**: 6 de planilla + 7 de enriquecimiento, con 4 warnings. No se ejecutaron tests.

## Hallazgos

### ALTO 1 — La supuesta vista histórica se reconstruye desde fuentes mutables sin prueba de inmutabilidad

`CalculoListView` presenta la información como “HISTORIAL / TRAZABILIDAD SEMANAL”, pero `listar_calculos_planilla` vuelve a leer `nomina_planificador_dia_ot` y datos actuales del ERP para empresa, sucursal, jefe, autorización, especialidad y cliente. Las asignaciones del planificador se reemplazan mediante `DELETE` + `INSERT`, por lo que una edición posterior puede cambiar la distribución SALARIO y los metadatos de un cálculo ya confirmado.

No existe una prueba que confirme qué debe ocurrir tras editar/eliminar asignaciones o cambiar datos ERP. Antes de aprobar debe fijarse una de dos semánticas: snapshot histórico inmutable o proyección operativa con enriquecimiento vivo. Si se exige trazabilidad histórica, el test debe demostrar que una mutación posterior no cambia las filas originales.

### ALTO 2 — Ningún test ejecuta la orquestación real de `listar_calculos_planilla`

Los tres primeros casos prueban `_construir_filas_planilla` como función pura y el caso HTTP reemplaza `listar_calculos_planilla` por un `AsyncMock`. Quedan sin ejecución automatizada las consultas a cálculos, detalle diario, asignaciones, horarios y responsables; los filtros; las llamadas bulk a empleados/OT; y la degradación parcial de cada fuente ERP. El endpoint puede serializar un mock correctamente aunque el servicio falle al consultar o combinar datos reales.

### ALTO 3 — La afirmación de RBAC/alcance es parcial y falta el contrato de privacidad

La suite comprueba que la dependencia `requiere_permiso_he_leer` está declarada y que un conjunto mock de cédulas llega al servicio. No prueba rechazo `401`, rechazo `403`, cédula fuera de alcance con respuesta uniforme `404`, ni exclusión real de empleados no permitidos. Tampoco valida `Cache-Control: no-store, private` para una respuesta que contiene cédula, nombre y salario. La descripción de RBAC del catálogo es más amplia que la evidencia actual.

### MEDIO 1 — Faltan bordes contables del reparto y de la no duplicación de SALARIO

El caso “sin duplicar” usa un solo detalle diario. Debe existir un día con varios conceptos/filas OT y comprobar una única suma ordinaria. También faltan reparto por horas explícitas, pesos vacíos, residuo de redondeo entre tres o más OT, HE dividida entre varias OT y conciliación de horas/costo por cálculo.

### MEDIO 2 — Enriquecimientos y precedencia de `aplica_he` están cubiertos solo en el camino feliz

No se prueba la búsqueda OT exacta frente al fallback por orden, metadatos ausentes, fallo independiente del bulk OT, columnas laborales ERP no disponibles, `autoriza_he=False`, ni la precedencia override local → default local → ERP → estado del cálculo. Son campos visibles y sensibles para nómina.

### MEDIO 3 — Falta documentación normativa del nuevo contrato

`docs/specs/2026-06-17_sprint-S7-planificador-semanal.md` documenta los cambios de `OThorarios`, pero no `GET /calculos/planilla`, sus 23 campos de respuesta, las 19 columnas visibles, el grano empleado/fecha/OT/novedad, paginación por cálculo, fallback histórico, fuentes de enriquecimiento, degradación, alcance ni semántica temporal. El presente reporte aporta trazabilidad de build, pero no sustituye el contrato funcional.

No se requiere actualizar `docs/ESQUEMA_BASE_DATOS.md` por el delta revisado: `CalculoPlanillaRead` es un DTO no-tabla y no se agrega ni modifica esquema PostgreSQL local. Si la decisión de inmutabilidad exige persistir nuevos snapshots, entonces sí serán obligatorios migración, sincronización del esquema y documentación. Un ADR solo es necesario si se adopta como decisión durable la separación entre proyección viva y registro histórico; de lo contrario basta actualizar la especificación.

### MEDIO 4 — No hay rojo TDD auditable y el agregado backend focal no está reconciliado

Solo se recibió evidencia verde. No puede afirmarse cumplimiento del orden test rojo → implementación → verde exigido por `skill_testing_mandate`, y no corresponde fabricar un rojo retroactivo. Además, los dos archivos backend nombrados recolectan 13 casos, no 14; el resultado de 14 puede ser válido si incluyó otro test, pero debe conservarse el comando y el test adicional. El catálogo sí acierta en los conteos individuales 6, 7 y frontend 7.

### BAJO 1 — Cobertura frontend complementaria pendiente

La página cubre columnas, filtros, fallback, orden, error y navegación. Conviene añadir estados vacío/loading, reintento exitoso y valores exactos del resumen antes/después de filtrar. No se considera bloqueo frente a los riesgos backend anteriores.

## Pruebas requeridas antes de aprobar

1. Integración de `listar_calculos_planilla` con sesión async/DB de prueba: filtros, queries, orden, paginación por cálculo, llamadas bulk y degradación independiente de empleados y OT.
2. Caso de inmutabilidad: confirmar, cambiar/eliminar asignaciones y alterar respuestas ERP; verificar el contrato histórico decidido.
3. HTTP real: `401`, `403`, cédula fuera de alcance `404`, conjunto permitido efectivo y `Cache-Control: no-store, private`.
4. Día con múltiples conceptos y múltiples OT: SALARIO una sola vez, HE por OT, reparto por horas/porcentaje/equitativo, residuo y conciliación de horas/costo.
5. Precedencia completa de `aplica_he` y fallbacks laborales/OT.
6. Frontend recomendado: vacío/loading, reintento exitoso y resumen exacto filtrado.

## Documentación requerida

- Actualizar la especificación S7 o crear una especificación enlazada para el contrato de `/calculos/planilla` y su UI.
- Reconciliar la evidencia “14 passed” con comando y test adicional; mantener el lote amplio como timeout sin agregado final.
- Afinar el catálogo para no presentar RBAC/no duplicación como cobertura exhaustiva hasta incorporar los casos negativos y multi-concepto.
- ADR condicional a la decisión durable snapshot histórico vs. proyección viva.
- `docs/ESQUEMA_BASE_DATOS.md`: no aplica al delta actual; obligatorio si se agregan snapshots persistidos.

## Decisión

```text
Docs/tests review: blocked
Findings: 3 altos, 4 medios, 1 bajo. Los conteos individuales del catálogo son correctos, pero la cobertura no prueba la orquestación real, la inmutabilidad histórica ni la matriz negativa RBAC/privacidad.
Required tests: integración real del servicio; snapshot/proyección temporal; 401/403/404/no-store; multi-concepto/multi-OT con conciliación; precedencia y fallbacks ERP.
Required docs: contrato normativo de /calculos/planilla y UI; reconciliar el run de 14; ADR solo si se formaliza la decisión snapshot vs. live; sin cambio de ESQUEMA_BASE_DATOS en el delta actual.
Blocking reasons: tres brechas de riesgo alto en trazabilidad histórica, servicio no ejercitado y autorización/privacidad.
```
