# Analisis - Estado actual app movil GeoFace

**Fecha:** 2026-07-05
**Plan:** Estado actual de la app movil GeoFace antes de nueva implementacion
**Autor del plan:** Agente IA (OpenCode)
**Modo:** plan / discovery
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

Persistir el estado actual de `movil/` antes de realizar cambios, identificando arquitectura vigente, contratos con backend, riesgos funcionales, riesgos de seguridad, brechas de pruebas y deuda documental.

## 2. No-objetivos

- No implementar cambios de codigo en la app movil.
- No instalar dependencias ni ejecutar builds nativos.
- No modificar backend, RBAC ni endpoints.
- No commitear ni subir cambios automaticamente.

## 3. Estado general

| Area | Estado observado |
|---|---|
| Carpeta activa | `movil/` |
| Framework | Expo Router + React Native |
| Versiones declaradas | `expo ~55.0.27`, `react ^19.2.0`, `react-native ^0.83.6`, `typescript ~5.9.2` |
| Scripts npm | `start`, `android`, `ios`, `web` |
| Dependencias instaladas localmente | `movil/node_modules` no existe |
| Typecheck/lint/test | No hay scripts dedicados en `movil/package.json` |
| API movil actual | `http://EXPO_PUBLIC_API_HOST:8000/api/v2` |
| Backend biometrico actual | `backend_v2` protegido con JWT/RBAC y motor interno `biometria-engine` |
| Servidor facial legacy | `movil/face-server/` sigue versionado aunque no parece ser el camino activo |

## 4. Mapa de archivos clave

| Archivo | Rol actual |
|---|---|
| `movil/app/_layout.tsx` | Proveedores globales y `AuthGate` que redirige por autenticacion/enrolamiento local |
| `movil/app/enroll.tsx` | Captura de foto base y alta de perfil local + enrolamiento backend |
| `movil/app/(tabs)/_layout.tsx` | Tabs; oculta dashboard/perfiles/ubicacion a usuarios no admin |
| `movil/src/context/AuthContext.tsx` | Estado de sesion, carga token, login y cuenta actual |
| `movil/src/context/AppContext.tsx` | Perfiles, zonas, check-ins, threshold y ubicacion |
| `movil/src/services/faceApi.ts` | Cliente HTTP para biometria, health y servidor configurable |
| `movil/src/services/auth.ts` | Login, token, `/auth/yo`, analistas y funciones legacy de usuarios |
| `movil/src/services/storage.ts` | SecureStore/AsyncStorage, fotos locales y cache de perfiles/zonas/check-ins |
| `movil/src/hooks/useLocation.ts` | Tracking GPS y geofence local |
| `movil/src/screens/VerifyScreen.tsx` | Selfie de asistencia, validacion local de zona y resultado |
| `movil/src/screens/LoginScreen.tsx` | Login y modal de configuracion del servidor |
| `movil/src/screens/SettingsScreen.tsx` | Zonas locales, threshold local, usuarios admin y exportacion |
| `movil/src/components/CheckInItem.tsx` | Render de historial y evidencia fotografica |
| `movil/API_CONTRACT.md` | Contrato obsoleto Flask/DeepFace `:5005` |
| `movil/docs/*.md` | Documentacion parcialmente alineada, con rutas antiguas y menciones ya obsoletas |

## 5. Flujo actual de autenticacion

| Paso | Implementacion |
|---|---|
| Configuracion servidor | `faceApi.ts` exige `EXPO_PUBLIC_API_HOST` y arma `:8000/api/v2` |
| Login | `auth.ts` hace `POST /auth/login` con form-urlencoded `username` y `password` |
| Persistencia token | `geo_face_session` en SecureStore nativo o AsyncStorage web |
| Usuario actual | `auth.ts` llama `/auth/yo` con `Authorization: Bearer <token>` |
| Restauracion sesion | `AuthContext` lee el token y vuelve a consultar `/auth/yo` |

### Hallazgos de autenticacion

| Prioridad | Hallazgo | Evidencia | Impacto |
|---|---|---|---|
| Alta | `getStoredAccounts()` llama `/auth/analistas` sin `Authorization` | `movil/src/services/auth.ts:69-74` | Admin no podra cargar analistas si backend exige JWT, como corresponde |
| Alta | `deleteAccount()` sigue llamando a ruta legacy `/v1/users/{id}` | `movil/src/services/auth.ts:82-84` | Eliminacion de usuarios desde app apunta a contrato viejo y probablemente falla |
| Media | `UserAccount` declara `passwordHash` requerido pero los objetos creados desde backend no lo llenan | `movil/src/types/index.ts:65-72`, `movil/src/services/auth.ts:165-171` | Inconsistencia TypeScript/dominio; puede aparecer al endurecer typecheck |
| Media | En web el token cae en AsyncStorage | `movil/src/services/auth.ts:13-18` | Aceptable para pruebas web, no equivalente a SecureStore nativo |

## 6. Flujo actual de enrolamiento y asistencia

| Paso | Implementacion actual |
|---|---|
| Enrolamiento | `app/enroll.tsx` toma foto y llama `AppContext.addProfile(currentUser.id, currentUser.displayName, photo.uri)` |
| Alta local | `AppContext.addProfile()` guarda foto local y perfil local en `storage.ts` |
| Alta backend | Si `healthCheck()` responde OK, llama `enrollFace(localPhotoUri, id, name)` |
| Identidad autoritativa | Backend ignora `userId` cliente y usa JWT actual en `/biometria/enrolar` |
| Verificacion | `VerifyScreen` valida zona local, toma selfie y llama `/biometria/asistencia` |
| Historial | `DashboardScreen` llama `fetchCheckIns()` desde backend y lo mapea a modelo local |

### Hallazgos de biometria y asistencia

| Prioridad | Hallazgo | Evidencia | Impacto |
|---|---|---|---|
| Critica | El estado de enrolamiento depende de `profiles` local, no del backend | `movil/app/_layout.tsx:24-34` | Un usuario enrolado en backend puede quedar obligado a enrolar de nuevo en otro dispositivo; un perfil local puede marcarse como enrolado aunque backend no tenga embedding |
| Critica | `addProfile()` guarda perfil local aunque el servidor este offline | `movil/src/context/AppContext.tsx:95-114` | La app puede dejar pasar el `AuthGate`, pero `/biometria/asistencia` luego falla con `404 El usuario no tiene un rostro enrolado` |
| Alta | `updateProfilePhoto()` captura errores de enrolamiento y aun actualiza foto local | `movil/src/context/AppContext.tsx:118-149` | Desincronizacion silenciosa entre foto local y embedding real del backend |
| Alta | Las zonas son locales con `Date.now().toString()` y se envian como `zona_id` al backend | `movil/src/context/AppContext.tsx:161-167`, `movil/src/screens/VerifyScreen.tsx:117-123` | `Date.now()` supera `2147483647`; backend descarta el `zona_id`, por lo que registros quedan sin zona oficial |
| Alta | El backend no valida geofence, solo guarda coordenadas y resuelve `zona_id` si existe | `backend_v2/app/services/biometria/biometria_service.py:80-96`, `209-213` | La restriccion de estar en zona es principalmente cliente; puede ser manipulable si alguien llama la API directo |
| Alta | Evidencias protegidas se renderizan con `<Image uri>` sin header Authorization | `movil/src/components/CheckInItem.tsx:17-32`, `backend_v2/app/api/biometria/biometria_router.py:83-90` | Las imagenes de evidencia probablemente no cargan porque el backend exige JWT/RBAC |
| Media | `enrollFace(photoUri, userId, userName)` recibe parametros que ya no usa | `movil/src/services/faceApi.ts:217-225` | No es bug de seguridad porque backend usa JWT, pero aumenta confusion con contrato anterior |
| Media | `photoToBase64()` existe pero no se usa | `movil/src/services/faceApi.ts:192-215` | Deuda tecnica heredada del contrato base64 anterior |
| Media | La respuesta de asistencia no incluye `verified`, aunque `VerifyResponse` lo declara | `movil/src/services/faceApi.ts:111-116`, `backend_v2/app/services/biometria/biometria_service.py:108-114` | Hoy no rompe porque `VerifyScreen` asume exito si HTTP 200, pero el tipo esta desalineado |

## 7. Geolocalizacion y zonas

| Aspecto | Estado |
|---|---|
| Permisos | `expo-location` solicita foreground permissions |
| Tracking | Inicia automaticamente en `useLocation.ts:110-115` |
| Precision | `Location.Accuracy.High` |
| Geofence | Local, usando zonas guardadas en SecureStore/AsyncStorage |
| Zonas backend | Existen endpoints `/biometria/zonas`, pero la app no los consume |

### Riesgo principal

La app tiene dos fuentes potenciales de verdad para zonas: zonas locales en `storage.ts` y zonas oficiales en backend. Actualmente el flujo operativo usa las locales, mientras backend solo asocia `zona_id` si el ID coincide con una zona real. En la practica, los check-ins pueden auditar coordenadas pero no una zona oficial.

## 8. Seguridad y permisos

| Area | Estado / riesgo |
|---|---|
| JWT | Se envia en `faceApi.request()` si existe token |
| RBAC backend | Biometria requiere permiso `biometria` |
| Motor biometrico | No esta expuesto al movil; el movil solo habla con backend |
| HTTP LAN | `app.json` permite `usesCleartextTraffic: true` |
| IP por env | `EXPO_PUBLIC_API_HOST` esta en `.env.example` con IP concreta |
| Audio | Android declara `RECORD_AUDIO`, no se observa uso funcional |
| Evidencias/fotos | Backend protege por auth + owner/admin, pero app no adjunta token en `<Image>` |
| Face-server legacy | `movil/face-server/` contiene DeepFace, auth propia, CORS abierto y puerto 5005 |

### Hallazgos de seguridad

| Prioridad | Hallazgo | Evidencia | Mitigacion sugerida |
|---|---|---|---|
| Alta | Evidencias protegidas no pueden consultarse de forma segura con `<Image>` simple | `CheckInItem.tsx`, router biometria | Descargar con `fetch` autenticado y usar blob/data URI, o exponer endpoint con mecanismo seguro temporal |
| Alta | `face-server/` legacy sigue en repo y documentacion | `movil/face-server/server.py`, `movil/API_CONTRACT.md` | Eliminar si no se usa o mover a archivo historico claramente no operativo |
| Media | Cleartext HTTP requerido para LAN | `movil/app.json:25` | Aceptar solo en piloto LAN; para produccion usar HTTPS o network security config por entorno |
| Media | Permiso `RECORD_AUDIO` no justificado | `movil/app.json:26-33` | Remover si la camara no graba video/audio |
| Media | `.env.example` contiene una IP real de LAN | `movil/.env.example:1` | Reemplazar por placeholder si el hook/proceso de seguridad lo exige |

## 9. Documentacion y deuda legacy

| Archivo | Estado |
|---|---|
| `movil/API_CONTRACT.md` | Obsoleto: describe Flask/DeepFace en `:5005` y endpoints `/v1/*` |
| `movil/docs/CONTEXTO.md` | En general describe backend central, pero aun muestra ruta antigua `modulo_autenticacion_facial_fork/` |
| `movil/docs/ARQUITECTURA.md` | Dice que backend ejecuta DeepFace directamente; ahora el runtime pesado esta separado en `biometria-engine` |
| `movil/docs/GUIA-DESARROLLO.md` | Usa carpeta antigua `modulo_autenticacion_facial_fork` y menciona OOM por DeepFace en backend |
| `movil/CHECKLIST.md` | Estado historico no sincronizado; muchas fases aparecen pendientes aunque ya hay implementacion |
| `movil/docs/agents/*.md` | Varios agentes describen servidor Flask/DeepFace legacy |

## 10. Verificacion ejecutada

| Comando / accion | Resultado |
|---|---|
| `git status -sb` | Rama `Modulo_Geoface` sincronizada antes del reporte |
| `npm --prefix "movil" pkg get scripts` | Solo `start`, `android`, `ios`, `web` |
| `Test-Path -LiteralPath "movil\\node_modules"` | `False` |
| `npm --prefix "movil" pkg get dependencies.expo dependencies.react dependencies.react-native devDependencies.typescript` | Versiones declaradas leidas correctamente |
| Lectura de archivos clave | Completada para rutas, contextos, servicios, pantallas principales, docs y backend biometrico |
| Typecheck/build/lint | No ejecutado: no hay `node_modules`; no se instalan dependencias en este analisis |

## 11. Matriz de subagentes

```text
Subagente | Motivo | Resultado | Bloquea
----------|--------|-----------|---------
harness-router | Recomendar matriz de revisores | required: mobile, backend, security-rbac, docs-tests | no
graphify-searcher | Mapa inicial de app movil | parcial; alcanzo limite de pasos pero entrego estructura y riesgos | no
mobile-reviewer | Revision app Expo/RN | invocado; sin salida util devuelta por herramienta | no
backend-reviewer | Compatibilidad contrato backend/movil | invocado; ejecucion abortada por herramienta | no
security-rbac-reviewer | JWT/RBAC/biometria/evidencias | invocado; sin salida util devuelta por herramienta | no
docs-tests-reviewer | Docs/pruebas/reporte persistido | invocado; sin salida util devuelta por herramienta | no
```

## 12. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos` para iniciar estabilizacion con los riesgos documentados
- [ ] `bloqueado`

La app tiene base funcional suficiente para continuar, pero no esta lista para piloto confiable sin corregir primero la sincronizacion backend/local de enrolamiento, la fuente de verdad de zonas, las evidencias protegidas y las rutas legacy.

## 13. Recomendaciones de siguiente fase

1. Definir backend como fuente de verdad para enrolamiento y zonas.
2. Hacer fail-closed el enrolamiento: si backend no enrola, no guardar perfil local como valido.
3. Cambiar `AuthGate` para no decidir enrolamiento solo con `profiles` local.
4. Consumir `/api/v2/biometria/zonas` o dejar de enviar `zona_id` local; evitar IDs `Date.now()` para backend.
5. Corregir carga de evidencias con autenticacion.
6. Eliminar o aislar `movil/face-server/` si ya no es parte del producto.
7. Actualizar `API_CONTRACT.md`, `movil/docs/*.md` y `CHECKLIST.md` al backend actual `backend_v2 + biometria-engine`.
8. Agregar scripts `typecheck`, `lint` y pruebas minimas para servicios puros (`normalizeServerAddress`, auth, mapping de asistencias).
9. Revisar permisos Android y quitar `RECORD_AUDIO` si no hay uso.
