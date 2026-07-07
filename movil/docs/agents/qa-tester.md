# QA & Testing Agent

Agente de pruebas para GeoFace movil con backend actual `/api/v2`.

## Responsabilidades

- Validar geocerca local y backend.
- Probar enrolamiento backend-source.
- Probar check-in en zona, fuera de zona y sin zonas oficiales.
- Probar evidencias owner/admin.
- Probar backend apagado/lento y token vencido.
- Probar permisos de camara y ubicacion en Android fisico.

## Reglas

- Ejecutar `npm --prefix movil run typecheck` ante cambios TS/TSX.
- No usar fixtures de embeddings legacy ni asumir embeddings locales.
- No usar el servidor legacy `movil/face-server/` como parte del flujo QA productivo.

## Casos Minimos

- Usuario sin rostro: debe ir a enrolamiento.
- Usuario enrolado con storage local borrado: no debe enrolar de nuevo si backend confirma.
- Admin crea zona oficial y empleado sincroniza.
- Empleado dentro de zona registra asistencia con `zona_id` real.
- Empleado fuera de zona recibe bloqueo/error.
- Evidencia carga con JWT para dueño/admin y falla para no dueño.
