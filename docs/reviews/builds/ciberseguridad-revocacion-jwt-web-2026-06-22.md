# Build review - Revocacion JWT web

**Fecha:** 2026-06-22  
**Rama:** `ciberseguridad`  
**Plan:** `docs/reviews/plans/2026-06-22_ciberseguridad-mitigacion.md`  
**Resultado:** `approved_with_risks` tras correcciones

Este reporte supersede los reportes bloqueados previos del mismo corte de revocacion JWT web/MCP.

## 1. Alcance

Segundo corte P1 del plan de ciberseguridad. El objetivo es que los JWT web no sigan siendo validos si la sesion fue cerrada, revocada, expirada, no existe en la tabla `sesiones` o el usuario fue desactivado.

## 2. Cambios principales

- `backend_v2/app/services/auth/sesion_service.py` agrega `obtener_sesion_web_activa_por_jti()`.
- `backend_v2/app/services/auth/servicio.py` expone el helper de sesion web activa.
- `backend_v2/app/api/auth/profile_router.py` valida tokens web contra `sesiones.jti`, `fin_sesion`, expiracion y usuario activo.
- `backend_v2/app/api/auth/login_router.py` registra el `jti` real del JWT web al crear la sesion.
- `backend_v2/app/api/auth/refresh_router.py` valida sesion activa antes de refrescar, cierra la sesion anterior y registra la nueva sesion con nuevo `jti`.
- `backend_v2/app/core/security_policy.py` valida sesion activa web o MCP en el middleware global para rutas protegidas solo por el gate central.
- `testing/backend/test_security_jwt_revocation.py` cubre sesiones revocadas, tokens sin sesion, usuario inactivo, refresh revocado, token web revocado en ruta middleware-only y tokens MCP activo/revocado.
- `testing/CATALOGO_PRUEBAS.md` y bitacora actualizados.

## 3. Evidencia de validacion

- `python -m pytest testing/backend/test_security_jwt_revocation.py -v --tb=short` - 7 passed.
- `python -m pytest testing/backend/test_security_openapi_auth_rbac.py -v --tb=short` - 8 passed.
- `python -m pytest testing/backend/test_auth_refresh.py -v --tb=short` - 9 passed.
- `python -m pytest testing/backend/test_mcp_revocation.py -v --tb=short` - 7 passed.
- `python -m py_compile backend_v2/app/services/auth/sesion_service.py backend_v2/app/services/auth/servicio.py backend_v2/app/api/auth/profile_router.py backend_v2/app/api/auth/login_router.py backend_v2/app/api/auth/refresh_router.py` - OK.
- `python scripts/security_check_backend.py` - OK.
- `python scripts/audit_coverage_check.py` - OK.

## 4. Correcciones tras revision bloqueante

- El middleware global ahora valida sesion activa en DB, no solo firma/claims, para evitar que rutas sin dependencia auth propia acepten tokens revocados.
- El middleware global conserva compatibilidad MCP: permite tokens MCP activos con sesion `tipo_sesion='mcp'` y rechaza MCP revocados.
- `registrar_sesion()` usa la sesion DB recibida y propaga errores; ya no crea una sesion independiente ni oculta fallos.
- `refresh` rota en una sola sesion DB: valida sesion activa, marca la anterior como finalizada, crea la nueva fila con `jti` y solo responde si el commit fue exitoso.

## 5. Riesgos remanentes

- Las rutas sensibles aun necesitan RBAC backend por modulo/accion/objeto; revocacion no sustituye autorizacion.
- La prueba de refresh usa la funcion subyacente del endpoint por el wrapper de SlowAPI; conviene agregar E2E cuando haya cliente de pruebas estable para DB async.
- Falta ADR para politica de sesiones revocables y rotacion de refresh.
- Falta CI para ejecutar automaticamente estas suites.

## 6. Decision

Mitigacion parcial aprobada con riesgos. No apta por si sola para exposicion externa hasta cerrar RBAC granular, uploads, ADR y CI.
