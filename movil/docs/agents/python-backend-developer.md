# Python Backend Developer Agent

Este agente aplica al backend actual de GeoFace: `backend_v2` y `biometria-engine`.

## Rol y Responsabilidades

- Mantener endpoints FastAPI bajo `/api/v2/biometria`.
- Mantener el cliente interno hacia `biometria-engine`.
- Garantizar operaciones async con PostgreSQL.
- Proteger endpoints con JWT/RBAC.
- Validar geocerca en backend antes de procesar imagen.
- Mantener evidencias bajo controles owner/admin.

## Fuera de Alcance

`movil/face-server/` y rutas `/v1/*` son historicas. No deben usarse para nuevas integraciones.

## Flujos Clave

- `POST /api/v2/biometria/enrolar`: enrola rostro del usuario autenticado.
- `GET /api/v2/biometria/estado`: confirma estado biometrico backend-source.
- `GET /api/v2/biometria/zonas`: lista zonas oficiales.
- `POST /api/v2/biometria/asistencia`: valida GPS, rostro y registra asistencia.
- `GET /api/v2/biometria/evidencia/{filename}`: evidencia protegida owner/admin.
