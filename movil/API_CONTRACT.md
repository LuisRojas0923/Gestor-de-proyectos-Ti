# GeoFace API Contract

La app movil `movil/` consume el backend central del proyecto, no el servidor Flask historico.

**Base URL:** `http://<HOST>:8000/api/v2` en LAN/piloto o `https://<HOST>/api/v2` en entornos productivos.

La direccion se arma desde `EXPO_PUBLIC_API_HOST` o desde la configuracion guardada en la app. Todas las rutas protegidas usan `Authorization: Bearer <JWT>`.

## Auth

### Login

`POST /auth/login`

Content-Type: `application/x-www-form-urlencoded`

```text
username=<cedula>&password=<password>
```

Respuesta:

```json
{
  "access_token": "jwt",
  "token_type": "bearer"
}
```

### Usuario actual

`GET /auth/yo`

Headers:

```text
Authorization: Bearer <jwt>
```

### Analistas

`GET /auth/analistas`

Uso movil: solo para administradores. Requiere JWT y permisos backend.

## Biometria

### Estado biometrico

`GET /biometria/estado`

Respuesta:

```json
{
  "enrolado": true,
  "fotoUrl": "/api/v2/biometria/foto/USR-1.jpg",
  "actualizadoEn": "2026-07-07T10:00:00"
}
```

La app usa este endpoint como fuente de verdad. Los perfiles locales son cache visual, no autoridad.

### Enrolar rostro

`POST /biometria/enrolar`

Body `multipart/form-data`:

| Campo | Tipo | Descripcion |
|---|---|---|
| `image` | archivo | Foto frontal del usuario autenticado |

Respuesta:

```json
{
  "status": "success",
  "message": "Rostro enrolado correctamente"
}
```

### Marcar asistencia

`POST /biometria/asistencia`

Body `multipart/form-data`:

| Campo | Tipo | Descripcion |
|---|---|---|
| `image` | archivo | Selfie de asistencia |
| `latitud` | number | Latitud GPS marcada |
| `longitud` | number | Longitud GPS marcada |
| `zona_id` | number opcional | Zona oficial seleccionada por la app |

El backend valida la geocerca usando las coordenadas y deriva la zona real mas cercana. Si hay zonas oficiales y la ubicacion esta fuera de todas, responde `400`.

Respuesta exitosa:

```json
{
  "status": "success",
  "message": "Asistencia registrada correctamente",
  "confidence": 99.12,
  "evidenciaUrl": "/api/v2/biometria/evidencia/archivo.jpg",
  "distance": 0.008
}
```

### Historial de asistencias

`GET /biometria/asistencias`

`GET /biometria/asistencias?usuario_id=<id>` para admin.

Respuesta resumida:

```json
[
  {
    "id": 1,
    "userId": "USR-1",
    "zoneId": "10",
    "isMatch": true,
    "confidence": 99.12,
    "location": { "latitude": 6.2442, "longitude": -75.5812 },
    "timestamp": "2026-07-07T10:00:00",
    "evidenciaUrl": "/api/v2/biometria/evidencia/archivo.jpg"
  }
]
```

### Evidencia fotografica

`GET /biometria/evidencia/{filename}`

Requiere JWT. El backend permite acceso al dueño de la asistencia o a admin. La app descarga la evidencia con `Authorization` y nunca envia tokens en query params.

## Zonas oficiales

### Listar zonas

`GET /biometria/zonas`

Respuesta:

```json
[
  {
    "id": 10,
    "nombre": "Oficina Principal",
    "latitud": 6.2442,
    "longitud": -75.5812,
    "radio": 100
  }
]
```

Mapeo movil:

| Backend | Movil |
|---|---|
| `id` | `Zone.id` |
| `nombre` | `Zone.name` |
| `latitud`, `longitud` | `Zone.center` |
| `radio` | `Zone.radius` |

### Crear zona

`POST /biometria/zonas`

Solo admin.

```json
{
  "nombre": "Oficina Principal",
  "latitud": 6.2442,
  "longitud": -75.5812,
  "radio": 100
}
```

### Eliminar zona

`DELETE /biometria/zonas/{zona_id}`

Solo admin.

## Endpoints legacy

Las rutas Flask `/v1/health`, `/v1/represent`, `/v1/verify` y `/v1/users/*` no son contrato operativo de la app actual. El directorio `movil/face-server/` se conserva solo como historico no productivo.
