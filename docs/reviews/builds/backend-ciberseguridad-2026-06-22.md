# Plantilla — Reporte de Revisión de Build

**Fecha:** 2026-06-22
**Build:** Mitigación backend ciberseguridad API v2 deny-by-default
**Autor del build:** no informado
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/main.py`
- `backend_v2/app/core/security_policy.py`
- `testing/backend/test_security_openapi_auth_rbac.py`
- `testing/CATALOGO_PRUEBAS.md`
- `docs/bitacora/2026-06-22-mitigacion-ciberseguridad-portal.md`
- `docs/reviews/builds/security-ciberseguridad-build-inicial-2026-06-22.md`
- `docs/reviews/builds/security-portal-ciberseguridad-2026-06-22.md`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | approved_with_risks | No | Revisión read-only del backend, middleware, OpenAPI, allowlist y tests. |

## 3. Hallazgos bloqueantes

Ninguno para el alcance corregido. El bloqueo previo por aceptación de tokens `recovery`/`verify` queda mitigado: `payload_es_sesion_web()` rechaza cualquier JWT con `scope` y la suite cubre tokens de recuperación/verificación contra rutas sensibles.

## 4. Hallazgos no bloqueantes

1. **ALTO — RBAC backend sigue pendiente.** El middleware corrige autenticación global, pero no autorización por módulo/rol/objeto. Cualquier JWT de sesión válido puede llegar a endpoints que históricamente no tenían `Depends(obtener_usuario_actual_db)` ni `requerir_modulo(...)` (ej. `POST /api/v2/auth/analistas/crear`, rutas ERP/SOLID/inventario/viáticos si no tienen checks propios). Requiere hardening por router/acción.
2. **ALTO — Revocación/estado de usuario no se valida en rutas protegidas solo por middleware.** El gate global solo decodifica firma/expiración y claims (`sub`, `scope`, `token_type`); no consulta sesión web activa, logout/reset, usuario desactivado ni permisos. Además acepta tokens legacy sin `token_type` como `session` por compatibilidad.
3. **MEDIO — OpenAPI declara seguridad sintética.** `custom_openapi()` anota rutas no públicas como OAuth2, lo cual documenta el gate global, pero puede dar falsa sensación de RBAC real. El test importa la misma allowlist productiva, por lo que una ampliación accidental de `PUBLIC_API_OPERATIONS` no fallaría sin snapshot/aprobación explícita.
4. **MEDIO — Allowlist pública requiere gobierno formal.** Además de health/login/setup/password-status, incluye `forgot-password`, `reset-password`, `registro` y `verify-email`. Son funcionalmente plausibles, pero deben quedar aprobadas en ADR/bitácora y con controles anti-enumeración/rate limit. `verify-email` no muestra rate limit propio.
5. **MEDIO/BAJO — Orden de middleware y CORS.** El middleware de seguridad queda antes de CORS para respuestas 401, por eso se agregan headers CORS manuales. Esto cumple el caso probado, pero duplica origen/regex respecto a `main.py`; si cambia CORS principal, las respuestas 401 pueden quedar divergentes. Los 401 del gate también ocurren antes de rate limiting/auditoría del endpoint, incluyendo `/auth/refresh` inválido/sin token.

## 5. Tests / comandos ejecutados

- `python -m pytest --collect-only testing/backend/test_security_openapi_auth_rbac.py` — PASS de colección: 8 tests collected.
- Evidencia documentada en bitácora: `python -m pytest testing/backend/test_security_openapi_auth_rbac.py -v --tb=short` — 8 passed.
- No ejecuté suites completas ni Docker por restricción del subagente.

## 6. Documentacion actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` — No aplica; no hay cambios de modelo/esquema.
- [ ] `docs/decisions/ADR-NNN-<titulo>.md` — Recomendado para aprobar allowlist pública y postura de middleware global.
- [x] `docs/bitacora/2026-06-22-mitigacion-ciberseguridad-portal.md` — Actualizada con validación.
- [ ] `errors_memory.json` — No aplica desde este revisor.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Implementar dependencias RBAC backend por módulo/acción para rutas sensibles. | Backend/Security | Próxima iteración P1 |
| Agregar tests 403 por rol/módulo y object-level access para rutas ERP, inventario, viáticos, SOLID y admin. | Backend/Security | Próxima iteración P1 |
| Agregar tests de revocación JWT web: logout, reset password, usuario desactivado y refresh rotatorio. | Backend | Próxima iteración P1 |
| Formalizar allowlist pública en ADR/bitácora con snapshot de rutas públicas aprobado. | Arquitectura/Security | Próxima iteración P1 |
| Centralizar configuración CORS usada por middleware 401 y `CORSMiddleware`. | Backend | Próxima iteración P2 |

---

Backend review: approved_with_risks

Findings: sin bloqueantes; riesgos altos remanentes en RBAC backend y revocación/estado de sesiones web para rutas protegidas solo por el gate global. Riesgos medios en OpenAPI sintético, gobierno de allowlist y drift CORS/orden de middleware.

Required tests: además de la suite nueva (8 passed según bitácora; 8 collected verificado), faltan pruebas 403 por módulo/rol/objeto, revocación JWT web, usuario desactivado, allowlist snapshot y telemetría/rate limit para 401 del middleware.

Required docs/RBAC follow-up: documentar allowlist pública en ADR/bitácora, aplicar dependencias `requerir_modulo(...)`/roles en routers sensibles, sin actualización de `docs/ESQUEMA_BASE_DATOS.md` porque no hubo cambios estructurales.

Blocking reasons: ninguno en el alcance corregido.
