# Revisión Build PR #19: integridad del manifiesto RBAC

**Fecha:** 2026-07-21
**Build:** Validación y sincronización fail-closed del manifiesto RBAC
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

## 1. Archivos modificados

- `backend_v2/app/core/rbac_manifest.py`
- `backend_v2/app/services/auth/rbac_discovery.py`
- `testing/backend/test_rbac_manifest.py`
- `testing/CATALOGO_PRUEBAS.md`
- `docs/reviews/builds/pr19-rbac-manifest-2026-07-21.md`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | aprobado_con_riesgos | No | Riesgo bajo: el advisory lock se prueba con mocks, no con dos sesiones PostgreSQL reales. |
| security-rbac-reviewer | aprobado | No | Logging saneado; rollback y propagación fail-closed validados. |
| docs-tests-reviewer | aprobado | No | Catálogo y evidencia final coherentes. |
| scope-reviewer | aprobado | No | Alcance mínimo, sin scope creep. |

## 3. Hallazgos bloqueantes

Ninguno.

## 4. Hallazgos no bloqueantes

- La prueba verifica la emisión del advisory lock transaccional, pero no mide el bloqueo efectivo entre dos sesiones PostgreSQL reales.

## 5. Tests / comandos ejecutados

Rojo TDD inicial:

```powershell
$env:PYTHONPATH="backend_v2"; py -3.12 -m pytest testing/backend/test_rbac_manifest.py -q
```

```text
2 failed
```

Verde final ampliado:

```powershell
$env:PYTHONPATH="backend_v2"; py -3.12 -m pytest testing/backend/test_rbac_manifest.py testing/backend/test_audit_coverage_manifest.py testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -q
```

```text
14 passed, 4 skipped, 2 warnings
```

Los skips corresponden a pruebas condicionadas por servicios opcionales del entorno. `git diff --check` terminó sin errores.

## 6. Documentación actualizada

- [x] `testing/CATALOGO_PRUEBAS.md`
- [ ] `docs/ESQUEMA_BASE_DATOS.md`: no aplica; no hay cambios de esquema.
- [ ] ADR: no aplica; se usa una primitiva PostgreSQL existente sin introducir una decisión arquitectónica nueva.
- [ ] Memoria de errores: no aplica; no se detectó un error recurrente del entorno.

## 7. Decisión final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

## 8. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Añadir una prueba concurrente con dos sesiones PostgreSQL si se incorpora infraestructura de integración RBAC. | Backend | Sin fecha |
