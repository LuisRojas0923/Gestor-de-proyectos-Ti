# Security/RBAC review: approved_with_risks

**Fecha:** 2026-07-15
**Alcance:** revisión final de carga, descarga y eliminación privada de evidencias WBS. Revisión estática; se acepta como evidencia comunicada `10 passed`, no reproducida por este revisor debido a su lista de comandos autorizados.

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: ✅
- No str(e) en 500: ❌
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Resultado del recheck

No queda un bloqueo explotable remoto dentro del alcance revisado. El bypass `+42` quedó cerrado: el middleware cubre cualquier segmento no vacío, contabiliza `Content-Length` y streaming, y la prueba del endpoint real confirma 413 para multipart chunked sin `Content-Length` sobre `/+42/archivo`.

Referencias: `backend_v2/app/core/middleware/limite_carga_actividad.py:8`, `backend_v2/app/core/middleware/limite_carga_actividad.py:20-62`, `backend_v2/app/api/desarrollos/actividad_archivos_router.py:76-124`, `testing/backend/test_actividad_archivos.py:139-149`, `testing/backend/test_actividad_archivos.py:189-207`.

## Riesgos residuales no bloqueantes

### MEDIO — defensa local frente a symlinks y TOCTOU incompleta

La lectura comprueba el candidato y su padre inmediato, pero no cada ancestro; la escritura crea y abre el directorio sin verificación equivalente. `FileResponse` abre el path después de validarlo. La explotación requiere capacidad local para modificar el bind mount, que ya permite acceso directo a los archivos, por lo que no constituye un bypass remoto de RBAC ni bloquea este build.

Referencias: `backend_v2/app/services/desarrollos/actividad_archivo_service.py:113-121`, `backend_v2/app/services/desarrollos/actividad_archivo_service.py:156-163`, `backend_v2/app/api/desarrollos/actividad_archivos_router.py:183-204`, `docker-compose.prod.yml:33-35`. CWE-59, CWE-367.

### MEDIO — consistencia eventual entre DB y filesystem

Los fallos al retirar el archivo físico se registran, pero no existe reconciliación/reintento; DELETE puede confirmar la desvinculación mientras queda un archivo huérfano. Una cancelación durante copia/rename también puede dejar residuos, y GET puede competir con reemplazo/DELETE antes de la apertura de `FileResponse`. Son riesgos de operación/retención y disponibilidad, no una vía observada de lectura o modificación remota no autorizada.

Referencias: `backend_v2/app/api/desarrollos/actividad_archivos_router.py:132-144`, `backend_v2/app/api/desarrollos/actividad_archivos_router.py:196-204`, `backend_v2/app/api/desarrollos/actividad_archivos_router.py:220-240`, `backend_v2/app/services/desarrollos/actividad_archivo_service.py:120-141`, `backend_v2/app/services/desarrollos/actividad_archivo_service.py:173-192`. CWE-367, CWE-459.

### MEDIO — persiste `str(e)` en endpoints WBS preexistentes

Los endpoints de evidencia devuelven mensajes 500 genéricos, pero crear, árbol, GET, PATCH, preview y DELETE de actividades aún exponen excepciones internas. Es un hallazgo heredado de la revisión original, sin regresión nueva en el controlador de archivos.

Referencias: `backend_v2/app/api/desarrollos/actividades_router.py:126-130`, `backend_v2/app/api/desarrollos/actividades_router.py:215-216`, `backend_v2/app/api/desarrollos/actividades_router.py:243-246`, `backend_v2/app/api/desarrollos/actividades_router.py:334-338`, `backend_v2/app/api/desarrollos/actividades_router.py:386-389`, `backend_v2/app/api/desarrollos/actividades_router.py:442-446`. CWE-209.

### BAJO — cobertura residual

Los 10 casos cubren filesystem, schemas, auditoría, límite canónico y `+42` chunked, lifecycle HTTP, RBAC básico y traversal. Quedan sin prueba focal 401 HTTP, denegación por recurso antes del parser, symlinks, cancelación, fallo de `unlink` y concurrencia GET/reemplazo.

Referencias: `testing/backend/test_actividad_archivos.py:29-240`. CWE-693.

## Controles confirmados

- ✅ POST/GET/DELETE autentican y exigen permiso efectivo `developments`.
- ✅ La autorización por recurso precede al parseo y se repite bajo `FOR UPDATE` después de guardar temporalmente.
- ✅ El estado `anulada` se evalúa después de autorización, sin oráculo 409/404.
- ✅ No hay lock de fila durante recepción/copia de red; escritores se serializan al persistir.
- ✅ La transacción inicial de autorización se libera antes de recibir el multipart; la segunda autorización usa un snapshot desacoplado del ORM.
- ✅ El middleware cubre IDs canónicos, `+42` e inválidos y limita streaming antes del parser.
- ✅ `archivo_url` no existe en `ActividadCrear`/`ActividadActualizar`; los extras se ignoran y no llegan a `model_dump()`, y el campo solo aparece en lectura.
- ✅ La referencia interna no admite slash/backslash y exige el directorio exacto de la actividad.
- ✅ Extensión, MIME, firma, tamaño, temporal exclusivo, `fsync`, UUID, headers privados, auditoría y `python-multipart==0.0.32` permanecen correctos.

RBAC/config impact: `developments` continúa correctamente registrado y aplicado. No se observó IDOR, traversal remoto, mass assignment ni regresión de permisos en el flujo final.

Blocking reasons: ninguno dentro del alcance.

Severity: MEDIO
