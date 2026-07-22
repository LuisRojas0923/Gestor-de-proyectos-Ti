# Reporte de Revisión de Build

> **Estado histórico:** revisión focal conservada para auditoría. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21
**Build:** Revisión final backend de planilla de Horas Extras
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
- `testing/backend/test_horas_extras_ot_horarios.py`
- `docs/specs/2026-06-01_modulo-horas-extras-novedades.md`

Se ignoraron expresamente los demás cambios del worktree.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | aprobado_con_riesgos | No | Revisión estática focal posterior a las correcciones. |

## 3. Hallazgos bloqueantes

Ninguno.

Los tres bloqueos del reporte anterior quedaron resueltos: reparto multi-CC de horas/costos, rechazo de conceptos calculados inesperados y definición documental de CC/SCC/ERP como proyección vigente.

## 4. Hallazgos no bloqueantes

1. **Media — Borde de integridad para cálculos semanales sin detalles.** `horas_extras_planilla.py:319` solo rechaza códigos calculados inesperados cuando `esperadas` no está vacío. El flujo actual exige al menos un detalle semanal, por lo que no afecta registros creados válidamente; no obstante, un registro legado o corrupto sin detalles podría aceptar un snapshot con `codigo_calculado`. Conviene eliminar esa excepción implícita y añadir el caso de regresión.

2. **Media — Riesgo operativo ERP bajo latencia o sesión abortada.** Las consultas síncronas están fuera del event loop y la degradación conserva la respuesta local. Aun así, la misma sesión ERP se reutiliza secuencialmente en dos trabajos de threadpool, no hay timeout/circuit breaker y la sesión PostgreSQL local permanece abierta durante el enriquecimiento. No afecta la corrección focal demostrada, pero debe vigilarse antes de aumentar volumen.

### Verificaciones favorables

- Responsable resuelto por `Usuario.id` o `Usuario.cedula`; identificadores no resueltos ya no se exponen.
- `UBICACION="CC"` prioriza CC/SCC y usa orden/subíndice solo como respaldo.
- Novedad y costo se redistribuyen proporcionalmente entre todos los CC de una misma OT, conservando totales y omitiendo repartos en cero.
- Cardinalidad final única: `cedula + fecha + ot_cc + novedad`.
- Asignaciones limitadas por tuplas exactas `(cedula, anio, semana_iso)`.
- Snapshot validado por hash, periodo, códigos calculados y conciliación de totales; snapshot inválido degrada al detalle semanal.
- Metadatos OT solo se aplican por combinación exacta; no hay fallback ambiguo por orden.
- Endpoint async, protegido por RBAC/alcance, con `Cache-Control: no-store, private` y lógica delegada al servicio.
- `listar_calculos` vuelve a retornar `list`, preservando el contrato legado.
- SQL PostgreSQL parametrizado, sin acceso síncrono a la base local ni cambios físicos de esquema.
- Archivos focales por debajo de 550 líneas y esquemas con tipos concretos.

## 5. Tests / comandos ejecutados

- `python -m pytest --collect-only testing/backend/test_horas_extras_calculos_planilla.py testing/backend/test_horas_extras_ot_horarios.py` — PASS; 35 casos recolectados (16 planilla + 19 OT ERP).
- Evidencia informada: planilla — **16 passed**.
- Evidencia informada: OT ERP — **18 passed / 1 skipped**, teardown limpio.
- Evidencia informada: `compileall` — **passed**.

### Tests recomendados

- Snapshot de registro legado/corrupto sin detalles semanales y con `codigo_calculado`: debe rechazarse y no emitir la fila.
- Prueba de carga/timeout ERP para verificar liberación de sesiones y degradación bajo latencia sostenida.

## 6. Documentacion actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` — no aplica; no cambió el esquema físico.
- [x] Especificación funcional — diferencia snapshot diario de las proyecciones vigentes CC/SCC/ERP.
- [x] `testing/CATALOGO_PRUEBAS.md` — registra 16 PASS y 18 PASS / 1 SKIP.
- RBAC: no requiere entrada nueva; se reutiliza `nomina_horas_extras.leer`.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Cubrir el borde de snapshot sin detalles semanales. | Implementación backend | Próximo mantenimiento |
| Evaluar timeout/circuit breaker y ownership de sesión ERP. | Implementación backend | Antes de aumentar volumen |
