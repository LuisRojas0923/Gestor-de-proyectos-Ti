# Build Hotfix - Anotaciones de auditoria fuera del SQL

**Fecha:** 2026-07-17
**Build:** Hotfix de literales SQL en migrador y verificador runtime
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

## 1. Archivos modificados

- `backend_v2/app/core/migrations/schema_verifier.py`
- `backend_v2/app/core/migrations/manager.py`
- `backend_v2/app/core/migrations/rbac_admin_procedures.py`
- `backend_v2/app/core/migrations/auth_runtime_protection.py`
- `backend_v2/app/core/migrations/horarios_relaciones_migration.py`
- `testing/backend/test_sql_audit_annotations.py`
- `testing/CATALOGO_PRUEBAS.md`

## 2. Causa raiz y correccion

Veinticuatro comentarios Python `# @audit-ok` quedaron despues de abrir
literales de `sqlalchemy.text(...)`. PostgreSQL recibia el caracter `#` como
parte de la sentencia y abortaba con `PostgresSyntaxError`; el reloader de
Uvicorn seguia activo, pero FastAPI no completaba startup.

Las 24 anotaciones se movieron al argumento Python de `text(...)`. No cambiaron
sentencias, parametros, transacciones, roles, ACL, triggers ni procedimientos.
Se agrego una regresion AST que rechaza `@audit-ok` dentro de literales pasados
directamente a `text(...)` en todos los modulos de migracion.

## 3. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | APROBADO | No | Sin defectos; hotfix mecanico valido. |
| security-rbac-reviewer | APROBADO | No | Sin cambios de RBAC, ACL o superficie de supresion. |
| scope-reviewer | BLOQUEO RESUELTO | No | Se aclararon 24 casos y se aislo el alcance. |
| docs-tests-reviewer | PENDIENTE DE REREVISION | Si | Solicito extraer la prueba, actualizar catalogo y crear este reporte. |

## 4. Hallazgos

- No hay hallazgos tecnicos bloqueantes del backend o seguridad.
- La prueba inicialmente dejo `test_startup_migration_roles.py` en 516 lineas;
  se extrajo a `test_sql_audit_annotations.py` para mantener el limite de 500.
- La prueba cubre llamadas directas `text(...)`; no cubre alias ni SQL guardado
  primero en variables. Es suficiente para los patrones actuales del modulo.

## 5. Tests y comandos ejecutados

- Rojo: caso focal fallo en `auth_runtime_protection.py:38` al detectar
  `@audit-ok` dentro del SQL.
- Verde inicial: caso focal, **1 passed**, 2 warnings, 9.98 s.
- Suite startup antes de extraer el caso: **31 passed**, 2 warnings, 254.02 s.
- `python -m py_compile` sobre los cinco modulos y la prueba: PASS.
- `docker compose run --rm migrate`: exit 0.
- FastAPI: `Application startup complete`.
- `http://127.0.0.1:8000/health`: HTTP 200.
- Proxy Vite `/api/v2/config/public/check-modules`: HTTP 200.
- GET 1Q y 2Q para julio de 2026: HTTP 200 con contrato valido y cero filas.
- `test_infrastructure.py` y `test_regresiones.py` no se repitieron: no cambio
  logica ni esquema, y el camino operativo real de migracion/startup fue probado.

## 6. Documentacion actualizada

- `testing/CATALOGO_PRUEBAS.md`: agregado el guard focal.
- `docs/ESQUEMA_BASE_DATOS.md`: no aplica; no cambio el esquema.
- ADR/bitacora: no aplica; no hay decision arquitectonica nueva.
- `errors_memory.json`: no aplica para este hotfix autocontenido.

## 7. Decision final

- [ ] aprobado
- [ ] aprobado_con_riesgos
- [x] bloqueado hasta rerun focal y rerevision docs/tests

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Ejecutar suite startup y guard extraido | OpenCode | 2026-07-17 |
| Obtener aprobacion docs/tests final | OpenCode | 2026-07-17 |
