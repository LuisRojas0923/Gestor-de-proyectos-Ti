# GeoFace - Sistema de Asistencia Inteligente Movil

## Descripcion General

GeoFace es la app movil ubicada en `movil/`. Usa React Native + Expo para capturar rostro, GPS y evidencias de asistencia. La app no decide sola si una asistencia es valida: consulta al backend central `backend_v2` y al servicio interno `biometria-engine`.

## Stack Tecnologico

| Componente | Tecnologia |
|---|---|
| App movil | React Native + Expo SDK 55 |
| Navegacion | Expo Router |
| Backend central | FastAPI en `backend_v2` |
| Motor biometrico | Servicio interno `biometria-engine` |
| Base de datos | PostgreSQL / SQLModel |
| GPS | `expo-location` |
| Camara | `expo-camera` |
| Sesion | JWT en SecureStore nativo / AsyncStorage web |

## Principios Actuales

- El backend es la fuente de verdad de enrolamiento, zonas, evidencias y asistencias.
- La cache local solo acelera UI; no autoriza check-ins.
- Las zonas oficiales vienen de `GET /api/v2/biometria/zonas`.
- La geocerca se valida en app y tambien en backend.
- Las evidencias se descargan con JWT, sin tokens en query params.
- Crear/eliminar usuarios desde movil no esta permitido en el flujo empresarial.

## Funcionalidades Principales

### Dashboard

- Muestra estado GPS y si el usuario esta dentro de zona.
- Muestra historial reciente de asistencias.
- Permite iniciar verificacion facial si hay zona valida.

### Enrolamiento

- La app toma una foto frontal.
- Envia `multipart/form-data` a `POST /api/v2/biometria/enrolar`.
- Luego consulta `GET /api/v2/biometria/estado` para confirmar enrolamiento.
- Si el backend no confirma, la app falla cerrado y permite reintento.

### Verificacion / Check-in

- La app toma selfie, latitud, longitud y zona cercana.
- Envia datos a `POST /api/v2/biometria/asistencia`.
- El backend valida geocerca por coordenadas antes de procesar imagen.
- El backend compara el rostro 1:1 contra el usuario autenticado.
- Si todo es valido, guarda registro y evidencia.

### Configuracion

- Permite configurar servidor para piloto LAN.
- Admin puede crear/eliminar zonas oficiales usando backend.
- Gestion de usuarios desde movil esta deshabilitada por politica empresarial.

## Endpoints Consumidos

| Endpoint | Uso |
|---|---|
| `POST /api/v2/auth/login` | Login |
| `GET /api/v2/auth/yo` | Usuario actual |
| `GET /api/v2/auth/analistas` | Lista admin con JWT |
| `GET /api/v2/biometria/estado` | Estado biometrico backend-source |
| `POST /api/v2/biometria/enrolar` | Enrolamiento facial |
| `GET /api/v2/biometria/zonas` | Zonas oficiales |
| `POST /api/v2/biometria/zonas` | Crear zona admin |
| `DELETE /api/v2/biometria/zonas/{id}` | Eliminar zona admin |
| `POST /api/v2/biometria/asistencia` | Marcar asistencia |
| `GET /api/v2/biometria/asistencias` | Historial |
| `GET /api/v2/biometria/evidencia/{filename}` | Evidencia protegida |

## Estructura

```text
movil/
├── app/                    # Expo Router
├── src/
│   ├── components/         # Componentes reutilizables
│   ├── context/            # AppContext / AuthContext
│   ├── hooks/              # useLocation
│   ├── screens/            # Pantallas principales
│   ├── services/           # faceApi, auth, storage
│   ├── styles/             # StyleSheets
│   ├── types/              # Tipos TS
│   └── utils/              # Formato, geocerca, export
├── docs/                   # Documentacion movil
├── face-server/            # Historico no productivo
├── app.json
├── eas.json
└── package.json
```
