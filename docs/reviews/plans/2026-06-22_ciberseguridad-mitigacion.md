# Plan persistido - Mitigacion de ciberseguridad del portal

**Fecha:** 2026-06-22  
**Plan:** Mitigacion de riesgos de ciberseguridad del portal  
**Autor del plan:** OpenCode  
**Modo:** plan  
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

Fortalecer la postura de ciberseguridad del portal hasta dejarlo apto para exposicion controlada, mitigando los riesgos identificados en el informe ejecutivo y reporte tecnico de seguridad. El plan prioriza autenticacion obligatoria, RBAC real en backend, sesiones revocables, manejo seguro de tokens, hardening de archivos, configuracion segura de infraestructura, logging sin fuga de informacion y pruebas automatizadas que impidan regresiones.

El resultado esperado es pasar de una resistencia **baja-media** a una resistencia **media-alta**, con evidencia automatizada y documental para cada control critico.

## 2. No-objetivos

- No redisenar la arquitectura completa del portal.
- No cambiar la base de datos sin migracion, pruebas y actualizacion documental.
- No migrar todos los modulos funcionales en un solo build.
- No resolver seguridad unicamente desde frontend; backend sera la autoridad de autenticacion y permisos.
- No exponer el portal a Internet antes de cerrar P0 y P1.
- No modificar `modulo_actividades_fork/`, salvo que aparezca un requerimiento movil explicito.

## 3. Archivos / modulos afectados

- `backend_v2/app/main.py` - politica global de seguridad, CORS, middleware y rate limiting.
- `backend_v2/app/api/auth/*` - login, refresh, logout, perfil, setup, reset, verificacion y sesiones.
- `backend_v2/app/api/**/router.py` - aplicacion de auth/RBAC por router y accion.
- `backend_v2/app/services/auth/*` - ciclo de vida de JWT, `jti`, sesiones, revocacion y RBAC.
- `backend_v2/app/core/rbac_manifest.py` - manifiesto SSOT de modulos protegidos.
- `backend_v2/app/core/rate_limiter.py` - ampliacion de limites a rutas sensibles y costosas.
- `backend_v2/app/services/**` - manejo de errores, uploads, auditoria y validaciones de objeto.
- `frontend/src/pages/Login*`, `frontend/src/context/AppContext.tsx`, `frontend/src/services/AuthService.ts`, `frontend/src/hooks/useApi.ts` - manejo de sesion y token.
- `frontend/src/components/auth/ProtectedRoute.tsx` - proteccion visual secundaria basada en permisos frescos.
- `frontend/src/**` - eliminar tokens en URL, centralizar cliente HTTP y endurecer descargas/archivos.
- `nginx/*.conf`, `frontend/nginx.conf` - headers de seguridad, CSP, HSTS y politicas HTTP.
- `docker-compose*.yml`, `.env.example`, `backend_v2/app/config.py`, `backend_v2/app/core/config.py` - secretos, Redis, DB expuesta y validacion de entorno.
- `testing/backend/` - nuevas suites de seguridad.
- `frontend/src/tests/` - pruebas de sesion, rutas y cliente HTTP.
- `.github/workflows/` - CI minimo si se adopta pipeline.
- `docs/ESQUEMA_BASE_DATOS.md`, `testing/CATALOGO_PRUEBAS.md`, `docs/bitacora/`, `docs/decisions/` - documentacion y trazabilidad.

## 4. Fases de implementacion

### P0 - Preparacion y barreras de regresion

1. Congelar inventario OpenAPI de rutas `/api/v2` y clasificarlas como publica, autenticada, RBAC modulo, RBAC accion u object-level.
2. Definir allowlist publica aprobada. Minimo esperado: healthcheck, login, setup password, forgot/reset password y verificacion si aplica.
3. Crear matriz RBAC con modulo, accion, roles permitidos y reglas por objeto/propietario cuando aplique.
4. Crear pruebas fallidas primero para cobertura OpenAPI auth/RBAC, revocacion JWT web, uploads, rate limit ampliado, errores/logging y configuracion productiva.
5. Registrar nuevas suites en `testing/CATALOGO_PRUEBAS.md`.

### P1 - Controles criticos backend

1. Implementar politica deny-by-default para `/api/v2`, preservando solo la allowlist publica.
2. Implementar dependencias backend tipo `requiere_permiso(modulo_id, accion)` y validacion de modulo activo.
3. Alinear ciclo de vida JWT: login genera `jti`, registra sesion, refresh valida sesion, logout/revocacion invalidan token web y MCP mantiene su cobertura.
4. Validar usuario activo, `jti`, `fin_sesion` y expiracion de sesion en cada request protegido.
5. Eliminar `detail=str(e)`, `print` y fugas de PII/secrets en respuestas; mantener logging interno con redaccion.
6. Ampliar rate limiting a setup, forgot/reset, uploads, descargas, reportes, ERP/proxy y endpoints costosos.

### P2 - Controles frontend y experiencia de sesion

1. Eliminar envio de JWT por query string, especialmente heartbeat y flujos equivalentes.
2. Reducir persistencia sensible en `localStorage`; preparar migracion a cookie `HttpOnly; Secure; SameSite` si backend adopta cookie session.
3. Centralizar llamadas API en un cliente unico con Authorization/credenciales, manejo 401/403, refresh/logout y redaccion de logs.
4. Hacer que rutas protegidas esperen permisos frescos desde backend; `ProtectedRoute` queda como defensa visual secundaria.
5. Limpiar token de URLs de recuperacion/verificacion con intercambio one-time, TTL corto y `replace` inmediato de historial.
6. Prevalidar archivos en UI por tamano, extension, MIME declarado y cantidad; backend conserva la validacion autoritativa.

### P3 - Hardening de archivos e infraestructura

1. Centralizar validacion backend de archivos: tamano maximo por ruta, MIME real por magic bytes, extension permitida, nombre saneado, path seguro, lectura acotada y rechazo de vacios.
2. Definir cuarentena/antivirus y politica para macros, formulas Excel, contenido activo y retencion.
3. Restringir CORS a dominios HTTPS exactos por ambiente y eliminar comodines con credenciales.
4. Configurar headers Nginx: CSP, HSTS si hay HTTPS real, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y `frame-ancestors`.
5. Fallar arranque productivo si hay secretos por defecto, Redis sin password, JWT debil, DB publicada o configuracion insegura.
6. Evitar publicacion innecesaria de PostgreSQL/Adminer/backend en produccion.

### P4 - CI, documentacion y cierre

1. Crear CI minimo con backend pytest, frontend lint/test/build, security hooks y cobertura de auditoria/RBAC.
2. Ejecutar suites de regresion existentes y nuevas suites de seguridad.
3. Actualizar `docs/ESQUEMA_BASE_DATOS.md` si cambian tablas, columnas, indices o modelos.
4. Crear bitacora de mitigacion y ADR para decisiones durables: deny-by-default, JWT revocable/cookies, uploads y CI obligatorio.
5. Solicitar build review final con `security-rbac-reviewer`, `backend-reviewer`, `frontend-reviewer` y `docs-tests-reviewer`.

## 5. Criterios de aceptacion

- Toda ruta sensible de `/api/v2` retorna 401 sin token y 403 sin permiso suficiente.
- La allowlist publica esta documentada y testeada.
- El backend valida permisos por modulo/accion y no depende del frontend para autorizar.
- Logout, reset, desactivacion y cambio de permisos invalidan tokens web activos.
- Ningun JWT se envia en query string.
- El frontend no persiste datos sensibles innecesarios en `localStorage`.
- Uploads rechazan extension falsa, MIME invalido, archivo vacio, tamano excedido y path traversal.
- Endpoints pesados tienen rate limit por usuario/IP/ruta.
- Respuestas 5xx no exponen trazas, `str(e)`, tokens, cedulas, passwords o secretos.
- Produccion no arranca con secretos por defecto o configuracion insegura.
- CI ejecuta las suites criticas antes de merge/deploy.

## 6. Comandos de validacion

- `git status --short`
- `$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH; python -m pytest --collect-only testing/backend`
- `$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH; python -m pytest testing/backend/test_security_openapi_auth_rbac.py testing/backend/test_security_jwt_revocation.py testing/backend/test_security_uploads.py testing/backend/test_security_rate_limit_integration.py testing/backend/test_security_errors_logging.py -v`
- `$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH; python -m pytest testing/backend/test_auth_rate_limit.py testing/backend/test_auth_refresh.py testing/backend/test_auth_escalation.py testing/backend/test_mcp_revocation.py testing/backend/test_audit_coverage_manifest.py testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v`
- `python scripts/audit_coverage_check.py`
- `python scripts/security_check_backend.py`
- `cd frontend; npm run lint; npm run test; npm run build`
- `python scripts/sync_docs.py` solo si cambian modelos, schema o RBAC documentado.

## 7. Impacto en documentacion

- [x] `docs/reviews/builds/informe-ejecutivo-ciberseguridad-portal-2026-06-22.md` como fuente ejecutiva.
- [x] `docs/reviews/builds/security-portal-ciberseguridad-2026-06-22.md` como fuente tecnica persistida.
- [x] `testing/CATALOGO_PRUEBAS.md` al crear nuevas suites.
- [ ] `docs/ESQUEMA_BASE_DATOS.md` si cambian `sesiones`, auditoria, RBAC, uploads o indices.
- [ ] `docs/decisions/ADR-<NNN>-seguridad-deny-by-default-jwt-uploads-ci.md` para decisiones durables.
- [ ] `docs/bitacora/2026-06-22-mitigacion-ciberseguridad-portal.md` al iniciar implementacion.
- [ ] README o guia operativa si cambia despliegue, variables obligatorias o headers productivos.

## 8. Evaluacion de riesgos

| Riesgo | Probabilidad | Mitigacion |
|---|---|---|
| Romper endpoints publicos necesarios | Alta | Inventario OpenAPI, allowlist aprobada y pruebas 200/401 por ruta. |
| Falsos positivos en test OpenAPI | Media | Detectar dependencias/middleware global y mantener metadata explicita por ruta. |
| RBAC incompleto por accion u objeto | Alta | Matriz modulo/accion/objeto, pruebas 403 y revisiones por modulo. |
| Revocacion JWT aumenta carga de DB/Redis | Media | Cache corto, indices por `jti`, medicion y fallback seguro. |
| Migracion a cookies rompe CORS/CSRF | Media | Staging HTTPS, SameSite, CSRF si aplica y pruebas E2E. |
| CSP rompe assets o integraciones | Media | Aplicar CSP en modo report-only primero y ajustar allowlist. |
| Uploads afectan rendimiento | Media | Limites por ruta, streaming, procesamiento async y cuotas. |
| Scope creep por alcance transversal | Alta | Ejecutar P0-P4 en builds separados con gate por fase. |
| Mezcla con cambios frontend ajenos | Media | Aislar rama/diff y no tocar HORAS_EXTRAS salvo conflicto directo. |
| CI no existe o queda incompleto | Alta | Crear workflow minimo antes de cerrar P4. |

## 9. Matriz de subagentes

```text
Subagente | Motivo | Resultado | Bloquea
----------|--------|-----------|---------
scope-reviewer | Alcance transversal backend/frontend/config/tests/docs | approved_with_risks | no para plan; si si no hay fases/criterios
security-rbac-reviewer | Auth, RBAC, sesiones, secrets, CORS, uploads y OWASP | approved_with_risks | si para release externo sin P0/P1
backend-reviewer | FastAPI, JWT, RBAC server-side, uploads, rate limits y pytest | approved_with_risks | si se aplica auth global sin allowlist o jti sin sesion persistida
frontend-reviewer | Tokens, localStorage, rutas, cliente HTTP y UX de sesion | approved_with_risks | no para plan; si se promete mitigacion completa sin backend
docs-tests-reviewer | Pruebas, CI, catalogo, ADR, bitacora y evidencia | blocked | si para implementacion hasta crear tests/CI/trazabilidad
mobile-reviewer | No aplica porque no se modifica modulo movil | not_required | no
```

## 10. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos` para hoja de ruta y plan persistido.
- [ ] `bloqueado`

La implementacion queda **bloqueada para cierre/release externo** hasta cumplir P0 y P1, crear pruebas automatizadas nuevas y activar evidencia en CI. El plan debe ejecutarse por fases; no debe tratarse como un unico cambio masivo.

## 11. Notas adicionales

Antes de implementar, ejecutar descubrimiento adicional si se requiere mayor precision de dependencias entre routers, servicios y frontend. El repositorio tiene cambios locales no relacionados en HORAS_EXTRAS; no deben mezclarse con esta mitigacion. Todo cambio backend debe seguir TDD: crear prueba primero, verla fallar, implementar, y luego validar que pase.
