Security/RBAC review: approved_with_risks

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: ✅
- No print(): ✅
- PII redacted: ❌

## Findings ordenados por severidad

1. **ALTO — JWT y biometría viajan por HTTP claro hacia una IP LAN hardcodeada.**
   - `modulo_autenticacion_facial_fork/src/services/faceApi.ts:22-27` fija `http://192.168.40.163:8000/api/v2`.
   - `modulo_autenticacion_facial_fork/src/services/faceApi.ts:109-113` mantiene `Authorization: Bearer <JWT>` y `:129` envía la captura facial a esa base.
   - `modulo_autenticacion_facial_fork/app.json:25` permite `usesCleartextTraffic`.
   - Riesgo: MITM/sniffing en LAN, robo/replay de JWT y exposición de imágenes biométricas. Aceptable solo como build LAN controlado; bloquearía producción si no hay HTTPS/VPN/mTLS y cleartext deshabilitado.

2. **ALTO — La configuración manual del servidor permite exfiltrar JWT y fotos a hosts no confiables.**
   - `modulo_autenticacion_facial_fork/src/services/faceApi.ts:32-58` acepta cualquier `http(s)://host` y lo persiste como `API_BASE` sin allowlist ni exigencia de HTTPS.
   - `modulo_autenticacion_facial_fork/src/screens/LoginScreen.tsx:286-295` expone el campo de IP/host al usuario.
   - Riesgo: un host malicioso configurado por error o ingeniería social recibe `Authorization` y `FormData` biométrico. Recomendado: allowlist/rango corporativo, pinning/HTTPS en producción y advertencia explícita al cambiar host.

3. **MEDIO — Recursos protegidos por RBAC no reciben Authorization cuando se renderizan como imágenes.**
   - Backend: `backend_v2/app/api/biometria/biometria_router.py:73-90` protege `/foto/{filename}` y `/evidencia/{filename}` con `requerir_permiso_biometria`.
   - Móvil: `modulo_autenticacion_facial_fork/src/components/ProfileCard.tsx:16-20,38` y `src/components/CheckInItem.tsx:17-23,32-33` usan `<Image source={{ uri }}>`, que no adjunta el JWT de `faceApi.ts`.
   - Riesgo: integración rota con 401/403 para avatares/evidencias tras endurecer RBAC. No debilita seguridad, pero requiere fetch autenticado a blob/cache local o URLs firmadas de corta vida.

4. **MEDIO — Endpoints biométricos costosos no muestran rate limiting específico.**
   - `backend_v2/app/api/biometria/biometria_router.py:40-60` expone enrolamiento/asistencia con carga de imágenes y llamada al motor facial sin decorador de rate limit visible.
   - Riesgo: un usuario con JWT válido y permiso `biometria`, o un JWT robado por el riesgo HTTP, puede agotar CPU/IO del motor interno. Recomendado: límite por usuario+IP en `/biometria/enrolar` y `/biometria/asistencia`.

5. **MEDIO — `usuario_id` se interpola en query string sin codificación y puede quedar en logs.**
   - `modulo_autenticacion_facial_fork/src/services/faceApi.ts:231-232` construye `/biometria/asistencias?usuario_id=${userId}`.
   - Riesgo: cédula/ID en logs de proxies y caracteres especiales no codificados. Usar `encodeURIComponent(userId)` o enviar filtros normalizados. Backend restringe no-admin a su propio usuario, lo cual reduce impacto RBAC.

6. **BAJO — Normalización duplica `/api/v2` si el usuario ingresa ruta con slash final.**
   - `modulo_autenticacion_facial_fork/src/services/faceApi.ts:46-50` evalúa `endsWith('/api/v2')` antes de quitar `/`; `http://ip:8000/api/v2/` termina como `/api/v2/api/v2`.
   - Riesgo: fallo de conexión por configuración aparentemente válida. Normalizar primero el slash final y luego comparar.

7. **BAJO — Log de configuración expone topología interna.**
   - `modulo_autenticacion_facial_fork/src/services/faceApi.ts:58` imprime `API_BASE`.
   - Riesgo: fuga menor de IP/puerto en logs de dispositivo. No filtra JWT, pero conviene limitarlo a modo debug.

## Verificaciones positivas
- `faceApi.ts:109-113` conserva el JWT en `Authorization` también para `FormData` porque solo elimina `Content-Type`, no `Authorization`.
- IP sin puerto se normaliza a `:8000/api/v2` para IPv4 (`faceApi.ts:38-50`).
- `backend_v2/app/main.py:251-255` expone `/api/v2/health`, por lo que `healthCheck()` bajo `API_BASE` es consistente.
- RBAC backend está activo: `rbac_manifest.py:105-110` contiene `biometria` crítico y el router usa `Depends(requerir_permiso_biometria)` en los endpoints revisados.
- El motor interno no recibe JWT de usuario: `backend_v2/app/services/biometria/biometria_engine_client.py:60-63` usa token interno propio.

## RBAC/config impact
- Impacto RBAC: positivo en backend; las rutas biométricas quedan protegidas por módulo `biometria`.
- Impacto config: la IP LAN actual funciona para build local, pero queda acoplada al binario y transmite datos sensibles por HTTP.

## Blocking reasons
- No bloqueo este build LAN si se trata de pruebas controladas.
- Bloquearía despliegue productivo con la configuración actual de HTTP claro, host arbitrario y `usesCleartextTraffic` habilitado.

Severity: ALTO

CWE references: CWE-319, CWE-522, CWE-200, CWE-598, CWE-770, CWE-20, CWE-284
