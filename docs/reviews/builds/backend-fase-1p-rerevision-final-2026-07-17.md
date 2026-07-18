# Revisión backend — Fase 1P, rerevisión final acotada

**Fecha:** 2026-07-17
**Build:** Separación migrate/runtime, startup verify-only y regresiones auth
**Autor del build:** OpenCode
**Modo:** build, revisión read-only
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos revisados

- `backend_v2/app/main.py`
- `backend_v2/app/manage.py`
- `backend_v2/app/core/migrations/{manager,schema_verifier,auditoria_evento_migration,auth_runtime_protection,rbac_admin_procedures,bootstrap_admin}.py`
- `backend_v2/app/core/rbac_capability.py`
- `backend_v2/app/api/auth/*.py`, `backend_v2/app/services/auth/*.py` y `backend_v2/app/models/auth/usuario.py`
- `backend_v2/app/api/{panel_control,solid}/`
- `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.Pruebas3.yml`, `docker-compose.bootstrap.yml`
- `postgres/init/01-gestor-roles.sh`
- `testing/backend/test_{startup_migration_roles,startup_migration_roles_postgres,phase1p_auth_security,phase1p_endpoint_security}.py`
- `testing/backend/phase1p_http_acceptance.py`
- `docs/reviews/builds/2026-07-16_planilla-regional-fase-1p.md`

El alcance se limitó al delta de Fase 1P y a sus puertas contractuales. La deuda declarada en el documento base no se usó como bloqueante salvo impacto directo del delta.

## 2. Subagente ejecutado

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | blocked | sí | El job `migrate` de producción depende indirectamente de un secreto runtime que Compose no le entrega. |

## 3. Hallazgos bloqueantes del delta

### B1 — El job `migrate` de producción no puede arrancar con su entorno contractual

**Archivos/líneas:**

- `backend_v2/app/core/migrations/manager.py:42-43`
- `backend_v2/app/core/migrations/bootstrap_admin.py:8-9`
- `backend_v2/app/services/auth/servicio.py:12`
- `backend_v2/app/config.py:55-65,109-115`
- `docker-compose.prod.yml:29-39`
- `backend_v2/.dockerignore:13`

`manager.py` importa `asegurar_admin_inicial` en cada migración, incluso cuando ya existe un administrador. `bootstrap_admin.py` importa `ServicioAuth`; este importa `app.config`, cuya instancia global valida inmediatamente que `JWT_SECRET_KEY` sea fuerte cuando `ENVIRONMENT=production`. El servicio `migrate` de producción fija `ENVIRONMENT=production`, pero correctamente no recibe `JWT_SECRET_KEY`; además, `.env` queda excluido de la imagen. Por tanto, la importación falla antes de poder evaluar si el bootstrap es necesario y el job devuelve exit 1.

Esto bloquea la puerta central de Fase 1P: en producción no puede ejecutarse `migrate`, por lo que el backend dependiente de `service_completed_successfully` tampoco inicia. Inyectar el secreto JWT al migrador ocultaría el fallo, pero ampliaría secretos fuera del runtime; la corrección adecuada es desacoplar el hash de bootstrap de `ServicioAuth`/`app.config`.

**Prueba obligatoria:** ejecutar/importar el flujo real de `python -m app.manage migrate` con el conjunto exacto de variables del servicio `migrate` productivo, `ENVIRONMENT=production` y sin `JWT_SECRET_KEY`; debe completar con un admin preexistente y también cubrir el bootstrap de un solo uso sin adquirir secretos JWT. Conviene añadir una aserción estática que impida introducir `JWT_SECRET_KEY` en el servicio migrador.

## 4. Comprobaciones del delta sin hallazgo adicional

- Startup permanece verify-only: `backend_v2/app/main.py:214-220`; DDL/create-all queda en el job migrador: `backend_v2/app/core/migrations/manager.py:148-172`.
- Analistas nacen con bloqueo aleatorio y correo ERP marcado verificado, y el ascenso usa función protegida: `backend_v2/app/services/auth/provisioning_service.py:38-69`.
- Recuperación usa CAS sobre el hash vigente y rollback ante perdedor concurrente: `backend_v2/app/core/migrations/rbac_admin_procedures.py:88-101`; `backend_v2/app/services/auth/servicio.py:316-336`.
- Login/logout, validación y rotación de sesiones propagan fallos y verifican sesión persistida: `backend_v2/app/services/auth/sesion_service.py:22-136`; `backend_v2/app/api/auth/profile_router.py:35-61`.
- El rol migrador llega al backend para la verificación de membresías: `docker-compose.yml:60-62`, `docker-compose.prod.yml:79-81`, `docker-compose.Pruebas3.yml:82-84`.
- `auditoria_eventos` y sus índices se reparan en migrate y se validan semánticamente en startup: `backend_v2/app/core/migrations/auditoria_evento_migration.py:18-50`; `backend_v2/app/core/migrations/schema_verifier.py:160-175,213-223`.
- Emisión/revocación MCP y auditoría comparten transacción: `backend_v2/app/services/auth/mcp_service.py:66-90,130-179`.
- Se eliminó `create_all` del router SOLID: `backend_v2/app/api/solid/router.py:15-44`.
- Las mutaciones runtime de roles, permisos y módulos pasan por funciones `SECURITY DEFINER`; no permanece creación manual de módulos: `backend_v2/app/core/migrations/rbac_admin_procedures.py:24-165`; `backend_v2/app/api/auth/admin_router.py:220-347`; `backend_v2/app/api/auth/config_router.py:161-250`.
- Los tokens MCP no pueden mutar REST: `backend_v2/app/api/auth/profile_router.py:49-62`.
- Panel Control exige autenticación global y privilegio adicional en operaciones administrativas: `backend_v2/app/api/panel_control/router.py:16-25`; `backend_v2/app/api/panel_control/dependencies.py:8-13`.

## 5. Tests / comandos

- Evidencia aportada: **44 passed** críticos; rerun endpoint **6 passed**; aceptación PostgreSQL 15/Redis/FastAPI **1 passed en 195.17 s**; `py_compile` y Compose OK.
- Ejecutado por este revisor: `python -m pytest --collect-only testing/backend/test_startup_migration_roles.py testing/backend/test_phase1p_auth_security.py testing/backend/test_phase1p_endpoint_security.py testing/backend/test_startup_migration_roles_postgres.py -q` — **46 tests collected**.
- No se reejecutaron suites ni Docker por las restricciones read-only del subagente.
- La aceptación actual usa entorno de test (`testing/backend/phase1p_http_acceptance.py:19-29`) y no reproduce el entorno mínimo del job `migrate` productivo; por eso su verde no cubre B1.

## 6. Documentación / RBAC

- La separación operativa está documentada en `ADR-010`, `docs/OPERACION_MIGRACIONES_DB.md` y `docs/GUIA_MANTENIMIENTO.md`.
- No se detectó un seguimiento RBAC adicional distinto de cerrar B1 y añadir su regresión productiva.

## 7. Deuda residual preexistente, no bloqueante para este delta

Se mantienen como deuda separada los skips dependientes del entorno objetivo, los adaptadores ERP síncronos en rutas async, la exposición/HBA de PostgreSQL y Redis sin contraseña obligatoria, la aceptación pendiente con nombres de roles renombrados y la revisión selectiva de hunks concurrentes de `docs/ESQUEMA_BASE_DATOS.md`, todos ya declarados en `docs/reviews/builds/2026-07-16_planilla-regional-fase-1p.md:154-177`. El delta revisado no los empeora; no determinan este bloqueo.

## 8. Decisión final

- [ ] `APROBADO`
- [x] `BLOQUEADO`

Las correcciones funcionales listadas quedaron cerradas, pero B1 impide cumplir el flujo contractual `migrate -> backend` en producción.
