Security/RBAC review: blocked

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ❌

## Scope
- Fase 1A.3 GeoFace evidencias autenticadas.
- Archivos revisados: `movil/src/services/faceApi.ts`, `movil/src/components/CheckInItem.tsx`, backend biometria actual para owner/admin, `backend_v2/app/core/rbac_manifest.py`.
- Nota: el working tree incluye cambios backend de fases previas; la evidencia de Fase 1A.3 indica que el backend no cambió en esta fase. Se validó el estado actual de `/biometria/evidencia/{filename}`.

## Findings

### BLOQUEANTE — Riesgo de exfiltración de JWT a origen externo en evidencias
- Ubicación: `movil/src/services/faceApi.ts:269-284`.
- `getAuthenticatedImageUri()` acepta `relativeUrl` absoluto (`http://` o `https://`) y luego adjunta `Authorization: Bearer <token>` a ese URL.
- Aunque el backend actual genera rutas relativas, si un registro `evidenciaUrl` queda contaminado en BD, migración o respuesta legacy, el cliente enviaría el JWT a un dominio controlado por tercero.
- Recomendación: aceptar solo rutas relativas esperadas, por ejemplo `/api/v2/biometria/evidencia/{filename}`, o validar `URL.origin === API_BASE.origin` antes de agregar `Authorization`. Rechazar cualquier origen externo.
- CWE: CWE-200, CWE-522, CWE-939.

### ALTO — Cache local de evidencias biométricas sin política de borrado/TTL
- Ubicación: `movil/src/services/faceApi.ts:286-290` y `movil/src/components/CheckInItem.tsx:22-45`.
- En nativo, cada evidencia se descarga a `FileSystem.cacheDirectory` con nombre aleatorio, pero no hay limpieza al desmontar el componente, al cerrar sesión, al refrescar historial ni TTL/retención.
- Las evidencias biométricas son datos sensibles; quedan en almacenamiento local no cifrado por la app y pueden acumularse.
- Recomendación: borrar los archivos temporales cuando ya no se usan y en logout, o convertir a data URI en memoria y eliminar el archivo temporal inmediatamente; definir retención explícita para evidencias.
- CWE: CWE-922, CWE-359.

### MEDIO — Resultado HTTP de `downloadAsync` no se valida antes de usar el archivo local
- Ubicación: `movil/src/services/faceApi.ts:289-290`.
- `FileSystem.downloadAsync()` devuelve un resultado que debe validarse por `status`. Sin esa validación, una respuesta 401/403/404 podría quedar cacheada y ser entregada a `<Image>` como si fuera evidencia.
- Recomendación: comprobar `result.status` 2xx; si no, borrar el archivo descargado y lanzar `FaceApiError` genérico.
- CWE: CWE-754.

### MEDIO — Logs móviles todavía imprimen objetos de error sin redacción garantizada
- Ubicaciones: `movil/src/components/CheckInItem.tsx:34-36`, `movil/src/context/AppContext.tsx` en rutas nuevas de estado/zona.
- No se observó token en query params ni logging explícito del JWT. Sin embargo, los `console.error(..., error)` podrían incluir URL de evidencia/filename o detalles de transporte según plataforma. Los filenames backend históricos incluyen identificador de usuario.
- Recomendación: loguear solo códigos saneados (`HTTP_403`, `TIMEOUT`, etc.) y mensajes genéricos, sin URL, headers ni identifiers.
- CWE: CWE-532, CWE-359.

### MEDIO — Owner/admin correcto en backend, pero falta prueba automatizada específica para evidencia
- Ubicación backend: `backend_v2/app/api/biometria/biometria_router.py:92-99`, `backend_v2/app/services/biometria/biometria_service.py:173-188`.
- Estado actual: endpoint protegido con `Depends(requerir_permiso_biometria)`; servicio valida existencia de registro y permite solo admin o dueño (`registro.usuario_id == usuario.id`). RBAC manifest contiene `biometria` como módulo crítico.
- Riesgo residual: no se encontró test específico para `/biometria/evidencia/{filename}` que cubra 401 sin token, 403 no owner, 200 owner y 200 admin.
- Recomendación: agregar cobertura de router/servicio para owner/admin antes de promover a piloto productivo.
- CWE: CWE-862, CWE-863.

## RBAC/config impact
- `backend_v2/app/core/rbac_manifest.py` ya contiene `biometria` (`es_critico=True`).
- `/biometria/evidencia/{filename}` usa `requerir_permiso_biometria`; no se detecta endpoint nuevo de evidencia sin auth.
- No se detectan cambios Docker/env/infra en esta fase.

## Blocking reasons
1. El cliente móvil puede enviar el JWT Bearer a URLs absolutas externas recibidas como `evidenciaUrl`.
2. La descarga nativa persiste evidencias biométricas en cache sin ciclo de vida ni borrado.

Severity: BLOQUEANTE
