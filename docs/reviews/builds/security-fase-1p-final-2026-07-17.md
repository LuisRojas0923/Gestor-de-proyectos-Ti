# Security/RBAC review — Fase 1P final

**Fecha:** 2026-07-17
**Modo:** rerevisión final read-only, acotada al delta del working tree
**Veredicto técnico:** `BLOQUEADO`

Security/RBAC review: blocked

## Checklist results

- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): ✅
- PUT/PATCH exclude_unset: ✅
- No str(e) en 500: ✅
- Secrets guard: ✅
- No print(): ✅
- PII redacted: ✅

## Hallazgos del delta

### BLOQUEANTE — El migrador productivo carga el guard JWT sin recibir el secreto JWT

`backend_v2/app/core/migrations/manager.py:42-43` importa siempre
`bootstrap_admin.py`; ese módulo importa `ServicioAuth`, que carga la instancia
global de `app.config`. Con `ENVIRONMENT=production`, el guard de
`backend_v2/app/config.py:55-65` rechaza el JWT template. El servicio `migrate`
de `docker-compose.prod.yml:29-39` no recibe `JWT_SECRET_KEY`, correctamente para
no ampliar ese secreto runtime al migrador, por lo que el import falla antes de
comprobar si ya existe un admin.

El flujo contractual `migrate -> backend` no puede arrancar en producción. No
debe corregirse copiando JWT al job: el hash de bootstrap debe desacoplarse de
`ServicioAuth`/config runtime. Se requiere una prueba con el entorno exacto de
Compose producción, sin JWT, tanto con admin preexistente como con bootstrap de
un solo uso.

### ALTO — Un módulo desactivado legítimamente impide el siguiente arranque

`backend_v2/app/services/auth/rbac_discovery.py:20-45` considera faltante todo
módulo del manifiesto cuyo `esta_activo` sea `FALSE`. Sin embargo,
`backend_v2/app/api/auth/config_router.py:161-204` conserva la operación
administrativa que desactiva módulos no críticos. Por tanto, un estado creado
válidamente por la propia API hace fallar `startup_event`; la recuperación exige
ejecutar `migrate`, que además vuelve a activar el módulo en
`rbac_discovery.py:56-69`.

Esto es una regresión del delta verify-only: antes el arranque reactivaba el
módulo; ahora queda indisponible. También contradice la separación operativa de
Fase 1P, porque una configuración runtime válida fuerza el uso del job migrador.
La verificación debe distinguir presencia/integridad del catálogo de su flag de
activación, y una prueba debe cubrir desactivar módulo no crítico → reiniciar →
startup exitoso sin DML ni reactivación.

### ALTO — `admin_sistemas` satisface el gate de bootstrap pero no puede administrar el RBAC protegido

`backend_v2/app/core/migrations/bootstrap_admin.py:12-20` y
`backend_v2/app/core/migrations/manager.py:89-100` aceptan que exista únicamente
un usuario activo `admin_sistemas` y omiten el bootstrap. En cambio, todas las
funciones administrativas `SECURITY DEFINER` validan exclusivamente
`rol = 'admin'` (`rbac_admin_procedures.py:25-76,117-149`) y los endpoints de
usuarios/roles también reservan las mutaciones a `admin`.

Una instalación o recuperación con solo `admin_sistemas` supera `migrate` y
startup, pero queda sin actor capaz de crear/corregir roles, permisos, módulos o
identidades protegidas. El gate debe exigir al menos un `admin` activo o alinear
de forma explícita y probada la política de actor de todas las funciones.

### MEDIO — El desbloqueo administrativo no elimina el lockout hasheado

El delta cambió `lockout:*` y `login_fallos:*` a SHA-256 en
`backend_v2/app/core/rate_limiter.py:238-284`, pero
`backend_v2/app/api/auth/admin_router.py:375-397` continúa buscando claves Redis
con la cédula en claro. El endpoint puede responder `desbloqueado: true` aunque
el lockout por cuenta siga vigente. Debe derivar exactamente el mismo
identificador y formato de clave, sin reintroducir PII, y tener una prueba Redis
que demuestre la eliminación efectiva.

## Correcciones verificadas en el delta

- Startup runtime quedó en SELECT/verificación; migración, seeds y RBAC se
  trasladaron al job con advisory lock y credencial separada.
- La toma de analista usa hash aleatorio, alta inicial de bajo privilegio,
  promoción protegida e `IntegrityError` con rollback.
- Recuperación consume el hash vigente con CAS; refresh rota una sola sesión.
- JWT público queda rechazado en producción; `admin123` y sus utilidades fueron
  retirados; bootstrap usa secreto de un solo uso.
- Panel exige sesión; operaciones de torre/mantenimiento sensibles exigen rol
  administrativo y heartbeat ya no recibe JWT por query.
- Sesiones almacenan SHA-256 del JWT; registro, revocación y logout propagan
  fallos. `/auth/yo` no serializa `hash_contrasena`.
- MCP usa schema estricto, persiste scope, coteja claim/sesión, bloquea métodos
  REST mutantes y hace atómica la auditoría con emisión/revocación.
- El trigger de identidad bloquea DELETE y mutaciones sensibles directas del rol
  runtime. Las mutaciones RBAC pasan por funciones verificadas `SECURITY DEFINER`.
- No se añadieron módulos; `backend_v2/app/core/rbac_manifest.py` no requiere una
  entrada nueva para este delta.

## Evidencia considerada

Se revisó el working tree y la evidencia registrada: aceptación PostgreSQL
aislada real **1 passed**, suites críticas **44 passed** y rerun final del
endpoint **6 passed**. Esta rerevisión read-only no reejecutó pruebas. La
cobertura actual no reproduce el entorno mínimo productivo del migrador ni
detecta los otros tres casos anteriores.

## Deuda Fuera de Alcance

No bloquea Fase 1P porque no fue introducida ni agravada por el delta revisado:

- PostgreSQL continúa publicado y el hardening integral de HBA/privilegios por
  tabla queda para la fase DevOps coordinada.
- Redis de producción no exige password; además, buckets SlowAPI históricos
  conservan identidad de cédula sin HMAC. El lockout nuevo sí usa hash, con la
  inconsistencia operativa indicada arriba.
- `password-status` y las respuestas históricas de login pendiente mantienen
  oráculos de existencia/estado y `X-Password-Not-Set`; faltan gating/captcha y
  latencia equivalente.
- El alta JIT pública basada en ERP y contraseña pendiente continúa siendo una
  decisión funcional legítima de la fase previa; requiere hardening posterior,
  no su eliminación dentro de Fase 1P.
- El runtime conserva CRUD general sobre tablas no RBAC y existen rutas legacy
  con `str(e)`, logs/validaciones débiles y adaptadores ERP síncronos; forman
  parte de la deuda preexistente ya documentada.

## RBAC/config impact

La separación owner/migrador/runtime, la capacidad en archivo, los grants
acotados sobre RBAC y el manifiesto SSOT son coherentes en el camino nominal.
Persisten tres inconsistencias contractuales del delta: dependencia del
migrador respecto de config JWT runtime, estado inactivo tratado como esquema
incompleto y definición divergente del actor administrativo mínimo.

## Blocking reasons

1. El job `migrate` no puede iniciar con el entorno productivo declarado y no se
   debe ampliar el secreto JWT para hacerlo funcionar.
2. Una desactivación válida de módulo puede provocar denegación de arranque y
   obliga a una migración mutante para recuperar el servicio.
3. El gate permite terminar sin ningún actor autorizado para usar las funciones
   administrativas protegidas.

Findings: 1 BLOQUEANTE, 2 ALTO, 1 MEDIO; deuda preexistente separada y no usada para bloquear.
Severity: BLOQUEANTE
