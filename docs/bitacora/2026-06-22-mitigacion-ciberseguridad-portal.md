# Bitacora - Mitigacion de ciberseguridad del portal

**Fecha:** 2026-06-22  
**Tema:** Inicio de mitigacion P0/P1 para ciberseguridad del portal  
**Plan:** `docs/reviews/plans/2026-06-22_ciberseguridad-mitigacion.md`  
**Informe ejecutivo:** `docs/reviews/builds/informe-ejecutivo-ciberseguridad-portal-2026-06-22.md`

## Cambios realizados

- Creada suite `testing/backend/test_security_openapi_auth_rbac.py` con guardrails deny-by-default para `/api/v2`.
- Registrado fallo rojo inicial: OpenAPI reporto rutas sin seguridad y `/api/v2/erp/empleado/123` respondia sin 401 previo.
- Agregado `backend_v2/app/core/security_policy.py` con allowlist publica y middleware Bearer para `/api/v2`.
- Actualizado `backend_v2/app/main.py` para aplicar middleware de seguridad y anotar OpenAPI en rutas no publicas.
- Actualizado `testing/CATALOGO_PRUEBAS.md` con la nueva suite critica.
- Creada suite `testing/backend/test_security_jwt_revocation.py` para revocacion efectiva de JWT web.
- Validacion de sesiones web por `jti`, `fin_sesion`, expiracion, usuario activo y presencia en tabla `sesiones`.
- `POST /api/v2/auth/refresh` ahora valida sesion activa antes de reemitir token y rota la sesion web.
- El middleware deny-by-default ahora valida sesion web activa, por lo que tambien rechaza tokens revocados en rutas que aun no usan `obtener_usuario_actual_db`.

## Validacion ejecutada

- `python -m pytest testing/backend/test_security_openapi_auth_rbac.py -v --tb=short` - 8 passed tras cubrir rechazo de tokens de recuperacion/verificacion y CORS en 401.
- `python -m pytest testing/backend/test_auth_refresh.py -v --tb=short` - 9 passed.
- `python -m pytest testing/backend/test_auth_rate_limit.py::TestLoginKeyFunc -v --tb=short` - 10 passed.
- `python -m py_compile backend_v2/app/core/security_policy.py backend_v2/app/main.py` - OK.
- `python scripts/security_check_backend.py` - OK.
- `python scripts/audit_coverage_check.py` - OK.
- `python -m pytest testing/backend/test_security_jwt_revocation.py -v --tb=short` - 7 passed.
- `python -m pytest testing/backend/test_mcp_revocation.py -v --tb=short` - 7 passed.
- `python -m py_compile backend_v2/app/services/auth/sesion_service.py backend_v2/app/services/auth/servicio.py backend_v2/app/api/auth/profile_router.py backend_v2/app/api/auth/login_router.py backend_v2/app/api/auth/refresh_router.py` - OK.
- `python -m pytest testing/backend/test_auth_refresh.py testing/backend/test_auth_rate_limit.py -v --tb=short` - comando combinado agoto timeout por duracion acumulada antes de reportar fallo.

## Pendiente inmediato

- Ejecutar el resto de `test_auth_rate_limit.py` dividido por clases.
- Implementar RBAC backend por modulo/accion para rutas que ahora solo quedan protegidas por token valido.
- Mantener la allowlist publica revisada y aprobada antes de cerrar P1.
