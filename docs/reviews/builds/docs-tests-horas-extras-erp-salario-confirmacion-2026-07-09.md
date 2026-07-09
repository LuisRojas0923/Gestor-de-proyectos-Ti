# Docs/tests review — horas extras ERP salario y confirmación

**Fecha:** 2026-07-09  
**Scope:** tests para fuente salarial ERP, sobrescritura en pre-liquidación, rechazo de confirmación por salario/ARL desalineado o importes manipulados, monkeypatch de auditoría S2; documentación en `testing/CATALOGO_PRUEBAS.md` y `docs/specs/2026-06-01_modulo-horas-extras-novedades.md`.

## Veredicto

**Docs/tests review: approved_with_risks**

## Bloqueantes

No blocking findings.

## Evidencia revisada

- `testing/backend/test_erp_empleados_service.py:137-217` cubre `beneficio.salario`, resolución de salario/ARL y sobrescritura del payload de pre-liquidación desde ERP.
- `testing/backend/test_erp_empleados_service.py:220-260` cubre rechazo de confirmación cuando salario o ARL no coinciden con ERP.
- `testing/backend/test_erp_empleados_service.py:263-326` cubre rechazo de confirmación por importes manipulados (`valor_hora_ordinaria`).
- `testing/backend/test_horas_extras_s2.py:240-269` actualiza el test de auditoría para aislar resolución ERP y validación de importes con `monkeypatch`, preservando la verificación de `calculado_por`/`confirmado_por` desde usuario autenticado.
- `testing/CATALOGO_PRUEBAS.md:29` registra la suite `test_erp_empleados_service.py` y su propósito.
- `docs/specs/2026-06-01_modulo-horas-extras-novedades.md:209-214` documenta el contrato: salario desde `beneficio.salario`, ARL desde `contrato.riesgoarl`, y confirmación rechazada si difiere del ERP vigente.
- `testing/logs/test_report_2026-07-09_08-57-40.log:5-12` registra ejecución afectada exitosa: 9 passed, 0 failed, 0 skipped, 0 errors.

## Comandos ejecutados por este reviewer

- `git status --short` — inspección read-only del árbol de trabajo.
- `git diff --stat` — inspección read-only del volumen de cambios.
- `git diff -- testing/CATALOGO_PRUEBAS.md docs/specs/2026-06-01_modulo-horas-extras-novedades.md` — validación documental.
- `git diff -- testing/backend/test_erp_empleados_service.py testing/backend/test_horas_extras_s2.py` — validación de delta de pruebas.
- `python -m pytest --collect-only testing/backend/test_erp_empleados_service.py testing/backend/test_horas_extras_s2.py` — 26 tests collected; no ejecución real por rol de revisión.

## Required tests

No hay pruebas bloqueantes pendientes para este scope. La cobertura nueva satisface el mandato mínimo de backend para los fixes revisados y la evidencia afectada muestra 9/9 passed.

## Required docs

No hay documentación bloqueante pendiente.

- `testing/CATALOGO_PRUEBAS.md` actualizado.
- Spec funcional de horas extras actualizada.
- `docs/ESQUEMA_BASE_DATOS.md`: no aplica para este delta porque no se observan cambios de tablas/columnas persistidas locales; el cambio relevante es contrato de API/ERP.
- ADR-006: no aplica; no hay cambios en `.agents/skills/` ni `.opencode/agent/`.

## Riesgos residuales / cobertura recomendada

1. **Medium — Suite ampliada no re-ejecutada por este reviewer.** La evidencia trazable cubre 9 tests afectados; conviene mantener en gate la ejecución de `testing/backend/test_horas_extras_s2.py` completo y una matriz HE mayor cuando el entorno DB esté disponible.
2. **Medium — Casos negativos podrían parametrizarse.** El rechazo de importes manipulados se prueba con `valor_hora_ordinaria`; para mayor blindaje, agregar casos específicos para `factor_prestacional`, `detalle.valor_bruto`, `detalle.carga_prestacional` y `detalle.costo_total`, además de salario-only y ARL-only mismatch.
3. **Low — Frontend build/lint fue aceptado como evidencia reportada.** No fue re-ejecutado por este subagente por permisos; conservar el log del implementador en el paquete de merge.

## Blocking reasons

None.
