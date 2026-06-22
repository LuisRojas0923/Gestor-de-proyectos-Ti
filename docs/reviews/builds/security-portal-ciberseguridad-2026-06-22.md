# Security/RBAC review: blocked

**Fecha:** 2026-06-22  
**Alcance:** estado actual de ciberseguridad del portal: autenticacion, JWT/sesiones, RBAC, secretos, CORS, rate limiting, headers, cargas de archivos, exposicion de datos, Docker/nginx/env y OWASP.  
**Modo:** inspeccion read-only de codigo/configuracion; no se ejecutaron servicios ni pruebas dinamicas.  
**Nivel de resistencia estimado:** **Bajo a medio**. Hay fortalezas puntuales en bcrypt y rate limiting de algunos endpoints de auth, pero el estado global queda bloqueado por rutas API v2 sin autenticacion/autorizacion, revocacion de sesiones web no efectiva, exposicion de datos por identificadores y configuracion de infraestructura permisiva.

## Checklist results

- Auth en endpoints: ❌
- Schemas sin dict: ❌
- PK con Field(pattern): ❌
- PUT/PATCH exclude_unset: ❌
- No str(e) en 500: ❌
- Secrets guard: ❌
- No print(): ❌
- PII redacted: ❌

## Resumen ejecutivo

La superficie expuesta del portal no cumple una postura de **deny-by-default**. Existen multiples endpoints bajo `/api/v2` que consultan, modifican, cargan o exportan informacion sensible sin `Depends(obtener_usuario_actual_db)` ni chequeo RBAC de modulo. Esto incluye viaticos, inventario, nomina, lineas corporativas, panel de control, ERP/proxy externo, notificaciones y endpoints administrativos puntuales. En un despliegue accesible desde red corporativa o Internet, un actor no autenticado podria leer estados de cuenta por cedula, cargar archivos, disparar procesos de mantenimiento, consultar datos de empleados/ERP, crear analistas desde ERP o interactuar con WebSockets de notificaciones.

El esquema JWT tiene vencimiento, firma HS256 y bcrypt para contrasenas, pero las sesiones web registradas en base de datos no se validan en cada request: la validacion de revocacion solo aplica a tokens MCP. Por tanto, logout, reset de clave o invalidacion de sesiones no cortan de forma inmediata tokens web ya emitidos; siguen funcionando hasta expirar. En frontend, el JWT se guarda en `localStorage`, lo que eleva el impacto de cualquier XSS o dependencia comprometida.

La configuracion de secretos e infraestructura tambien requiere endurecimiento: `app.config` mantiene defaults publicos para DB/JWT sin guard de produccion efectivo, `docker-compose.prod.yml` define passwords default y Redis sin autenticacion, nginx sirve por HTTP sin headers de seguridad, PostgreSQL queda publicado en host y `pg_hba.conf` permite `0.0.0.0/0` con md5. CORS acepta cualquier origen de redes privadas mediante regex y credenciales.

## Hallazgos priorizados

### 1) BLOQUEANTE — Rutas API v2 sin autenticacion ni RBAC backend

**Referencias:**
- `backend_v2/app/api/viaticos/router.py:55-210`: categorias, OTs, envio/eliminacion de reportes, estado de cuenta y export XLSX por `cedula` sin auth.
- `backend_v2/app/api/inventario/router.py:50-228`, `298-305`, `347-470`: configuracion/admin, asignaciones, cargas Excel, plantillas y health sin auth; solo algunas rutas de operario tienen auth.
- `backend_v2/app/api/novedades_nomina/nomina_router.py:46-65`, `120-124`, `183-198`, `221-336`: catalogo, carga, procesamiento, preview, descarga, historial y exportacion sin auth.
- `backend_v2/app/api/auth/admin_router.py:27-32`: `POST /auth/analistas/crear` crea analista validando ERP sin usuario actual.
- `backend_v2/app/api/erp/router.py:19-27`, `30-59`, `62-101`: consulta empleado, sincronizacion y proxy externo sin auth.
- `backend_v2/app/api/notificaciones/router.py:18-49`: crear/listar/marcar notificaciones y WebSocket por `usuario_id` sin token.
- `backend_v2/app/api/panel_control/router.py:20-36`, `35-172`: mantenimiento y metricas sin auth.
- `backend_v2/app/api/ia/router.py:13-49`, `alertas/router.py:13-43`, `log_actividades/router.py:10-63`, `solid/router.py:15-86` tambien carecen de auth.

**Riesgo OWASP/CWE:** OWASP A01 Broken Access Control; CWE-306, CWE-862, CWE-639.  
**Impacto:** acceso no autorizado a PII, datos laborales/financieros, modificacion operacional, cargas masivas y acciones administrativas.  
**Recomendacion:** implementar autenticacion global para `/api/v2` con allowlist explicita solo para `GET /health`, `POST /auth/login`, `POST /auth/setup-password`, `GET /auth/password-status/{cedula}` y flujos publicos justificados. En cada router sensible, usar dependencia de modulo/rol del lado backend, no solo `ProtectedRoute` en React. Agregar test automatico que enumere OpenAPI y falle si una ruta no allowlist carece de auth/RBAC.

### 2) BLOQUEANTE — Revocacion de sesiones web no efectiva y JWT en localStorage

**Referencias:**
- `backend_v2/app/api/auth/profile_router.py:47-66`: valida revocacion solo para `token_type == "mcp"`; tokens web no consultan `sesiones`.
- `backend_v2/app/services/auth/sesion_service.py:69-109`: logout/reset marcan `fin_sesion`, pero la dependencia web no lo verifica.
- `backend_v2/app/api/auth/refresh_router.py:47-61`: reemite JWT si el token firma y no expiro, sin validar sesion activa ni usuario activo.
- `frontend/src/pages/Login.tsx:67` y `frontend/src/services/AuthService.ts:6-8`, `93-95`: JWT persistido en `localStorage`.

**Riesgo OWASP/CWE:** OWASP A07 Identification and Authentication Failures; CWE-613, CWE-922.  
**Impacto:** tokens robados o tokens de usuarios desactivados siguen validos hasta expirar/refresh; logout no revoca acceso servidor-side.  
**Recomendacion:** estampar `jti` en sesiones web y validar en `obtener_usuario_actual_db` que la sesion exista, no tenga `fin_sesion`, no haya expirado y el usuario este activo. `refresh` debe validar la sesion original y rotar `jti`. Migrar a cookies `HttpOnly; Secure; SameSite=Lax/Strict` o usar access token muy corto + refresh rotatorio y deteccion de reutilizacion.

### 3) ALTO — Enumeracion de cuentas y oraculos de estado

**Referencias:**
- `backend_v2/app/api/auth/public_auth_router.py:98-116`: `password-status/{cedula}` retorna `existe` true/false.
- `backend_v2/app/api/auth/login_router.py:171-176`: distingue password no configurada y envia header `X-Password-Not-Set`.
- `backend_v2/app/api/auth/public_auth_router.py:132-157`: `forgot-password` responde distinto si existe usuario sin correo validado.
- `backend_v2/app/api/auth/login_router.py:145-154`, `197-201`: diferencia cuenta pendiente/desactivada.

**Riesgo OWASP/CWE:** CWE-203 Observable Discrepancy.  
**Impacto:** facilita enumerar cedulas validas, cuentas pendientes y estado de contrasena.  
**Recomendacion:** respuestas uniformes para flujos publicos, eliminar headers de estado interno, latencia uniforme en auth y considerar CAPTCHA/step-up tras umbrales.

### 4) ALTO — Secretos/defaults y configuracion de produccion debiles

**Referencias:**
- `backend_v2/app/config.py:18-23`, `43-52`: defaults publicos `db_pass="password"`, `erp_database_url`, `jwt_secret_key="clave-segura-cambiar"`, `portal_pending_pwd="PORTAL_PENDING_PWD"`.
- `backend_v2/app/core/config.py:31-41`: existe configuracion nueva, pero el runtime de JWT/DB usa `app.config` en `database.py:8-16` y `servicio.py:12`, `181-183`.
- `docker-compose.prod.yml:16-33`: Redis de produccion sin password; `REDIS_URL=redis://redis:6379/0`.
- `docker-compose.prod.yml:67-73`: password default de PostgreSQL y puerto publicado `5433:5432`.
- `.gitignore:31-37`: `.env` esta ignorado; se observaron archivos `.env` locales en el workspace, no se leyeron.

**Riesgo OWASP/CWE:** CWE-798, CWE-522.  
**Impacto:** despliegues con defaults permiten firma JWT predecible o acceso a DB/Redis si variables faltan.  
**Recomendacion:** unificar en `app.core.config`, fallar startup en `produccion` si JWT/DB/Redis/SMTP usan defaults, si secretos son cortos o si falta `REDIS_PASSWORD`; rotar secretos actuales; usar Docker secrets/secret manager; no publicar servicios internos.

### 5) ALTO — CORS permisivo para redes privadas con credenciales

**Referencia:** `backend_v2/app/main.py:112-125` acepta localhost y cualquier `192.168.*`, `172.16-31.*`, `10.*`, con `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.  
**Riesgo OWASP/CWE:** CWE-942.  
**Impacto:** cualquier host web dentro de red privada queda autorizado como origen; amplifica XSS/phishing interno y abuso de APIs si hay tokens disponibles.  
**Recomendacion:** allowlist exacta por ambiente desde env, sin regex amplia; en produccion permitir solo dominios oficiales HTTPS; evaluar `allow_credentials=False` si no se usan cookies.

### 6) ALTO — Cargas de archivos sin controles suficientes

**Referencias:**
- `backend_v2/app/api/inventario/router.py:347-407`: valida extension `.xlsx/.xls`, lee todo en memoria, sin auth en endpoints de carga.
- `backend_v2/app/api/novedades_nomina/nomina_router.py:58-79`: sube cualquier extension derivada de filename y escribe en disco.
- `backend_v2/app/api/lineas_corporativas/router.py:260-273` y `router_migracion.py:19-28`: importaciones Excel sin auth ni limite local.
- `nginx/nginx.conf:8`: `client_max_body_size 100M`.

**Riesgo OWASP/CWE:** CWE-434, CWE-400.  
**Impacto:** DoS por memoria/CPU, ingest de archivos maliciosos, formula injection en Excel, procesamiento de contenido no confiable.  
**Recomendacion:** auth+RBAC obligatorio; limites por ruta; verificacion MIME y magic bytes; streaming/quarantine; antivirus; desactivar macros; sanitizar formulas/celdas; procesar en jobs con cuotas.

### 7) MEDIO/ALTO — Divulgacion de errores y PII en logs/respuestas

**Referencias:**
- `backend_v2/app/api/viaticos/router.py:61-63`, `74-76`, `109-111`, `140-166`: `print` y `detail=f"...{str(e)}"`.
- `backend_v2/app/api/erp/router.py:49-52`, `80-100`: imprime cedula/URL externa y retorna texto/URL del servicio.
- `backend_v2/app/api/auth/profile_router.py:122-136`, `259-299`, `333-343`, `374-375`: `print` y `str(e)` en 500.
- `backend_v2/app/api/tickets/router.py:88-91`, `239-242`: `traceback.print_exc()` y detalle interno.

**Riesgo OWASP/CWE:** CWE-209, CWE-532.  
**Impacto:** exposicion de cedulas, rutas internas, SQL/ERP, stack traces o detalles de integraciones.  
**Recomendacion:** logging estructurado con redaccion, reemplazar `print`, nunca retornar `str(e)` en 5xx, usar codigos de error genericos y correlacion.

### 8) MEDIO/ALTO — RBAC inconsistente y mass assignment

**Referencias:**
- `frontend/src/components/auth/ProtectedRoute.tsx:26-66`: RBAC UI, pero muchas rutas backend no replican modulo.
- `backend_v2/app/core/rbac_manifest.py:11-283`: manifiesto existe, pero no hay dependencia central `requerir_modulo` aplicada en routers.
- `backend_v2/app/api/auth/admin_router.py:102-166`: `datos: dict` y asignacion manual de rol/estado; `POST /permisos` recibe `List[dict]` en `214-240`.
- `backend_v2/app/models/auth/usuario.py:21-23`, `201-215`, `266-287`, `340-370`: IDs/cedulas/correos sin `Field(pattern=...)`/`EmailStr` robustos.

**Riesgo OWASP/CWE:** CWE-915, CWE-639.  
**Impacto:** bypass de autorizacion llamando API directo; posibilidad de parametros inesperados; IDs sin patron defensivo.  
**Recomendacion:** crear dependencias `requerir_modulo("...")`/`requerir_permiso`, usar schemas Pydantic concretos, `model_dump(exclude_unset=True)` y patrones para PK/cedula/rol/email.

### 9) MEDIO — Headers, TLS e infraestructura

**Referencias:**
- `nginx/nginx.conf:15-63` y `frontend/nginx.conf:1-48`: sin TLS/HSTS/CSP/X-Frame-Options/X-Content-Type-Options/Referrer-Policy/Permissions-Policy.
- `backend_v2/app/main.py:105-110`: `/docs` habilitado sin condicion de ambiente.
- `postgres/pg_hba.conf:7-20`: trust local y `host all all 0.0.0.0/0 md5`.
- `docker-compose.yml:72-97`: Adminer y DB expuestos en host para desarrollo; `docker-compose.prod.yml:72-73` publica DB en produccion.
- `backend_v2/Dockerfile:26-48`: contenedor corre como root por defecto.

**Riesgo OWASP/CWE:** OWASP A05 Security Misconfiguration; CWE-16, CWE-319.  
**Recomendacion:** TLS obligatorio, headers de seguridad en nginx, ocultar `/docs` en produccion, no exponer DB/Adminer/backend directo, restringir `pg_hba`, usuario no-root, healthchecks y redes internas.

## RBAC/config impact

El manifiesto RBAC existe y cubre modulos criticos (`nomina_horas_extras`, `inventario_anual`, `admin_roles`, etc.), pero la proteccion real no es uniforme. El frontend oculta rutas por permisos, pero la API permite acceso directo a numerosos endpoints. El impacto de configuracion es alto: los defaults de `app.config` y compose pueden producir despliegues inseguros si variables faltan.

## Recomendaciones de remediacion por prioridad

1. **Semana 1:** bloquear publicamente todas las rutas no allowlist con auth global; corregir viaticos, inventario, nomina, ERP, notificaciones, panel-control y `analistas/crear`; agregar test de cobertura auth por OpenAPI.
2. **Semana 1-2:** validar sesiones web por `jti`/DB, hacer refresh rotatorio y revocable, chequear `esta_activo` en cada request; mover token fuera de `localStorage` o reducir drásticamente vida de access token.
3. **Semana 2:** unificar settings, fallar startup con secrets default, rotar JWT/DB/Redis, cerrar DB/Adminer, proteger Redis.
4. **Semana 2-3:** endurecer CORS y nginx headers/TLS; deshabilitar docs en produccion.
5. **Semana 3:** rediseñar uploads con autenticacion, cuotas, validacion de contenido, AV/quarantine y procesamiento asincrono.
6. **Continuo:** limpiar `print/str(e)`, redaccion PII, schemas concretos, patrones para PK y autorizacion por objeto/cedula.

## Blocking reasons

- Hay rutas de lectura/escritura/carga bajo `/api/v2` sin autenticacion.
- RBAC no se aplica consistentemente del lado servidor.
- La revocacion de sesiones web no tiene efecto inmediato sobre JWT ya emitidos.
- Secrets/defaults e infraestructura de produccion admiten configuraciones inseguras.

**Severity:** BLOQUEANTE
