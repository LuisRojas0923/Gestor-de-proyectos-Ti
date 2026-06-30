# Arquitectura Técnica de GeoFace

## 1. Estado Global (AppContext)

### Provider: `src/context/AppContext.tsx`

El estado global se maneja mediante React Context. `AppProvider` envuelve toda la app en `app/_layout.tsx`.

#### Estado

```typescript
profiles: FaceProfile[]
zones: Zone[]
checkIns: CheckIn[]
threshold: number            // 50-99, porcentaje de confianza mínimo
locationState: LocationState // { currentLocation, isInZone, distanceToZone, nearestZone, isTracking, error }
isLoading: boolean
```

#### Métodos Expuestos

```typescript
addProfile(name, photoUri?)          → Crea perfil + embedding facial
updateProfilePhoto(id, photoUri)     → Actualiza foto + re-calcula embedding
deleteProfile(id)                    → Elimina perfil y sus fotos
addZone(name, lat, lng, radius)      → Crea geocerca
deleteZone(id)                       → Elimina geocerca
addCheckIn(data)                     → Registra check-in (id + timestamp auto)
clearCheckIns()                      → Limpia historial
setThreshold(value)                  → Ajusta umbral (50-99)
startLocationTracking()              → Inicia GPS
stopLocationTracking()               → Detiene GPS
```

#### Flujo de Creación de Perfil

1. Usuario ingresa nombre y toma foto
2. `addProfile()` guarda la foto en `expo-file-system/legacy`
3. Hace health check al servidor DeepFace
4. Si el servidor responde, llama a `getEmbedding()` → `/v1/represent`
5. Guarda el embedding (number[] 512D) en el perfil
6. Persiste en AsyncStorage

Si el servidor no está disponible, el perfil se crea sin embedding (`faceDescriptor: null`) y no será verificable hasta que se actualice su foto con el servidor encendido.

## 2. Reconocimiento Facial

### Servidor: `face-server/server.py`

- Flask en puerto 5005
- Modelo: Facenet512 (512 dimensiones)
- Detector: RetinaFace
- L2-normalization activada
- Distancia coseno convertida a porcentaje de confianza
- Umbral de match: 0.35 (configurable via `MATCH_THRESHOLD`)

#### Endpoint `/v1/verify` - Algoritmo

1. Recibe `image` (base64) y `embeddings` (array de {id, embedding})
2. Extrae embedding de la selfie
3. Valida dimensiones de todos los embeddings recibidos contra el extraído
4. Calcula distancia coseno contra cada embedding guardado
5. Convierte distancia a porcentaje: `(1 - distance) * 100`
6. Ordena por distancia ascendente
7. Retorna `{ matches[], best_match, verified, threshold }`

### Cliente: `src/services/faceApi.ts`

- `getServerHost()` detecta IP LAN automáticamente desde `Constants.expoConfig?.hostUri`
- `setServerAddress()` permite configuración manual desde Ajustes
- `healthCheck()` timeout 5s
- `getEmbedding()` y `verifyFace()` timeout 120s (el modelo tarda en warm-up)
- `photoToBase64()` convierte foto a base64 usando `expo-file-system/legacy`
- `FaceApiError` clase de error personalizada con código

## 3. Navegación (Expo Router)

```
app/_layout.tsx  →  Stack navigator (sin headers)
  └── app/(tabs)/_layout.tsx  →  Bottom Tab Navigator
       ├── index.tsx      → Dashboard  (icono: location)
       ├── profiles.tsx   → Perfiles    (icono: people)
       ├── verify.tsx     → Verificar   (icono: scan)
       ├── settings.tsx   → Ajustes     (icono: settings)
       └── location-test.tsx → Prueba GPS (icono: compass)
```

Las rutas en `app/(tabs)/` son re-exports hacia `src/screens/`.

## 4. Geolocalización

### Hook: `src/hooks/useLocation.ts`

- Se inicia automáticamente al montar AppProvider
- Usa `expo-location` con alta precisión
- Intervalo de actualización: 3 segundos
- Distancia mínima para actualizar: 5 metros
- Calcula zona más cercana y distancia usando Haversine
- Expone `startTracking()`, `stopTracking()` y estado actual

### Servicio: `src/services/location.ts`

- `requestLocationPermissions()` → solicita permisos foreground
- `getCurrentLocation()` → obtiene ubicación única
- `watchLocation(callback)` → suscripción a cambios de ubicación

### Utilidad: `src/utils/geo.ts`

- `calculateDistance(p1, p2)` → Haversine, retorna metros
- `isPointInZone(point, zone)` → distancia <= radio
- `findNearestZone(point, zones)` → zona más cercana con distancia
- `formatDistance(meters)` → "X m" o "X.X km"

## 5. Persistencia

### AsyncStorage (datos estructurados)

| Key | Tipo | Descripción |
|---|---|---|
| `@geo_face_profiles` | FaceProfile[] | Perfiles con embeddings |
| `@geo_face_zones` | Zone[] | Geocercas configuradas |
| `@geo_face_checkins` | CheckIn[] | Historial (máx 100) |
| `@geo_face_threshold` | number | Umbral de coincidencia |

### expo-file-system/legacy (archivos)

- Fotos de perfil: `${documentDirectory}face_photos/{id}/face_{index}.jpg`
- Exportación CSV: `${documentDirectory}check_ins_export.csv`

## 6. Temas y Estilos

- **Tema oscuro** forzado (`userInterfaceStyle: "dark"` en app.json)
- Colores definidos en `src/constants/index.ts` como objeto `COLORS`
- Paleta primaria: `#6C5CE7` (púrpura)
- Cada pantalla tiene su propio `StyleSheet.create` en `src/styles/`
- Efectos: glassmorphism, gradientes decorativos, animación de pulso

## 7. TypeScript y Tipos

Todos los tipos están en `src/types/index.ts`:

```typescript
LatLng              → { latitude, longitude }
Zone                → { id, name, center: LatLng, radius, color? }
LocationState       → { currentLocation, isInZone, distanceToZone, nearestZone, isTracking, error }
FaceProfile         → { id, name, photoUris, faceDescriptor: number[]|null, createdAt, updatedAt }
VerificationResult  → { isMatch, confidence, matchedProfile, timestamp }
CheckIn             → { id, profileId, profileName, zone, verification, location, timestamp }
```

## 8. Constantes Clave

| Constante | Valor | Ubicación |
|---|---|---|
| `EXPECTED_EMBEDDING_DIM` | 512 | `src/utils/face.ts` |
| `FACE_SERVER_PORT` | 5005 | `src/utils/face.ts` |
| `FACE_MATCH_THRESHOLD` | 0.6 | `src/constants/index.ts` |
| `ZONE_DEFAULT_RADIUS` | 50m | `src/constants/index.ts` |
| `LOCATION_UPDATE_INTERVAL` | 3000ms | `src/constants/index.ts` |
| `LOCATION_DISTANCE_FILTER` | 5m | `src/constants/index.ts` |
| Umbral app (threshold) | 75% (default) | AsyncStorage |
| Umbral servidor | 0.35 distancia coseno | `face-server/.env` |

## 9. Flujo de Datos: Verificación Facial

```
Usuario                    App                         Servidor DeepFace        AsyncStorage
  │                         │                              │                       │
  │  Abre VerifyScreen      │                              │                       │
  │────────────────────────►│                              │                       │
  │                         │  Valida isInZone             │                       │
  │                         │  Carga perfiles con 512D     │                       │
  │                         │  Abre cámara                 │                       │
  │                         │                              │                       │
  │  Toma selfie            │                              │                       │
  │────────────────────────►│                              │                       │
  │                         │  healthCheck()               │                       │
  │                         │─────────────────────────────►│                       │
  │                         │◄─────────────────────────────│ { status: "ok" }      │
  │                         │                              │                       │
  │                         │  verifyFace(selfie, embeddings[])                    │
  │                         │─────────────────────────────►│                       │
  │                         │                              │  Extrae embedding     │
  │                         │                              │  Calcula distancias   │
  │                         │                              │  Ordena resultados    │
  │                         │◄─────────────────────────────│ best_match, verified  │
  │                         │                              │                       │
  │                         │  Si verified → addCheckIn()  │                       │
  │                         │─────────────────────────────────────────────────────►│
  │                         │                              │                       │
  │                         │  Muestra ResultOverlay       │                       │
  │◄────────────────────────│                              │                       │
```
