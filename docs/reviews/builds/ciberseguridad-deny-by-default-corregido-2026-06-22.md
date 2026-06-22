# Build review - Ciberseguridad deny-by-default corregido

**Fecha:** 2026-06-22  
**Rama:** `ciberseguridad`  
**Plan:** `docs/reviews/plans/2026-06-22_ciberseguridad-mitigacion.md`  
**Resultado:** `approved_with_risks`

## 1. Alcance

Primer corte P0/P1 del plan de mitigacion de ciberseguridad. El build implementa una barrera inicial deny-by-default para rutas `/api/v2`, con allowlist publica explicita, validacion Bearer basica, rechazo de tokens no-session, anotacion OpenAPI y pruebas automatizadas.

## 2. Cambios principales

- Nuevo `backend_v2/app/core/security_policy.py` con:
  - `PUBLIC_API_OPERATIONS` como SSOT de allowlist publica.
  - `requiere_autenticacion_api()` para proteger `/api/v2` salvo allowlist y `OPTIONS`.
  - `payload_es_sesion_web()` para aceptar solo JWT de sesion sin `scope`.
  - `middleware_api_v2_deny_by_default()` para responder 401 sin Bearer o con token invalido.
  - CORS manual en respuestas 401 del gate para origenes permitidos.
- `backend_v2/app/main.py` aplica el middleware y genera OpenAPI con seguridad declarada en rutas no publicas.
- Nueva suite `testing/backend/test_security_openapi_auth_rbac.py` con 8 casos.
- `testing/CATALOGO_PRUEBAS.md` registra la suite critica.
- `docs/bitacora/2026-06-22-mitigacion-ciberseguridad-portal.md` registra evidencias.

## 3. Correcciones tras revision

La primera revision detecto un bypass critico: el middleware aceptaba cualquier JWT firmado, incluyendo tokens de recuperacion de contrasena y verificacion de correo. Se corrigio exigiendo token web de sesion: `sub` presente, `token_type=session` y ausencia de `scope`.

Tambien se corrigio la respuesta 401 del middleware para conservar CORS en origenes permitidos, y se agrego cobertura para `OPTIONS` preflight.

## 4. Evidencia de validacion

- `python -m pytest testing/backend/test_security_openapi_auth_rbac.py -v --tb=short` - 8 passed.
- `python -m pytest testing/backend/test_auth_refresh.py -v --tb=short` - 9 passed.
- `python -m pytest testing/backend/test_auth_rate_limit.py::TestLoginKeyFunc -v --tb=short` - 10 passed.
- `python -m py_compile backend_v2/app/core/security_policy.py backend_v2/app/main.py` - OK.
- `python scripts/security_check_backend.py` - OK.
- `python scripts/audit_coverage_check.py` - OK.

## 5. Matriz de subagentes

```text
Subagente | Resultado | Observacion
----------|-----------|------------
security-rbac-reviewer | approved_with_risks | Bypass de tokens no-session corregido; queda RBAC granular y revocacion web.
backend-reviewer | approved_with_risks | Sin bloqueantes del alcance corregido; persiste riesgo de auth sin autorizacion.
docs-tests-reviewer | approved_with_risks | Trazabilidad suficiente; falta ADR, CI y evidencia ampliada.
```

## 6. Riesgos remanentes

- El gate global autentica, pero no autoriza por modulo, accion, rol u objeto.
- Rutas protegidas solo por middleware aun no validan revocacion de sesion web, usuario activo ni permisos.
- OpenAPI declara seguridad, pero no sustituye pruebas de RBAC real.
- Allowlist publica requiere ADR y aprobacion formal.
- Quedan pendientes hardening de uploads, CI y configuracion productiva segura.

## 7. Decision

`approved_with_risks` para mitigacion parcial interna. No aprobado para exposicion externa hasta completar RBAC backend real, revocacion JWT web, pruebas 403 por permiso, hardening de uploads, ADR y CI.
