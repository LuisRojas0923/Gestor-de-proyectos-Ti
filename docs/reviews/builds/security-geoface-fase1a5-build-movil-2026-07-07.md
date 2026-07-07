Security/RBAC review: blocked

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: N/A
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: N/A
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ❌

Findings:
- BLOQUEANTE — `movil/app.json` mantiene `android.usesCleartextTraffic=true` y `movil/src/services/faceApi.ts` construye `http://<EXPO_PUBLIC_API_HOST>:8000/api/v2` por defecto y normaliza hosts sin esquema a `http://`. Para un `production` app-bundle esto permite transporte claro de JWT, fotos biométricas, evidencias y coordenadas GPS. Aprobable solo para piloto LAN/VPN interno con aceptación explícita del riesgo; no para producción abierta. CWE-319, CWE-522, CWE-359.
- MEDIO — Permisos mínimos: se eliminó `android.permission.RECORD_AUDIO` correctamente. Cámara + ubicación fina/gruesa son coherentes con GeoFace, pero hay duplicados (`CAMERA`/`android.permission.CAMERA`, `ACCESS_*`/`android.permission.ACCESS_*`). No amplían privilegios, pero conviene deduplicar para trazabilidad de permisos. `NSPhotoLibraryUsageDescription` y `expo-image-picker` aparecen sin uso operativo detectado; revisar si deben retirarse para minimizar superficie.
- MEDIO — JWT en nativo se guarda en `expo-secure-store`, correcto. Riesgo residual: fallback web usa `AsyncStorage`; no debe usarse para build móvil productivo con sesión real. Evitar builds web/públicos con credenciales reales o aislarlos.
- ALTO — Fotos de rostro y GPS: la app copia fotos faciales a `FileSystem.documentDirectory/face_photos/` y guarda/exporta historial con latitud/longitud. El sandbox móvil reduce exposición, pero no equivale a cifrado de biométricos; en dispositivos rooteados, backups o APK distribuido fuera de MDM puede exponerse. La evidencia descargada se borra del cache temporal, punto positivo.
- MEDIO — Distribución APK preview: `eas.json` define `preview` como `distribution: internal` + APK, correcto para pruebas internas. Falta política operacional: lista cerrada de testers, no publicar APK en chats/repos, checksum/firma, caducidad/revocación de builds y validación en dispositivos corporativos. APK sideload aumenta riesgo de redistribución y downgrade.
- MEDIO — Logs móviles: `auth.ts` sanitiza varios errores, pero aún existen `console.error(error|err|e)` en enrolamiento/verificación/contextos que pueden exponer URIs locales, mensajes backend o datos operativos. No se observó impresión directa del JWT, pero debe endurecerse antes de producción.

RBAC/config impact:
- No hubo cambios backend/RBAC. `backend_v2/app/core/rbac_manifest.py` ya contiene `biometria`; rutas biométricas revisadas usan `Depends(requerir_permiso_biometria)` sobre `obtener_usuario_actual_db`.
- `getStoredAccounts()` ahora envía `Authorization: Bearer <token>` a `/auth/analistas`; el endpoint backend exige usuario autenticado y rol admin/admin_sistemas/admin_mejoramiento.
- Impacto de configuración principal: separar perfiles de red. `preview` puede conservar cleartext solo bajo LAN/VPN controlada; `production` debe forzar HTTPS y desactivar cleartext.

Blocking reasons (si aplica):
- Bloqueado para producción/app-bundle mientras `usesCleartextTraffic=true` y el cliente construya HTTP por defecto. Requisito mínimo: HTTPS extremo a extremo o VPN corporativa obligatoria documentada, y preferiblemente `usesCleartextTraffic=false` en production con variable `EXPO_PUBLIC_API_BASE_URL=https://...`.

Severity: BLOQUEANTE
