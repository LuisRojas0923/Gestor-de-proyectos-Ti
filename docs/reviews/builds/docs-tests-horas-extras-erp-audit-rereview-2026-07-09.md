# Docs/tests review — horas extras ERP audit rereview

**Fecha:** 2026-07-09  
**Scope:** re-review read-only tras fixes: `testing/backend/test_horas_extras_endpoint_audit.py`, expansión de `testing/backend/test_erp_empleados_service.py` para `firma_calculo` y rechazo de manipulación coherente, split de `testing/backend/test_horas_extras_s2.py`, actualización de `testing/CATALOGO_PRUEBAS.md` y `docs/specs/2026-06-01_modulo-horas-extras-novedades.md`.

## Veredicto

**Docs/tests review: approved_with_risks**

## Bloqueantes

No blocking findings.

## Evidencia revisada

- `testing/backend/test_erp_empleados_service.py` cubre salario desde `beneficio.salario`, sobrescritura backend de salario/ARL, `firma_calculo`, rechazo por salario/ARL distinto al ERP, importes manipulados y detalle coherentemente recalculado con firma inválida.
- `testing/backend/test_horas_extras_endpoint_audit.py` extrae la prueba endpoint-level de auditoría y valida que `usuario_confirma` del cliente no controle `calculado_por`/`confirmado_por`.
- `testing/backend/test_horas_extras_s2.py` queda en 547 líneas, bajo el límite de 550 líneas.
- `testing/CATALOGO_PRUEBAS.md` registra `test_erp_empleados_service.py` y `test_horas_extras_endpoint_audit.py`.
- `docs/specs/2026-06-01_modulo-horas-extras-novedades.md` documenta el contrato de salario ERP, ARL ERP y firma de pre-liquidación.
- Log trazable: `testing/logs/test_report_2026-07-09_09-17-52.log` reporta 27 passed, 0 failed, 0 skipped, 0 errors para `test_erp_empleados_service.py`, `test_horas_extras_endpoint_audit.py` y `test_horas_extras_s2.py`.

## Comandos ejecutados por este reviewer

- `git status --short; git diff --stat; git diff --name-only` — inspección read-only del árbol de trabajo.
- `git diff -- testing/backend/test_horas_extras_endpoint_audit.py testing/backend/test_erp_empleados_service.py testing/backend/test_horas_extras_s2.py testing/CATALOGO_PRUEBAS.md docs/specs/2026-06-01_modulo-horas-extras-novedades.md` — validación del delta de pruebas/documentación.
- `python -m pytest --collect-only testing/backend/test_erp_empleados_service.py testing/backend/test_horas_extras_endpoint_audit.py testing/backend/test_horas_extras_s2.py` — 27 tests collected; no ejecución real por rol de revisión.

## Required tests

No hay pruebas bloqueantes pendientes para este scope. La evidencia afectada queda alineada con el mandato backend: 27/27 passed en el log del implementador y 27 collected por este reviewer.

## Required docs

No hay documentación bloqueante pendiente.

- `testing/CATALOGO_PRUEBAS.md`: actualizado.
- Spec funcional HE: actualizado con contrato ERP/firma.
- `docs/ESQUEMA_BASE_DATOS.md`: no aplica; no se observan cambios de tablas/columnas persistidas locales, solo contrato API/Pydantic/ERP.
- ADR-006: no aplica; no hay cambios en `.agents/skills/` ni `.opencode/agent/`.

## Riesgos residuales / cobertura recomendada

1. **Medium — Validación limitada al set afectado.** El set HE afectado tiene evidencia verde; no se re-ejecutó suite backend completa ni Master Health Check en esta revisión.
2. **Low — Frontend checks aceptados como evidencia reportada.** El solicitante reporta build y ESLint focal en verde; este subagente no ejecuta `npm` por permisos. Si el cambio frontend continúa en el merge, conservar logs de build/eslint y considerar Vitest focal de vistas/servicios HE.
3. **Low — Decisión de firma HMAC documentada en spec, no en ADR.** No bloquea este delta; si el patrón `firma_calculo` se reutiliza fuera de HE, promoverlo a ADR de seguridad/contrato.

## Blocking reasons

None.
