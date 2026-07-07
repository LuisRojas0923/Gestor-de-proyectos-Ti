# Guia de Desarrollo - GeoFace Movil

## Requisitos

- Node.js compatible con Expo SDK 55.
- Dependencias instaladas en `movil/` con `npm ci`.
- Backend central levantado en `:8000`.
- Dispositivo Android fisico para validar camara/GPS.

## Backend requerido

Desde la raiz del repositorio:

```bash
docker compose up --build
```

Servicios esperados:

- Backend FastAPI: `http://localhost:8000/api/v2`.
- `biometria-engine`: servicio interno usado por backend.
- PostgreSQL.

Para desarrollo local sin Docker:

```bash
cd backend_v2
uvicorn app.main:app --reload --port 8000
```

## App movil

Desde `movil/`:

```bash
npm ci
npm start
```

Configura `EXPO_PUBLIC_API_HOST` o la IP/URL desde la pantalla de login/configuracion. En LAN, el celular y el PC deben estar en la misma red.

## Comandos

| Comando | Descripcion |
|---|---|
| `npm start` | Inicia Expo |
| `npm run android` | Ejecuta build nativo Android local |
| `npm run ios` | Ejecuta iOS local |
| `npm run web` | Expo web |
| `npm run typecheck` | TypeScript `tsc --noEmit` |
| `eas build --profile preview --platform android` | APK interno preview |
| `eas build --profile production --platform android` | App bundle produccion |

No hay scripts `lint` ni `test` moviles definidos todavia.

## Variables y servidor

Ejemplo `.env` local:

```text
EXPO_PUBLIC_API_HOST=192.168.1.50
```

La app arma `http://<host>:8000/api/v2`. Para produccion abierta se requiere HTTPS/VPN y revisar `usesCleartextTraffic`.

## Flujo basico de prueba

1. Levantar backend y base de datos.
2. Iniciar Expo.
3. Login con usuario valido.
4. Confirmar que `/biometria/estado` responde.
5. Si no esta enrolado, enrolar rostro.
6. Admin crea zona oficial desde Ajustes o backend.
7. Empleado entra a zona y marca asistencia.
8. Validar historial y evidencia.

## Validaciones obligatorias antes de piloto

- `npm run typecheck` en `movil/`.
- Suite backend biometria.
- APK preview instalado en al menos 2 Android fisicos.
- Camara permitida/denegada.
- Ubicacion permitida/denegada.
- Backend apagado/lento.
- Usuario ya enrolado con storage local borrado.
- Usuario fuera de zona.
- Evidencia visible para dueño/admin, bloqueada para no dueño.

## Problemas comunes

| Problema | Revision |
|---|---|
| No conecta al servidor | Revisar IP, puerto 8000, firewall y misma red |
| `401` | Token vencido o login requerido |
| `403` | Rol sin permiso o evidencia de otro usuario |
| `400` fuera de zona | GPS no cae dentro de una zona oficial |
| No carga evidencia | Revisar JWT, permiso owner/admin y ruta relativa de evidencia |
| TypeScript falla | Ejecutar `npm ci` y luego `npm run typecheck` |

## Seguridad

- No guardar JWT en query params.
- No confiar en zonas locales para nomina/asistencia.
- No activar produccion abierta con HTTP claro.
- No usar `movil/face-server/` como runtime productivo.
