# Reporte de Revisión de Build

> **Estado histórico:** revisión intermedia no vigente. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21
**Build:** Seguimiento backend de planilla de Horas Extras
**Autor del build:** No especificado
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/api/novedades_nomina/routers/horas_extras_consultas.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras_planilla.py`
- `backend_v2/app/services/novedades_nomina/horas_extras_planilla.py`
- `backend_v2/app/services/novedades_nomina/horas_extras_confirmacion.py`
- `backend_v2/app/services/erp/empleados_service.py`
- `backend_v2/app/services/erp/ordenes_trabajo_service.py`
- `testing/backend/test_horas_extras_calculos_planilla.py`

Se ignoraron expresamente los demás cambios del worktree.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | bloqueado | Sí | Revisión estática focal de los archivos solicitados. |

## 3. Hallazgos bloqueantes

1. **Alta — Una OT repetida en CC distintos sigue atribuyendo todas las novedades al primer CC.** `horas_extras_planilla.py:66-83` busca la asignación de cada detalle solo por `orden` y devuelve la primera coincidencia. El planificador permite la misma `orden` con combinaciones CC distintas. Por ello, dos detalles diarios ya repartidos para una misma OT se asignan ambos al primer CC y luego se consolidan en `:251-267`; el segundo CC pierde sus horas y costo de novedad. La cardinalidad final `cedula + fecha + ot_cc + novedad` sí es única, pero su contenido contable puede ser incorrecto. El test `test_consolida_la_misma_clave_de_negocio_y_omite_repartos_en_cero` usa deliberadamente el mismo CC y no cubre este caso legítimo.

2. **Alta — La conciliación del snapshot acepta novedades adicionales no presentes en el detalle semanal.** `_filtrar_detalles_integros` (`horas_extras_planilla.py:292-304`) compara únicamente los códigos esperados. Un grupo con hash válido que contenga las horas semanales esperadas más un código extra pasa la validación, evita el fallback y emite esa novedad adicional. La reconciliación debe exigir igualdad de códigos y totales, no solo comprobar el subconjunto esperado.

3. **Alta — La salida histórica todavía depende de asignaciones mutables del planificador.** Aunque las filas diarias se validan por hash, CC/SCC y el reparto de `SALARIO` se reconstruyen desde `nomina_planificador_dia_ot` vigente (`horas_extras_planilla.py:344-356,163-204`). Esa tabla se reemplaza mediante `DELETE`/`INSERT` al guardar el plan. Editar o borrar asignaciones después de confirmar puede cambiar una planilla histórica, en contradicción con el contrato documentado de snapshot inmutable. El snapshot actual conserva `ot_codigo`, pero no CC/SCC, por lo que no basta para reconstruir de forma estable el grano documentado.

## 4. Hallazgos no bloqueantes

1. **Media — La evidencia ERP ampliada no terminó limpiamente.** Los 12 casos focales y `compileall` fueron informados como aprobados, pero la suite combinada ERP agotó el timeout después de 26 puntos visibles. Los puntos no sustituyen el resumen final ni confirman teardown limpio.

2. **Media — Persisten riesgos operativos en el enriquecimiento ERP.** Las lecturas síncronas están correctamente descargadas al threadpool y los metadatos se consumen solo por clave exacta, evitando el fallback ambiguo anterior. Sin embargo, una misma `Session` ERP se reutiliza en dos workers, no hay timeout/circuit breaker y la conexión PostgreSQL local permanece ocupada mientras se espera ERP. Los `except` degradan la respuesta de forma segura, pero no hacen rollback ni conservan diagnóstico de excepción.

### Verificaciones favorables

- La resolución del responsable consulta y mapea tanto `Usuario.id` como `Usuario.cedula`.
- `UBICACION="CC"` prioriza `cc/scc`; `orden/sub_indice` quedan como respaldo.
- La consolidación usa exactamente `cedula + fecha + ot_cc + novedad` y omite filas con horas no positivas.
- Las asignaciones se filtran por tuplas exactas `(cedula, anio, semana_iso)`, no por productos cruzados de conjuntos.
- El bulk OT ya no atribuye metadatos de otra combinación: solo se consume una coincidencia exacta; claves incompletas quedan sin metadata.
- El endpoint es async, conserva RBAC y alcance, delega al servicio y fija `Cache-Control: no-store, private`.
- No se introdujo acceso síncrono al PostgreSQL local ni SQL ajeno a PostgreSQL. Los valores dinámicos están parametrizados.
- Los esquemas usan tipos concretos y todos los archivos focales permanecen por debajo de 550 líneas.
- No hay cambio físico de modelos en este alcance.

## 5. Tests / comandos ejecutados

- `python -m pytest --collect-only testing/backend/test_horas_extras_calculos_planilla.py` — PASS; 12 casos recolectados. No se ejecutaron tests por restricción del revisor.
- Evidencia informada: suite focal de planilla — **12 passed**.
- Evidencia informada: `compileall` — **passed**.
- Evidencia informada: suite combinada ERP — **timeout tras 26 puntos visibles**, sin agregado final.

### Tests requeridos

- Misma `orden` asignada a dos CC distintos, con reparto de novedad y costo: cada CC debe conservar sus valores correctos y la clave funcional debe seguir siendo única.
- Confirmar un cálculo, modificar/eliminar las asignaciones del planificador y comprobar la semántica histórica decidida.
- Snapshot con hash válido y código extra; snapshot parcialmente sustituido que conserva por casualidad un total; ambos deben degradar de forma segura.
- Integración del servicio con filtros exactos, alcance vacío, degradación independiente de empleados/OT y OT con varias combinaciones.
- Repetir la suite combinada ERP hasta obtener resumen y teardown limpios.

## 6. Documentacion actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` — no aplica al delta actual. Será obligatorio junto con migración y blindaje si la corrección persiste CC/SCC en el snapshot.
- [x] Especificación funcional — ya documenta clave, no-store, snapshot y fallback; debe mantenerse alineada con la decisión histórica final.
- [x] `testing/CATALOGO_PRUEBAS.md` — registra los 12 casos focales.
- RBAC: no requiere alta en el manifiesto; se reutiliza `nomina_horas_extras.leer`.

## 7. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

Motivos: atribución incorrecta cuando una OT se reparte entre CC distintos, conciliación incompleta del snapshot y dependencia histórica de asignaciones mutables.

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Corregir y probar el reparto de una misma OT entre CC distintos. | Implementación backend | Antes de integrar |
| Cerrar la validación de completitud del snapshot y fijar su semántica histórica. | Implementación backend | Antes de integrar |
| Obtener una ejecución combinada ERP con cierre limpio. | Orquestador | Antes de integrar |
