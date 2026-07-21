# Reporte de Revision de Build

**Fecha:** 2026-07-21
**Build:** Planilla detallada de calculos de Horas Extras
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/api/novedades_nomina/routers/horas_extras_consultas.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras_planilla.py`
- `backend_v2/app/services/novedades_nomina/horas_extras_planilla.py`
- `backend_v2/app/services/erp/empleados_service.py`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/calculoPlanillaColumns.tsx`
- `frontend/src/services/horasExtrasPlanillaService.ts`
- `frontend/src/types/horasExtrasPlanilla.ts`
- `testing/backend/test_horas_extras_calculos_planilla.py`
- `frontend/src/tests/CalculoListView.test.tsx`
- `frontend/src/tests/horasExtrasPlanillaService.test.ts`
- `docs/specs/2026-06-01_modulo-horas-extras-novedades.md`
- `testing/CATALOGO_PRUEBAS.md`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | aprobado_con_riesgos | No | Reparto multi-CC, integridad, identidad y alcance verificados. |
| frontend-reviewer | aprobado_con_riesgos | No | Contrato de 19 columnas, estados y carga incremental verificados. |
| frontend-table-specialist | aprobado_con_riesgos | No | Bloques de 100 filas y filtros combinados aprobados. |
| security-rbac-reviewer | aprobado_con_riesgos | No | RBAC, 404 por alcance, privacidad y no-store verificados. |
| docs-tests-reviewer | aprobado_con_riesgos | No | Conteos, comandos y semantica historica/vigente verificados. |
| scope-reviewer | aprobado_con_riesgos | No | Alcance focal y matriz de revisores completos. |

## 3. Hallazgos bloqueantes

Ninguno.

## 4. Hallazgos no bloqueantes

- CC, SCC y datos ERP son proyecciones vigentes, no parte del snapshot historico inmutable.
- La conexion ERP general no impone por codigo una credencial read-only ni circuit breaker.
- La tabla anuncia mediante `aria-rowcount` las filas montadas, no el total filtrado.
- El smoke ERP de produccion permanece opt-in y fue omitido en la suite automatica.
- El lint global conserva hallazgos preexistentes fuera del alcance; el lint focal no reporta errores.

## 5. Tests / comandos ejecutados

- `python -m pytest ../testing/backend/test_horas_extras_calculos_planilla.py -q` desde `backend_v2` - 17 passed.
- `python -m pytest ../testing/backend/test_horas_extras_ot_horarios.py -q` desde `backend_v2` - 18 passed, 1 skipped.
- `npm run test -- --run src/tests/CalculoListView.test.tsx src/tests/horasExtrasPlanillaService.test.ts` desde `frontend` - 11 passed.
- `npx eslint <archivos focales>` desde `frontend` - PASS sin hallazgos.
- `npm run build` desde `frontend` - PASS, 4042 modulos transformados.
- `python -m compileall -q <archivos focales>` desde `backend_v2` - PASS.
- `git diff --check` - PASS; solo advertencias de conversion LF/CRLF.

## 6. Documentacion actualizada

- [x] Contrato y evidencia en `docs/specs/2026-06-01_modulo-horas-extras-novedades.md`.
- [x] Suites y conteos preparados en `testing/CATALOGO_PRUEBAS.md`.
- [ ] `docs/ESQUEMA_BASE_DATOS.md`: no aplica; no hubo cambio de esquema fisico.
- [ ] ADR: no aplica; se reutilizaron decisiones y permisos existentes.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Ejecutar smoke read-only contra `OThorarios` con el rol ERP real. | Equipo de despliegue/ERP | Antes de produccion |
| Evaluar `aria-rowcount` total y endurecimiento read-only/circuit breaker ERP. | Equipo de producto/TI | Backlog |
