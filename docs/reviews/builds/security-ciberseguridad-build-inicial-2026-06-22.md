Security/RBAC review: blocked

## Checklist results
- Auth en endpoints: ❌
- Schemas sin dict: N/A
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: N/A

## Findings

1. **BLOQUEANTE — bypass por JWT no-session en middleware deny-by-default.**
   `backend_v2/app/core/security_policy.py:55` acepta cualquier JWT firmado que `ServicioAuth.obtener_payload_token()` pueda decodificar. Ese helper tambien valida tokens de recuperacion de clave (`scope=password_recovery`) y verificacion de correo (`scope=verify_email`) porque solo verifica firma/expiracion. En rutas que siguen sin `Depends(obtener_usuario_actual_db)` y dependen solo del middleware, un token de reset/verificacion vigente podria atravesar el deny-by-default. Ejemplos de rutas middleware-only: `POST /api/v2/solid/seed`, `POST /api/v2/erp/sincronizar`, `POST /api/v2/ia/analizar`.
   - CWE: CWE-287, CWE-863.
   - Recomendacion: el gate global debe rechazar tokens con `scope` de flujo publico y aceptar solo `token_type=session` (y `mcp` solo si se valida jti/sesion activa). Agregar pruebas con `ServicioAuth.crear_token_recuperacion()` y `crear_token_verificacion()` contra rutas sensibles esperando 401.

2. **ALTO — OpenAPI puede dar falso positivo de seguridad/RBAC.**
   `backend_v2/app/main.py:282-291` marca seguridad en toda ruta no publica aunque el router no tenga dependencia de auth/RBAC. El test `testing/backend/test_security_openapi_auth_rbac.py` verifica esa marca, pero no demuestra autorizacion por modulo/rol ni object-level. Esto cierra el 401 sin token, pero no el 403 por permisos: cualquier JWT de sesion valido puede alcanzar endpoints historicamente sin auth.
   - CWE: CWE-862, CWE-639.
   - Recomendacion: mantener el middleware como compensating control, pero agregar dependencias `obtener_usuario_actual_db`/`requerir_modulo(...)` por router sensible y tests 403 por rol/modulo.

3. **ALTO — allowlist publica mas amplia que la baseline estricta.**
   `PUBLIC_API_OPERATIONS` incluye `forgot-password`, `reset-password`, `registro` y `verify-email` ademas de health/login/setup/password-status. Pueden ser funcionalmente necesarios, pero deben quedar formalmente aprobados porque son superficie publica de auth. `password-status` continua siendo oraculo de enumeracion por diseno documentado.
   - CWE: CWE-203.
   - Recomendacion: documentar la allowlist como decision de seguridad, importar la allowlist real en tests o generar un snapshot aprobado, y agregar controles de respuesta uniforme/latencia para flujos de cuenta.

4. **MEDIO — refresh y tokens invalidos quedan parcialmente fuera de rate limit/auditoria de endpoint.**
   Para rutas protegidas, el middleware responde 401 antes de ejecutar decoradores SlowAPI del endpoint. En `/auth/refresh`, tokens ausentes/invalidos no pasan por el rate limit del router. No habilita acceso, pero reduce telemetria y control anti-abuso.
   - Recomendacion: si se mantiene middleware global, instrumentar rate limit/log central para 401 del gate o excluir `/auth/refresh` para que su dependency/limiter maneje todos los casos.

## RBAC/config impact

- `backend_v2/app/core/rbac_manifest.py` no requiere nuevo modulo por este build, pero sigue pendiente aplicar RBAC backend real por modulo/accion.
- No se observaron nuevos secretos ni cambios Docker/env. `.env` sigue ignorado en `.gitignore`.
- Las evidencias documentadas reportan `test_security_openapi_auth_rbac.py` y pruebas auth/refresh/rate-limit parciales en verde, pero falta test de revocacion JWT web y test de token-scope contra el middleware.

## Blocking reasons

- El control central puede aceptar tokens firmados de flujos publicos no destinados a autenticar sesiones.
- OpenAPI queda anotado como seguro aunque varias rutas solo tienen chequeo global de token y no RBAC/rol/modulo.

Severity: BLOQUEANTE
