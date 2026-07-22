# Reporte de Revisión de Build

> **Estado histórico:** revisión intermedia no vigente. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21
**Build:** Planilla revisada de cálculos de Horas Extras
**Autor del build:** No especificado
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/api/novedades_nomina/routers/horas_extras_consultas.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras_planilla.py`
- `backend_v2/app/services/novedades_nomina/horas_extras_planilla.py`
- `backend_v2/app/services/erp/empleados_service.py`
- `backend_v2/app/services/erp/ordenes_trabajo_service.py`
- `testing/backend/test_horas_extras_calculos_planilla.py`
- `testing/backend/test_horas_extras_ot_horarios.py` (solo el test bulk nuevo)

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | bloqueado | Sí | Revisión estática limitada al alcance solicitado; se ignoró el resto del worktree. |

## 3. Hallazgos bloqueantes

1. **Alta — `RESPONSABLE` no resuelve de forma fiable al usuario confirmador.** `horas_extras_planilla.py:106,127,293-303` consulta `Usuario.id` usando los valores de `confirmado_por/calculado_por`. Sin embargo, los flujos de confirmación existentes persisten preferentemente `usuario.cedula` (`horas_extras_planificador.py:274` y `horas_extras.py:348`). Cuando `Usuario.id != Usuario.cedula`, la consulta no encuentra el nombre y la respuesta expone la cédula/identificador crudo. El test lo oculta al usar `USR-CAMILA` simultáneamente como valor persistido y clave del mapa. Esto incumple `RESPONSABLE = usuario confirmador` en el formato nominal esperado por la UI.

2. **Alta — El discriminador fijo `UBICACION="CC"` no coincide con los campos mostrados.** `_metadata_ot` prefiere siempre `orden` para `ot_cc` y `sub_indice` para `sub_subc` (`horas_extras_planilla.py:61-64`), mientras `_construir_fila` fija `ubicacion="CC"` (`:119-123`). Para la combinación cubierta por el test ERP (`orden=1007`, `cc=3080`, `scc=10`, `sub_indice=300`), la fila quedaría `OT/CC=1007`, `SUB./SUBC.=300`, `UBICACION=CC`, en vez de los campos CC `3080/10`. El test de planilla usa deliberadamente `cc=None` y no detecta la contradicción. Debe alinearse el mapeo con la decisión de negocio o documentar y probar una semántica distinta.

3. **Alta — No se garantiza la cardinalidad única empleado+fecha+OT+novedad.** Las asignaciones solo prohíben duplicar la tupla completa `(orden, cc, scc, sub_indice)`, por lo que un día puede contener la misma `orden` en combinaciones distintas. La planilla emite una fila `SALARIO` por asignación (`horas_extras_planilla.py:185-204`) y `_asignacion_para_detalle` asigna todos los detalles con esa orden a la primera coincidencia (`:68-85,206-223`). El resultado puede duplicar la misma clave de negocio, perder el CC/subíndice correcto y no agregar horas/costo por OT+novedad. Además, una asignación de peso cero produce una fila salarial de `0` horas porque `_distribuir_horas` no filtra pesos no positivos (`:36-50`). Los tests solo cubren OTs distintas y pesos positivos.

## 4. Hallazgos no bloqueantes

1. **Media — Enriquecimiento OT incompleto o potencialmente incorrecto en fallback.** El lote ERP se construye únicamente desde asignaciones locales actuales (`horas_extras_planilla.py:317-320`). OTs presentes solo en el snapshot o en detalles semanales históricos (`:225-245`) no se consultan y quedan sin cliente/especialidad. Cuando no existe coincidencia exacta, `_metadata_ot` toma la primera combinación con la misma orden (`:53-60`), lo que puede atribuir cliente/descripción de otro CC. El test bulk valida el diccionario exacto, pero no una orden con varias combinaciones ni el fallback histórico.

2. **Media — El snapshot se consume sin validar integridad/completitud.** La lectura directa (`horas_extras_planilla.py:274-280`) no usa el validador de `hash_snapshot`. Con una sola fila parcial, `grupos` deja de estar vacío y se omite completamente el fallback semanal (`:225-246`), pudiendo devolver una planilla parcial o alterada desde una fuente declarada inmutable.

3. **Media — Riesgo de recursos aunque no hay N+1.** La implementación usa lotes y mantiene un número fijo de consultas, pero conserva abierta la transacción/conexión PostgreSQL local mientras espera dos enriquecimientos ERP (`horas_extras_planilla.py:261-323`). El bulk laboral añade hasta cinco consultas de `information_schema` por petición antes de consultar empleados (`empleados_service.py:191-229`), y la misma `Session` síncrona ERP se usa secuencialmente mediante ejecuciones de threadpool potencialmente distintas. Una falla PostgreSQL del primer enriquecimiento tampoco hace `rollback` antes del segundo intento. Esto aumenta latencia, presión de pools y fragilidad durante degradación ERP.

4. **Baja — Diagnóstico ERP insuficiente.** Ambos `except Exception` (`horas_extras_planilla.py:314-322`) descartan contexto y `exc_info`; la degradación es segura para el cliente, pero dificulta distinguir indisponibilidad, sesión abortada o defecto SQL.

### Verificaciones favorables

- El GET está antes de la ruta dinámica, es `async`, usa `requiere_permiso_he_leer` y conserva `cedulas_permitidas`; no requiere entrada nueva en el manifiesto RBAC.
- El esquema expone 23 propiedades: las 19 columnas de negocio de UI más `fila_id`, `calculo_id`, `costo_total` y `estado` como metadatos internos.
- La lógica de negocio permanece en servicio; el router solo valida/delega.
- Las consultas nuevas son PostgreSQL y parametrizan valores. Los fragmentos interpolados son placeholders generados internamente, no entrada cruda del usuario.
- No hay escritura ni cambio estructural; no aplica migración ni actualización de `docs/ESQUEMA_BASE_DATOS.md`.
- Todos los archivos revisados están por debajo de 550 líneas.

## 5. Tests / comandos ejecutados

- `python -m pytest --collect-only testing/backend/test_horas_extras_calculos_planilla.py testing/backend/test_horas_extras_ot_horarios.py` — PASS; 25 casos recolectados. Este comando de colección local está autorizado para el revisor; no ejecutó tests.
- Evidencia informada: planilla focal — 6 PASS.
- Evidencia informada: combinado focal — 14 PASS.
- Evidencia informada: lote ampliado — 35 marcadores PASS / 1 SKIP, pero timeout durante teardown; no equivale a una finalización limpia de la suite.

### Tests requeridos

- Confirmador con `Usuario.id` distinto de `Usuario.cedula`, y estados `CONFIRMADO`/`PENDIENTE_AUTORIZACION`, verificando el nombre correcto y no el identificador crudo.
- Asignación real con `orden`, `cc`, `scc` y `sub_indice` poblados, fijando el mapeo compatible con `UBICACION=CC`.
- Dos asignaciones con la misma orden y combinaciones CC distintas; afirmar una sola fila por clave de negocio o formalizar otra clave y probarla.
- Asignación con peso cero y reparto con residuo; no debe emitir filas salariales de cero horas y la suma debe conservar las horas ordinarias.
- OT histórica/snapshot sin asignación local actual, y una orden ERP con múltiples combinaciones, evitando enriquecimiento arbitrario.
- Snapshot parcial o con hash inválido; definir degradación/fallo seguro.
- Prueba del servicio completo que confirme lotes únicos, degradación independiente de empleado/OT y ausencia de consulta ERP con alcance vacío.
- Casos HTTP 401/403 del GET `/calculos/planilla` y repetición del lote ampliado en Docker hasta completar teardown sin timeout.

## 6. Documentacion actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` — no aplica; no hay cambio de modelo físico.
- [ ] ADR/bitácora — no requerida para este GET; sí debe quedar explícita la semántica `OT/CC` bajo `UBICACION=CC` si difiere del contrato histórico.
- [x] `testing/CATALOGO_PRUEBAS.md` — la suite de planilla y la suite OT están registradas.
- RBAC: sin cambio de manifiesto; se reutiliza el permiso existente de lectura HE.

## 7. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

Motivos: mapeo no fiable del responsable, contradicción `CC`/campos OT y cardinalidad no garantizada para la clave de negocio solicitada.

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Corregir y fijar con tests los tres hallazgos de severidad alta. | Implementación backend | Antes de integrar |
| Añadir cobertura de fallback, integridad y degradación ERP. | Implementación backend | Antes de integrar |
| Repetir suites focal y ampliada en Docker con teardown completo. | Orquestador | Antes de integrar |
