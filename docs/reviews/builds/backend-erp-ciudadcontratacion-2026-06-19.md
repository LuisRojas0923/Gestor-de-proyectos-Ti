# Plantilla — Reporte de Revisión de Build

**Fecha:** 2026-06-19
**Build:** Exponer `ciudadcontratacion` en listado ERP del planificador de horas extras
**Autor del build:** No especificado
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/services/erp/empleados_service.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras_planificador.py`
- `testing/backend/test_erp_empleados_service.py`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | approved | No | Revisión de diff y archivos backend indicados. |

## 3. Hallazgos bloqueantes

Ninguno.

## 4. Hallazgos no bloqueantes

- **Baja — cobertura de prueba mejorable** — `testing/backend/test_erp_empleados_service.py:50-58`: el test valida la respuesta esperada con `ciudadcontratacion`, pero el fake entrega ese atributo aunque el SQL no lo seleccione. Para blindar mejor la regresión, conviene añadir una aserción positiva sobre `sql_ejecutado` para confirmar que se selecciona `ciudadcontratacion`. No bloquea porque la implementación actual sí selecciona `C.ciudadcontratacion::text AS "ciudadcontratacion"` en `backend_v2/app/services/erp/empleados_service.py:252` y lo retorna en `backend_v2/app/services/erp/empleados_service.py:284`.

## 5. Tests / comandos ejecutados

- Reportado por el solicitante: `$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH; python -m pytest testing/backend/test_erp_empleados_service.py -q`.
- Ejecutado por esta revisión: inspección read-only de `git status`, `git diff` y lectura de archivos. No se re-ejecutó pytest por restricción de revisión.

## 6. Documentacion actualizada

- No aplica actualización de `docs/ESQUEMA_BASE_DATOS.md`: no hay cambio de modelo local/migración; se expone un campo ya existente del ERP externo.
- No aplica RBAC: no se crea endpoint, módulo ni permiso nuevo.

## 7. Decision final

- [x] `aprobado`
- [ ] `aprobado_con_riesgos` (riesgos documentados arriba)
- [ ] `bloqueado` (motivos en hallazgos bloqueantes)

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Opcional: reforzar el test con `assert "ciudadcontratacion" in sql_ejecutado`. | Implementador backend | Próxima iteración |
