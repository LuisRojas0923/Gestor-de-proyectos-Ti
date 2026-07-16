# Contrato de Seguridad Operativa - Planilla Regional

**Fecha:** 2026-07-16
**Estado:** Aprobado contractualmente
**Especificación principal:** `docs/specs/2026-07-15_planilla-regional-automatica.md`

## 1. Configuración de la Funcionalidad

Planilla Regional usa un único `PlanillaRegionalSettings` en `backend_v2/app/services/novedades_nomina/planilla_regional_settings.py`. Este objeto se crea una vez mediante `lru_cache`, recibe variables de entorno directamente y no importa ni instancia los dos `BaseSettings` globales existentes.

Contiene únicamente:

- entorno canónico `development|pruebas3|production|test` desde `ENVIRONMENT`; cualquier otro valor falla startup;
- `ERP_PLANILLA_DATABASE_URL` como `SecretStr`, sin fallback;
- paths de cuarentena/limpio/temporal;
- endpoint/timeout del antimalware;
- Redis y cuotas de esta funcionalidad;
- `PLANILLA_AUDIT_HMAC_KID` y path read-only del keyring;
- `PLANILLA_CURSOR_HMAC_KID`, keyring dedicado y TTL 15 minutos;
- límites ZIP/XLSX y concurrencia del worker.
- `ERP_PLANILLA_CA_PATH`, scanner URL/CA/cert/key, `PLANILLA_REDIS_URL` y paths TLS ingress cuando aplique.

`ENVIRONMENT` es obligatorio y no tiene default. Compose desarrollo, Pruebas3, producción y tests lo fijan explícitamente. Un preflight valida toda configuración antes de habilitar rutas/jobs; producción falla cerrado si falta ERP, TLS, Redis, keyring, storage o antimalware. Ningún secreto aparece en repr, errores o logs.

Keyring de cursor es distinto de JWT y auditoría; usa HMAC-SHA256, comparación constante y la misma política de rotación/retención mínima de 15 minutos tras retirar un kid.

## 2. Roles de Base de Datos

- `gestor_schema_owner NOLOGIN`: propietario de objetos, no usado por aplicación.
- `gestor_migrador LOGIN`: rol de despliegue que puede `SET ROLE gestor_schema_owner`; no se entrega al contenedor runtime.
- `gestor_runtime LOGIN`: CRUD mínimo de dominio y `USAGE/SELECT` sobre secuencia ITEM; sin DDL ni pertenencia al owner.
- `planilla_audit_owner NOLOGIN`: propietario de auditoría y función `SECURITY DEFINER` de inserción.
- `gestor_runtime` solo recibe `EXECUTE` de la función de auditoría, no INSERT/UPDATE/DELETE/TRUNCATE directos.
- Credencial ERP dedicada existe en ERP externo con CONNECT/USAGE/SELECT allowlisted y sin DML/DDL.

Un prerrequisito mueve fuera de startup toda mutación: DDL, saneamientos/backfills, seeds y sincronización RBAC. Job/perfil `migrate` usa secreto migrador; runtime solo verifica esquema/manifiesto con SELECT y falla si falta algo. Bootstrap `admin/admin123` se elimina: producción exige secreto de un solo uso montado como archivo o un admin preexistente y nunca conserva/impresa la clave. Solo después se revoca DDL/RBAC-write al runtime.

## 3. Storage y Cuarentena

Path interno único: `/var/lib/gestor/planilla-regional`, fuera de `/app`.

Subdirectorios:

- `cuarentena/`: `0700`, solo usuario backend, nunca servido.
- `limpio/`: `0750`, lectura por servicio autorizado, nunca público.
- `temporal/`: `0700`, limpieza al finalizar y job de recuperación.

Montajes:

- Desarrollo: volumen Docker nombrado `planilla_regional_storage`.
- Pruebas3: bind/volume definido por `PLANILLA_STORAGE_PATH`, fuera del checkout.
- Producción: volumen persistente dedicado con opciones `nodev,nosuid,noexec` cuando el runtime las soporte.

El contenedor corre como UID/GID no root fijo. Startup verifica propietario, permisos y que el path real no esté bajo `/app`, `/workspace` ni una ruta servida. Backups y retención se configuran por el operador; originales se eliminan a los 30 días, evidencia de auditoría a los 365.

## 4. Pipeline de Archivo

Estados: `CUARENTENA -> ESCANEANDO -> LIMPIO -> PROCESANDO -> PROCESADO` o `RECHAZADO|ERROR`.

1. Rate limit y cuota se evalúan antes de leer body.
2. Lectura por chunks calcula tamaño y SHA-256 sin cargar todo en RAM.
3. Nginx fija `client_max_body_size 50m` y `proxy_request_buffering off`; backend usa `Request.stream()` y parser multipart streaming, nunca `await file.read()` ni spool ASGI por defecto.
4. Nombre generado por servidor; se rechazan path traversal, nombres duplicados ZIP, enlaces, archivos anidados, cifrado, OLE y relaciones externas.
5. Presupuesto request: 5 archivos, 50 MB comprimidos, 200 MB descomprimidos; por archivo: 20 MB, 10.000 entradas, ratio 20:1, XML 20 MB y hoja 100.000x100.
6. Antimalware timeout/error/incierto produce `RECHAZADO`; solo `LIMPIO` habilita parseo/preview/descarga.
7. Coordinador lanza sandbox por trabajo bajo UID efímero/directorio 0700. Abre no-follow, valida owner/inode/hash/nonce. Sandbox ve input read-only/tmpfs limitado. Backend revalida resultado. Sin DB/ERP/Redis/keyrings/red/socket; root read-only, cap-drop, seccomp, PID 64, 512 MB, 1 CPU, 60 s, máximo 2 global/1 usuario.
8. `.xlsm` no ejecuta macros; `finally` limpia temporal y job elimina huérfanos.

Cuota de storage: 250 MB por usuario y 5 GB global. Lua Redis reserva bytes/trabajo antes de leer; `Content-Length` ausente reserva máximo y uno subdeclarado incrementa atómicamente por chunk o aborta antes de exceder. Nginx limita 50 MB. Un ledger PostgreSQL de archivos no expirados es autoridad; TTL Redis solo cubre upload en curso y reconciliador no libera storage hasta borrado confirmado.

## 5. Rate Limits

Se aplican dos buckets independientes: usuario y IP confiable. Superar cualquiera devuelve 429 con `Retry-After`. Los aliases 1Q/2Q comparten bucket por operación.

| Operación | Cuota |
|---|---|
| consulta | 60/min |
| faceta | 30/min |
| Tabla Maestra validar | 30/min |
| Tabla Maestra generar | 10/min |
| historial/resumen | 30/min |
| exportación XLSX | 5/min |
| `exportar-solid` | 5/min |
| carga/preview/proceso | 3 cada 10 min |
| descarga original | 10/min |
| configuración/activación | 10/hora |

Redis se consulta antes de ERP, ZIP, XLSX o consultas pesadas. Si Redis no está disponible, todas las rutas de Planilla Regional, Tabla Maestra y Solid devuelven 503; no existe fallback en memoria.

## 6. Matriz de Errores sin Oráculos

Secuencia para recursos por ID:

1. Sin autenticación: 401.
2. Sin permiso de operación de la ruta (consultar/cargar/exportar): 403 sin consultar existencia.
3. Con permiso de ruta: resolver objeto, categoría y alcance en consulta acotada.
4. ID inexistente, categoría/subcategoría no autorizada, estado no visible u objeto fuera de alcance: mismo 404, body `{"detail":"Recurso no encontrado"}`, headers `no-store` y auditoría saneada.

La prueba compara status, body y headers. No exige igualdad temporal exacta, pero ambas rutas ejecutan la misma consulta acotada para reducir diferencias observables.

`POST /archivos` sin ID exige subcategoría allowlisted. Categoría discordante produce 422 antes de almacenar. Historial/resumen exigen subcategoría explícita; no existe listado global multiclase en esta entrega.

## 7. Auditoría por Eventos

Estados append-only: `INICIADA`, `COMPLETADA`, `FALLIDA`, `DENEGADA`.

- Mutación DB: éxito y `COMPLETADA` en la misma transacción; tras rollback, `FALLIDA` se escribe en una nueva transacción fail-closed.
- Exportación/archivo: `INICIADA` se confirma antes del efecto externo; al finalizar se agrega `COMPLETADA` o `FALLIDA` con el mismo `operacion_id`.
- Denegación: `DENEGADA` se persiste antes de responder; si falla, se devuelve 503 sin datos.

El HMAC cubre los valores exactos almacenados. El digest de filtros también es HMAC keyed. DB revoca UPDATE/DELETE/TRUNCATE y agrega trigger `BEFORE TRUNCATE`. Keyring se monta como secret JSON read-only, valida base64 y mínimo 32 bytes; claves se retienen 365 días y la rotación se prueba antes de cambiar el kid activo.

`auditoria_middleware.py` excluye por allowlist exacta las rutas Planilla Regional, Tabla Maestra y Solid cubiertas por el escritor dedicado. Cada operación genera eventos solo en un sistema; pruebas verifican cero duplicados y que el middleware genérico nunca lea sus bodies.

Cutover: desplegar en modo GENERICA una versión donde middleware/endpoint entienden ambos modos; health reporta versión compatible por instancia. Drenar instancias antiguas y verificar cero incompatibles antes de cambiar DB a DEDICADA. Cada request fija modo una vez: GENERICA audita solo middleware; DEDICADA omite genérica y exige dedicada. Pruebas con toggle concurrente demuestran cero huecos/duplicados.

## 8. RBAC y Rollout

Permisos Planilla Regional:

- consultar;
- exportar;
- salario.consultar;
- cargar;
- configurar.

Permisos colaterales explícitos:

- `nomina_novedades.tabla_maestra.generar`;
- `nomina_novedades.exportar_solid`.

Auto-discovery los crea y asigna solo a admin. Antes de enforcement se exporta una matriz de usuarios/roles que hoy usan Tabla Maestra/Solid, Gestión Humana la aprueba y se asignan permisos. No se heredan automáticamente desde `nomina_novedades`.

La migración agrega unicidad de módulo/rol y usa UPSERT transaccional bajo advisory lock. Fallos se propagan y bloquean startup/enforcement; no se absorben. Repara explícitamente el permiso admin requerido aunque exista con `permitido=false`. Los siete permisos se registran también en `auditoria_manifest.py`.

## 9. Límite del Hardening Legacy

Esta entrega no agrega una dependencia global nueva a categorías ajenas. Extrae rutas nuevas de Planilla Regional y aplica autorización category-aware únicamente cuando la subcategoría canónica sea 1Q/2Q. Tabla Maestra y Solid son excepciones colaterales aceptadas y reciben permisos dedicados.

El cierre global de rutas públicas de otras categorías requiere un plan de seguridad separado. Activar Planilla Regional queda condicionado a que ese prerrequisito esté aprobado/implementado o a que las rutas compartidas no permitan alcanzar datos Planilla con una categoría distinta.

Fase 6 persiste gate solo mediante función migrador/DBA. `aprobado_por` procede de aprobación registrada, no body libre. Backend recibe `BUILD_SHA` obligatorio; endpoint toma actor del JWT y no acepta actor/SHA del cliente. Runtime no tiene UPDATE; función execute-only valida evidencia/SHA. Sin ella HTTP responde 409 y DB rechaza.

La allowlist Solid es una constante versionada `SUBCATEGORIAS_SOLID_PERMITIDAS` en el servicio y se prueba contra el catálogo esperado; nunca se deriva de subcategorías cargadas por clientes. Cambiarla requiere código, revisión y despliegue.

ERP valida CA/certificado y hostname. Antimalware usa TLS verificado, autenticación de servicio (mTLS en producción) y su verdict incluye el SHA-256 solicitado; backend rechaza verdict con hash distinto.

Producción termina HTTPS en proxy confiable: HTTP redirige y añade HSTS. PostgreSQL principal y ERP usan `sslmode=verify-full`, CA/hostname validados para runtime/migrador. Scanner usa HTTPS mTLS. Redis usa obligatoriamente `rediss://` con CA, hostname y ACL, además de red interna sin puerto público. Preflight verifica certificados/paths y falla cerrado.

Pruebas de regresión demuestran que categorías no Planilla conservan su contrato actual durante esta entrega; no se amplía su acceso.

## 10. Pruebas Operativas Mínimas

- Request inmediatamente anterior a cada cuota pasa; el siguiente devuelve 429 y `Retry-After`.
- Redis caído devuelve 503 antes de abrir ERP, ZIP o consulta pesada.
- Ciclo nominal `CUARENTENA -> ESCANEANDO -> LIMPIO -> PROCESADO` habilita preview solo después de limpio.
- Malware, timeout, path traversal, entrada duplicada/anidada y exceso de ratio/tamaño terminan en `RECHAZADO` y limpian temporales.
- Límites de usuario/global y concurrencia de worker se aplican antes de aceptar trabajo.
- Rotación HMAC verifica eventos firmados por kid actual y retirado dentro de retención.
- UPDATE, DELETE y TRUNCATE de auditoría fallan con el rol runtime.
- 401/403/404 cumplen exactamente la matriz para procesar, preview y descarga.
