# Reporte de Revision de Plan

**Fecha:** 2026-07-15
**Estado:** Supersedido por la rerevisión bloqueante del 2026-07-16 y el plan corregido por fases
**Plan:** Planilla Regional automatica desde el Planificador
**Autor del plan:** OpenCode
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

Alimentar las pantallas existentes de Planillas Regionales 1Q/2Q con filas automaticas, trazables y exportables generadas desde los borradores del Planificador.

## 2. No-objetivos

- No eliminar ni recalcular archivos historicos.
- No escribir en ERP.
- No activar biometria en esta entrega.
- No modificar aplicaciones moviles.

## 3. Archivos / modulos afectados

- `backend_v2/app/models/novedades_nomina/`
- `backend_v2/app/services/novedades_nomina/`
- `backend_v2/app/services/novedades_nomina/seed_horas_extras.py`
- `backend_v2/app/services/erp/`
- `backend_v2/app/api/novedades_nomina/`
- `backend_v2/app/core/{migrations,rbac_manifest.py,auditoria_manifest.py}`
- `frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/`
- `frontend/src/services/`
- `testing/backend/` y `frontend/src/tests/`
- `docs/ESQUEMA_BASE_DATOS.md`, `testing/CATALOGO_PRUEBAS.md`
- `backend_v2/app/config.py`, `backend_v2/app/database.py`, `.env.example`, Compose y `.gitignore`

## 4. Pasos de implementacion

1. TDD de persistencia, ITEM, calculo, ERP, seguridad y exportacion.
2. Migracion/modelos y secuencia compartida.
3. Generador automatico y sincronizacion con Planificador.
4. Consulta combinada, filtros, facetas y XLSX.
5. RBAC y auditoria.
6. Vista compartida 1Q/2Q con tabla remota.
7. Validacion integral y documentacion.

## 5. Comandos de validacion

- `docker compose run --rm -T -v "${PWD}:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 backend pytest testing/backend/test_planilla_regional_*.py -q`
- `docker compose run --rm -T -v "${PWD}:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 backend pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -q`
- `docker compose exec -T frontend npm run test -- --run src/tests/planillaRegionalService.test.ts src/tests/usePlanillaRegional.test.tsx src/tests/PlanillaRegionalView.test.tsx src/tests/PlanillaRegionalRoutes.test.tsx`
- `docker compose exec -T frontend npm run lint`
- `docker compose exec -T frontend npm run build`
- `python scripts/sync_docs.py`

## 6. Impacto en documentacion

- [x] Spec funcional/tecnica.
- [ ] `docs/ESQUEMA_BASE_DATOS.md` durante ejecucion.
- [ ] `testing/CATALOGO_PRUEBAS.md` durante ejecucion.
- [ ] `docs/decisions/ADR-009-planilla-regional-item-versionado.md` durante ejecucion.
- [ ] Bitacora y walkthrough al cierre.

## 7. Evaluacion de riesgos

| Riesgo | Probabilidad | Mitigacion |
|---|---|---|
| Duplicar una novedad manual y automatica | Media | Origen separado, identidad logica y advertencia sin borrado automatico. |
| Borrar filas automaticas al cargar Excel | Alta | Filtrar borrado legacy por origen `ARCHIVO`. |
| Salario o contrato ERP ausente | Media | Fallar cerrado por empleado; nunca usar defaults. |
| N+1 contra ERP | Alta | Consulta masiva en un worker y una sesion ERP. |
| Descuadre de horas entre OT | Media | Validacion bloqueante antes de persistir. |
| Exposicion de salario | Alta | Permisos separados, alcance por cedula y `no-store`. |
| Cambios de horario rompen ITEM | Media | Versionado: archivar identidad anterior y crear nuevo ITEM. |
| Degradacion de tabla masiva | Media | Paginacion/filtros remotos y limite de filas renderizadas. |

## 8. Matriz de subagentes

```text
Subagente | Motivo | Resultado | Bloquea
----------|--------|-----------|---------
scope-reviewer | Alcance transversal | approved_with_risks | no
backend-reviewer | Calculo/ERP/persistencia | approved tras correccion RET/DXT | no
frontend-reviewer | Tabla y rutas existentes | approved_with_risks | no
docs-tests-reviewer | TDD y documentacion | approved | no
security-rbac-reviewer | Salario, alcance y exportacion | approved | no
```

## 9. Decision final

> Esta decisión histórica quedó invalidada. La decisión vigente se registra en la rerevisión del 2026-07-16.

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

## 10. Notas adicionales

El plan evita ampliar `PlanificadorSemanalView.tsx` y `DataTable.tsx`, ambos en el limite de lineas. El catalogo confirmado incluye `RET` (retiro), `ARL` (accidente laboral) y `DXT` (devuelto por tardanza), todos en dias. Todos los revisores obligatorios cerraron su revision. Los riesgos frontend/alcance son no bloqueantes; la ejecucion queda pendiente exclusivamente de aprobacion humana RIPER.
