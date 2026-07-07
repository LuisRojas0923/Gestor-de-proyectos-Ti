# Backend review - GeoFace Fase 1A.1 Estado biometrico

**Fecha:** 2026-07-06  
**Scope:** `backend_v2/app/api/biometria/biometria_router.py`, `backend_v2/app/services/biometria/biometria_service.py`, `testing/backend/test_biometria_service.py`, `testing/backend/test_biometria_router_engine.py`, `testing/CATALOGO_PRUEBAS.md`, `docs/reviews/builds/2026-07-06_geoface-fase1a1-estado-biometrico.md`  
**Decision:** `approved_with_risks`

## Resumen

El endpoint `GET /api/v2/biometria/estado` mantiene la arquitectura esperada `router -> service`, usa `AsyncSession` con `await db.execute(...)`, conserva RBAC del modulo `biometria` y no introduce cambios de esquema. La cobertura nueva cubre delegacion del router y tres estados del servicio. No se detectan bloqueantes backend.

## Hallazgos por severidad

### Bloqueantes

- Ninguno.

### Media - No bloqueante: evidencia de ejecucion no cumple completamente el estandar Docker/regresion

- El build reporta ejecuciones `python -m pytest ...` en host. Para cierre formal, el proyecto exige validar pytest desde el entorno Docker/controlado y, si aplica, correr regresiones backend.
- En esta revision solo se ejecuto `python -m pytest --collect-only testing/backend/test_biometria_service.py testing/backend/test_biometria_router_engine.py`, con 10 tests colectados.

### Media - No bloqueante: `actualizadoEn` puede quedar obsoleto tras re-enrolamiento

- `obtener_estado_biometrico()` devuelve `perfil.creado_en` como `actualizadoEn`.
- `enrolar_rostro()` hace upsert de `embedding` y `activo`, pero no actualiza una marca temporal. Si un usuario se re-enrola, `actualizadoEn` seguira reflejando la fecha original de creacion del embedding.

### Baja - No bloqueante: contrato de respuesta sin `response_model` concreto

- El endpoint devuelve `dict` implicito. Para estabilidad de contrato y OpenAPI, conviene agregar un schema Pydantic concreto para `enrolado`, `fotoUrl` y `actualizadoEn`.

### Baja - No bloqueante: faltan casos de borde adicionales

- La suite cubre activo/sin perfil/inactivo, pero no cubre perfil activo con `url_avatar=None`, ni prueba HTTP del endpoint con dependencias sobrescritas para validar codigo 200/403 sobre la ruta real.

## Verificaciones

- Arquitectura: OK. Router delega sin logica de negocio.
- Async DB: OK. Consulta con `await db.execute(...)`; no hay acceso DB sincrono nuevo.
- PostgreSQL: OK. No se introduce SQL dialect-specific ajeno a PostgreSQL.
- RBAC: OK. Reusa `requerir_permiso_biometria`; modulo `biometria` ya existe en `rbac_manifest.py`.
- Transacciones: OK. Endpoint nuevo es read-only; no requiere commit/rollback.
- File size: OK. Archivos revisados estan bajo 550 lineas.
- Documentacion DB: N/A. No hay cambio de modelo/esquema.

## Pruebas requeridas/sugeridas

- Ejecutar en entorno Docker/controlado: tests de biometria modificados y suite de regresion backend aplicable.
- Agregar prueba de contrato HTTP para `GET /api/v2/biometria/estado` con 200 y 403.
- Agregar caso de servicio para perfil activo sin `url_avatar` si el frontend debe tolerar `enrolado=true` sin foto.
- Agregar prueba/ajuste para re-enrolamiento si `actualizadoEn` debe significar ultima actualizacion real.

## Decision

`approved_with_risks`: backend aceptable para Fase 1A.1 sin bloqueantes, condicionado a cerrar evidencia de pruebas en entorno controlado y clarificar semantica de `actualizadoEn`.
