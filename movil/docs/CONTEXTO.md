# GeoFace - Sistema de Asistencia Inteligente (Módulo Móvil)

## Descripción General

GeoFace es el módulo móvil (React Native / Expo) que combina **geolocalización** y **reconocimiento facial** para registrar la asistencia del personal. El usuario debe estar físicamente dentro de una zona geográfica designada (geocerca) y tomarse una selfie para que el sistema central verifique su identidad mediante Inteligencia Artificial (DeepFace).

## Stack Tecnológico

| Componente | Tecnología |
|---|---|
| **Frontend móvil** | React Native + Expo SDK 55 |
| **Navegación** | Expo Router (file-based routing) |
| **Reconocimiento facial** | DeepFace integrado en Backend Central (`backend_v2` - FastAPI) |
| **Base de Datos (Vectores)** | PostgreSQL (SQLModel) en servidor central |
| **Geolocalización** | expo-location (GPS) |
| **Cámara** | expo-camera (CameraView moderna) |
| **Idioma UI** | Español |

## Funcionalidades Principales

### 1. Dashboard (Inicio)
- Estado del GPS (activo/inactivo) con animación de pulso.
- Indicador de zona (dentro/fuera de geocerca).
- Estadísticas: distancia a zona, latitud y longitud actual.
- Botón "Verificar Identidad" (solo habilitado si está dentro de zona).
- Historial de check-ins recientes (en caché local).
- Inicia tracking GPS automáticamente al abrir la app.

### 2. Perfiles y Enrolamiento
- La aplicación permite capturar el rostro base del empleado.
- Al crear/actualizar un perfil, la foto se envía al servidor central (FastAPI).
- El servidor extrae las características matemáticas (embedding facial) y las guarda de forma segura en PostgreSQL.
- **Diferencia clave:** El celular ya no almacena ni procesa la biometría, actuando únicamente como cliente de captura.

### 3. Verificación Facial (Check-in)
- Toma una selfie → la envía al servidor central como `FormData` junto a las coordenadas GPS.
- El servidor la compara exclusivamente contra el perfil del usuario autenticado (Verificación 1:1).
- Si la coincidencia supera el umbral configurado de similitud, el servidor registra la asistencia en base de datos y guarda la evidencia física.
- **Requisito obligatorio:** El usuario debe estar dentro de una geocerca. La app lo valida localmente, y el servidor audita las coordenadas recibidas.

### 4. Configuración (Ajustes)
- Permite configurar la dirección IP o URL del servidor central (Backend V2).
- Gestión de zonas de verificación locales.

## Flujo de Check-in Completo

1. Usuario abre la app → GPS inicia automáticamente.
2. Usuario se dirige a la zona de trabajo designada.
3. Dashboard muestra "En Zona ✓".
4. Usuario presiona "Verificar Identidad".
5. VerifyScreen valida que está dentro de zona (si no, bloquea la acción).
6. Usuario se toma una selfie.
7. App envía la foto y coordenadas al servidor FastAPI (`POST /api/v2/biometria/asistencia`).
8. Servidor procesa la imagen, endereza EXIF y ejecuta DeepFace.
9. Si hay match biométrico → check-in exitoso en servidor.
10. La app recibe respuesta HTTP 200, guarda un registro en caché local para mostrar al usuario.
11. Se muestra ResultOverlay con el estado de "Identidad Verificada".

## Estados y Validaciones

- **GPS inactivo:** No se puede hacer check-in.
- **Fuera de zona:** No se puede hacer check-in (muestra distancia a zona más cercana).
- **Servidor offline/IP incorrecta:** Alerta de error de red.
- **Error Biométrico:** El servidor responde con error HTTP si el rostro no coincide, está borroso, o si se detecta un intento de fraude (Anti-Spoofing).

## Endpoints del Servidor Central Consumidos

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/v2/biometria/enrolar` | POST | Enrola un nuevo rostro para el usuario en la BD central |
| `/api/v2/biometria/asistencia` | POST | Compara selfie contra el rostro guardado y registra asistencia |
| `/api/v2/biometria/asistencias` | GET | (Opcional) Obtener el historial oficial de asistencias |

## Estructura de Archivos Móvil

```
modulo_autenticacion_facial_fork/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Layout root (AppProvider)
│   └── (tabs)/
│       ├── _layout.tsx           # Tabs navigation
│       ├── index.tsx             # → DashboardScreen
│       ├── profiles.tsx          # → ProfilesScreen
│       ├── verify.tsx            # → VerifyScreen
│       └── settings.tsx          # → SettingsScreen
├── src/
│   ├── components/               # Componentes reutilizables UI
│   ├── screens/                  # Pantallas principales
│   ├── context/                  # Estado global (React Context)
│   ├── hooks/                    # Hook de geolocalización
│   ├── services/                 # Clientes HTTP (faceApi.ts)
│   ├── styles/                   # StyleSheets
│   ├── types/                    # Interfaces TypeScript
│   └── utils/                    # Utilidades de distancias y formateos
├── docs/                         # Documentación técnica
│   ├── CONTEXTO.md               # Este archivo
│   └── ARQUITECTURA.md           # Arquitectura detallada
├── app.json                      # Configuración Expo
└── package.json
```
