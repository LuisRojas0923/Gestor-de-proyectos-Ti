# GeoFace - Sistema de Asistencia Inteligente

## Descripción General

GeoFace es una aplicación móvil (React Native / Expo) que combina **geolocalización** y **reconocimiento facial** para registrar asistencia de personas. El usuario debe estar físicamente dentro de una zona geográfica designada (geocerca) y tomarse una selfie para que el sistema verifique su identidad mediante DeepFace.

## Stack Tecnológico

| Componente | Tecnología |
|---|---|
| **Frontend móvil** | React Native + Expo SDK 55 |
| **Navegación** | Expo Router (file-based routing) |
| **Reconocimiento facial** | DeepFace (Facenet512) en servidor Python Flask |
| **Almacenamiento local** | AsyncStorage + expo-file-system/legacy |
| **Geolocalización** | expo-location (GPS) |
| **Cámara** | expo-camera (CameraView moderna) |
| **Idioma UI** | Español (es-MX) |

## Funcionalidades Principales

### 1. Dashboard (Inicio)
- Estado del GPS (activo/inactivo) con animación de pulso
- Indicador de zona (dentro/fuera de geocerca)
- Estadísticas: distancia a zona, latitud y longitud actual
- Botón "Verificar Identidad" (solo habilitado si está dentro de zona)
- Historial de check-ins recientes
- Inicia tracking GPS automáticamente al abrir la app

### 2. Perfiles
- CRUD completo de personas (agregar, actualizar foto, eliminar)
- Captura de foto desde cámara o galería
- Al crear/actualizar un perfil, se envía la foto al servidor DeepFace para extraer el embedding facial (vector 512D)
- La foto se guarda localmente en `expo-file-system/legacy` y el embedding en AsyncStorage

### 3. Verificación Facial (Check-in)
- **1:N automático**: no se selecciona persona manualmente
- Toma una selfie → la envía al servidor → el servidor compara contra TODOS los embeddings guardados
- Si la coincidencia supera el umbral configurado (>75% por defecto), se registra el check-in exitoso
- **Requisito obligatorio**: el usuario debe estar dentro de una geocerca (valida GPS antes de abrir la cámara)
- Muestra resultado con foto, nombre, barra de confianza y metadatos

### 4. Configuración (Ajustes)
- Gestión de zonas de verificación (geocercas): agregar, eliminar
- Permite autocompletar coordenadas desde la ubicación GPS actual
- Ajuste del umbral de coincidencia facial (50% - 99%)
- Exportar historial de check-ins a CSV
- Limpiar historial de asistencia

## Flujo de Check-in Completo

1. Usuario abre la app → GPS inicia automáticamente
2. Usuario se dirige a la zona designada
3. Dashboard muestra "En Zona ✓"
4. Usuario presiona "Verificar Identidad"
5. VerifyScreen valida que está dentro de zona (si no, muestra mensaje)
6. Usuario se toma una selfie
7. App envía la foto al servidor Flask (`/v1/verify`)
8. Servidor compara con todos los embeddings (512D Facenet512)
9. Si hay match y distancia ≤ 0.35 → check-in exitoso
10. Se guarda el registro en AsyncStorage con: persona, zona, resultado, ubicación, timestamp
11. Se muestra ResultOverlay con el resultado

## Estados y Validaciones

- **GPS inactivo**: no se puede hacer check-in
- **Fuera de zona**: no se puede hacer check-in (muestra distancia a zona más cercana)
- **Sin perfiles**: muestra pantalla informativa y botón para ir a Perfiles
- **Perfiles sin embedding 512D**: se filtran automáticamente (los antiguos de 128D no son válidos)
- **Servidor offline**: alerta con instrucciones para iniciar el servidor Python
- **Sin rostro detectado**: el servidor responde error 422, la app muestra alerta

## Endpoints del Servidor DeepFace

| Endpoint | Método | Descripción |
|---|---|---|
| `/v1/represent` | POST | Extrae embedding facial de una imagen |
| `/v1/verify` | POST | Compara selfie contra embeddings guardados (1:N) |
| `/v1/health` | GET | Health check del servidor |

## Estructura de Archivos

```
geo-face-app/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Layout root (AppProvider)
│   └── (tabs)/
│       ├── _layout.tsx           # Tabs navigation (4 tabs)
│       ├── index.tsx             # → DashboardScreen
│       ├── profiles.tsx          # → ProfilesScreen
│       ├── verify.tsx            # → VerifyScreen
│       ├── settings.tsx          # → SettingsScreen
│       └── location-test.tsx     # Pantalla de prueba GPS
├── src/
│   ├── components/               # Componentes reutilizables
│   │   ├── ProfileCard.tsx       # Tarjeta de perfil (avatar, nombre, acciones)
│   │   ├── ResultOverlay.tsx     # Overlay de resultado de verificación
│   │   ├── StatsCard.tsx         # Tarjeta de estadística (ícono + valor + etiqueta)
│   │   └── CheckInItem.tsx       # Fila de check-in en el historial
│   ├── screens/                  # Pantallas principales
│   │   ├── DashboardScreen.tsx
│   │   ├── ProfilesScreen.tsx
│   │   ├── VerifyScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── context/
│   │   └── AppContext.tsx         # Estado global (profiles, checkins, zones)
│   ├── hooks/
│   │   └── useLocation.ts        # Hook de geolocalización
│   ├── services/
│   │   ├── faceApi.ts            # Cliente HTTP para servidor DeepFace
│   │   ├── storage.ts            # AsyncStorage + file-system
│   │   └── location.ts           # expo-location helpers
│   ├── styles/                   # StyleSheets por pantalla
│   ├── types/
│   │   └── index.ts              # Interfaces TypeScript
│   ├── utils/
│   │   ├── format.ts             # getInitials, formatTime, formatDate, formatCheckInDate
│   │   ├── face.ts               # Constantes: EXPECTED_EMBEDDING_DIM, FACE_SERVER_PORT
│   │   └── geo.ts                # calculateDistance, isPointInZone, findNearestZone, formatDistance
│   └── constants/
│       └── index.ts              # COLORS, SPACING, BORDER_RADIUS, FONT_SIZES
├── face-server/                  # Servidor Python Flask + DeepFace
│   ├── server.py                 # 3 endpoints de reconocimiento facial
│   ├── requirements.txt          # flask, deepface, numpy, opencv-python, Pillow
│   ├── .env                      # Variables de entorno (modelo, detector, puerto)
│   └── start.bat                 # Script de inicio para Windows
├── docs/                         # Documentación
│   ├── CONTEXTO.md               # Este archivo
│   ├── ARQUITECTURA.md           # Arquitectura técnica detallada
│   └── GUIA-DESARROLLO.md        # Guía para desarrolladores
├── AGENTS.md                     # Instrucciones para la IA
├── app.json                      # Configuración Expo
└── package.json
```
