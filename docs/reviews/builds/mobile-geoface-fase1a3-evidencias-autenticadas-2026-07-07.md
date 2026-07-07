# Mobile review - GeoFace Fase 1A.3 evidencias autenticadas

**Fecha:** 2026-07-07  
**Resultado:** `approved_with_risks`  
**Alcance:** `movil/src/services/faceApi.ts`, `movil/src/components/CheckInItem.tsx`, reporte de build de Fase 1A.3.

## Findings

- **High - Errores HTTP/permisos pueden quedar enmascarados en nativo.** `getAuthenticatedImageUri()` usa `FileSystem.downloadAsync()` y retorna `result.uri` sin validar `result.status`. Si el endpoint protegido responde `401/403/404` o JSON de error, se puede cachear como `.jpg` y `CheckInItem` lo trata como imagen válida. Además `<Image>` no tiene `onError`, por lo que el operador puede ver un avatar vacío sin fallback claro.
- **Medium - Cache de evidencias sin política de limpieza ni deduplicación.** Cada evidencia nativa se guarda en `FileSystem.cacheDirectory` con nombre único por `Date.now()`/`Math.random()`. Reabrir Dashboard o refrescar historial vuelve a descargar y acumula fotos biométricas en cache, con riesgo de disco/PII.
- **Medium - Lista media-heavy no está virtualizada.** `DashboardScreen` renderiza `checkIns.map()` dentro de `ScrollView`; ahora cada ítem con evidencia dispara una descarga autenticada. En vista admin o historiales largos esto puede generar muchas descargas concurrentes, jank y consumo alto de datos.
- **Medium - Lifecycle/cancelación incompletos en baja conectividad.** El `active=false` evita `setState` tras desmontar, pero no cancela `downloadAsync`; al cambiar de ruta o perder conectividad, descargas siguen vivas y no hay timeout equivalente a `REQUEST_TIMEOUT`.
- **Low - UX de fallback insuficiente.** El icono `image-outline` no distingue offline, permiso denegado, sesión expirada o evidencia inexistente, y no ofrece reintento/tooltip/texto accesible.

## Required checks

- Reportado por build: `npm --prefix movil run typecheck` — PASS.
- Pendiente recomendado: prueba manual Android/iOS con sesión válida, sesión expirada, empleado intentando evidencia ajena, admin viendo evidencias, backend offline/lento y evidencia inexistente.
- `movil/package.json` no declara `lint`/`test`; si se agregan scripts, ejecutar `npm --prefix movil run lint` y `npm --prefix movil run test`.
- Validar con `security-rbac-reviewer` que `/api/v2/biometria/evidencia/{filename}` mantiene owner/admin y no hay token en query params.

## Offline/performance risks

- En baja conectividad no hay timeout/cancelación nativa ni feedback accionable.
- Cache no acotada de fotos de evidencia.
- Descarga eager de todas las evidencias visibles/no visibles por uso de `ScrollView` + `map()`.

## Blocking reasons

No hay bloqueo de release si la fase se acepta como incremental y se registran los riesgos. Antes de ampliar historial/admin o uso en campo intensivo, corregir validación de `status`, `Image.onError`, limpieza/dedupe de cache y virtualización/lazy loading.
