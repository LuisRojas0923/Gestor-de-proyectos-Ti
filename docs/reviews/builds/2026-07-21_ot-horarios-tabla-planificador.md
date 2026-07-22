# Revision de Build: OT Horarios y Tabla del Planificador

**Fecha:** 2026-07-21
**Build:** Consulta `OThorarios` y mejoras de tabla del planificador
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

## 1. Alcance

- Endpoint protegido y paginado para consultar la vista ERP `OThorarios`.
- Cliente frontend del selector OT sobre la ruta nueva.
- Columnas agrupadas, scroll horizontal estable y orden accesible en `DataTable`.
- Pruebas backend/frontend y contrato S7 actualizados.
- Se excluyen los archivos concurrentes no relacionados
  `docs/reviews/plans/2026-07-21_bitacoras-operacionales-web.md` y
  `docs/specs/2026-07-21_bitacoras-operacionales-web.md`, junto con
  `docs/reviews/plans/2026-07-21_sincronizacion-perfiles-usuarios-erp.md` y
  `docs/specs/2026-07-21_sincronizacion-perfiles-usuarios-erp.md`.

## 2. Archivos principales

- `backend_v2/app/api/novedades_nomina/routers/horas_extras_planificador.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras_planificador.py`
- `backend_v2/app/services/erp/ordenes_trabajo_service.py`
- `testing/backend/test_horas_extras_ot_horarios.py`
- `frontend/src/components/molecules/DataTable.tsx`
- `frontend/src/components/molecules/FilterDropdown.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/VistaTabularHorarios.tsx`
- `frontend/src/services/horasExtrasService.ts`
- `frontend/src/tests/horasExtrasOtHorariosService.test.ts`
- `docs/specs/2026-06-17_sprint-S7-planificador-semanal.md`
- `testing/CATALOGO_PRUEBAS.md`

## 3. Revisiones

| Subagente | Resultado | Bloquea merge | Notas |
|---|---|---|---|
| `harness-router` | matriz aplicada | no | Backend, frontend, seguridad y docs/tests obligatorios |
| `backend-reviewer` | `approved_with_risks` | no | Determinismo, nulabilidad, comodines y pruebas HTTP corregidos; smoke ERP bloquea despliegue |
| `frontend-reviewer` | `approved_with_risks` | no | Empty state y `aria-sort` corregidos; falta navegador real móvil |
| `security-rbac-reviewer` | `approved_with_risks` | no | RBAC, SQL parametrizado y `no-store` correctos; riesgo de carga y dato financiero documentado |
| `docs-tests-reviewer` | `approved_with_risks` | no | Evidencia, contrato y puerta productiva persistidos en este reporte, spec y catálogo |

## 4. Hallazgos corregidos

- La ruta exige `q` significativo de 2 a 100 caracteres, escapa comodines SQL y limita `limit` y `offset`.
- La consulta excluye categorías nulas y elige duplicados de forma determinista.
- Se añadieron pruebas HTTP de autenticación, límites y filas fuera de contrato.
- Se añadió un smoke ERP producción opt-in, de solo lectura, que exige un hit conocido, página vacía con total estable y respuesta menor a 30 segundos.
- El cuerpo conserva el scroll horizontal aunque no existan resultados.
- El encabezado expone `aria-sort` para columnas simples o agrupadas.
- La evidencia automatizada quedó separada del smoke productivo pendiente.

## 5. Evidencia

- TDD backend inicial: **2 failed, 12 passed, 1 skipped**.
- TDD de endurecimiento: **2 failed, 15 passed, 1 skipped**.
- Backend focal final: **18 passed, 1 skipped** el 2026-07-22; el skip corresponde exclusivamente al smoke ERP producción.
- Frontend focal: **22 passed** en tres suites.
- ESLint focal sobre ocho archivos: **PASS**, sin salida.
- Build Vite: **PASS**, 4039 módulos transformados.
- Infraestructura y regresiones: **4 passed, 4 skipped**; los skips requieren credenciales/datos opcionales.
- Consulta no autenticada a la ruta nueva: **401**.
- `compileall` backend focal: **PASS**.
- `git diff --check`: **PASS**.

Comandos principales:

```powershell
docker compose run --rm -v "$((Get-Location).Path):/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 backend pytest testing/backend/test_horas_extras_ot_horarios.py -q
docker compose run --rm -v "$((Get-Location).Path):/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 -e TEST_BASE_URL=http://backend:8000/api/v2 backend pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -q
npm run test -- src/components/molecules/__tests__/DataTable.test.tsx src/tests/PlanificadorSemanalFestivos.test.tsx src/tests/horasExtrasOtHorariosService.test.ts --run
npx eslint src/components/molecules/DataTable.tsx src/components/molecules/FilterDropdown.tsx src/components/molecules/__tests__/DataTable.test.tsx src/config/api.ts src/pages/ServicePortal/pages/HORAS_EXTRAS/components/VistaTabularHorarios.tsx src/services/horasExtrasService.ts src/tests/PlanificadorSemanalFestivos.test.tsx src/tests/horasExtrasOtHorariosService.test.ts
npm run build
docker compose exec backend python -m compileall -q app/api/novedades_nomina/routers/horas_extras_planificador.py app/services/erp/ordenes_trabajo_service.py app/models/novedades_nomina/schemas_horas_extras_planificador.py
```

## 6. Documentacion

- [x] Contrato y puerta de despliegue en la especificación S7.
- [x] Suites automáticas y smoke productivo separados en el catálogo.
- [x] Reporte de build actual.
- [ ] `docs/ESQUEMA_BASE_DATOS.md`: no aplica; no cambió el esquema local.
- [ ] ADR nuevo: no aplica; no se introdujo una decisión arquitectónica durable.

## 7. Riesgos residuales

- La vista `OThorarios` no existe en `solidpruebas3`; falta validar en producción
  relación/casing, permiso `SELECT`, columnas, tipos, nulabilidad y rendimiento.
- El `ILIKE` multicolumna y el conteo exacto pueden consumir recursos del ERP;
  existe timeout de 30 segundos, pero no rate limit específico para esta ruta.
- `vr_contratado` cruza al navegador y no debe tratarse como fuente contable
  autoritativa al persistir o calcular.
- Falta validación en navegador real del scroll sincronizado a ancho móvil.

## 8. Decision

- [x] `aprobado_con_riesgos` para merge.
- [x] Despliegue bloqueado hasta completar el smoke ERP producción.

## 9. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Ejecutar el smoke read-only con `RUN_ERP_PROD_CONTRACT=1` y una búsqueda representativa | Equipo despliegue/ERP | 2026-07-22, antes de desplegar |
| Confirmar permiso `SELECT`, contrato y tiempo menor de 30 segundos | Equipo despliegue/ERP | 2026-07-22, antes de desplegar |
| No desplegar y conservar respuesta `503` si el contrato falla | Equipo despliegue | Durante el despliegue |
