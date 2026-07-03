# ADR-007 - Motor biometrico interno separado

**Fecha:** 2026-07-03
**Estado:** Aceptada con riesgos

## Contexto

El backend principal ejecutaba DeepFace/OpenCV/TensorFlow dentro del mismo proceso FastAPI que maneja autenticacion, RBAC, base de datos, auditoria y endpoints del portal. Ese runtime es pesado, aumenta el tiempo de arranque y puede afectar modulos no relacionados si falla o consume demasiados recursos.

## Decision

Separar el procesamiento facial en un servicio Docker interno llamado `biometria-engine`.

El backend principal conserva:

- JWT, refresh token y usuario autenticado.
- RBAC del modulo `biometria`.
- Persistencia de embeddings, asistencias y zonas.
- Auditoria, ownership de fotos/evidencias y decision final de identidad.

El motor biometrico solo procesa imagenes y devuelve embeddings/metadatos tecnicos. No recibe JWT de usuario, cedula, rol, `usuario_id` ni acceso a base de datos.

## Consecuencias

- El backend puede arrancar sin importar DeepFace/TensorFlow.
- El motor puede reiniciarse, limitarse o escalarse independientemente.
- Se agrega una llamada HTTP interna con timeout y manejo `503`.
- Se requiere secreto interno `BIOMETRIA_ENGINE_TOKEN` y red Docker privada.
- Las pruebas backend deben mockear el motor para evitar inferencia pesada.

## Controles

- `biometria-engine` no publica `ports`, solo `expose` en red interna.
- Backend no reenvia JWT al motor.
- Motor rechaza llamadas sin token interno cuando no es entorno local.
- Backend valida RBAC `biometria` y owner/admin para fotos/evidencias.
- Embeddings, imagenes y tokens no se registran en logs.
