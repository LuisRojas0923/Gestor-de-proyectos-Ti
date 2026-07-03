Security/RBAC review: blocked

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: ✅
- No print(): ✅
- PII redacted: ❌

## Findings

1. **BLOQUEANTE — El backend aún puede enviar metadatos PII al motor biométrico.**
   - `backend_v2/app/services/biometria/biometria_service.py:31` y `:76` pasan `image.filename or f"{usuario.id}.jpg"` al `BiometriaEngineClient`.
   - `backend_v2/app/services/biometria/biometria_engine_client.py:63` reenvía ese valor como `filename` del multipart hacia `biometria-engine`.
   - Esto incumple el criterio “no JWT/PII al motor” y el ADR-007, porque el motor puede recibir `usuario_id` o nombres de archivo originales con cédula/nombre/correo. Debe enviarse un nombre neutro fijo o aleatorio sin identificadores de usuario.

2. **MEDIO — Pruebas de token interno presentes pero incompletas.**
   - Existen `testing/backend/test_biometria_engine_api.py` y `testing/backend/test_biometria_engine_client.py` con cobertura de token válido, token inválido y saneamiento de 401 a 503.
   - Faltan casos explícitos para header ausente, token vacío en `production`, token débil en startup y bypass permitido solo en entorno local.

3. **BAJO — Oráculo menor por existencia de fotos/evidencias.**
   - `ruta_foto_perfil` y `ruta_evidencia` verifican existencia antes de autorización owner/admin. Un usuario con RBAC biometría puede distinguir 404 vs 403 para nombres conocidos.
   - El owner/admin está aplicado correctamente, pero conviene devolver respuesta uniforme para recursos no propios.

4. **BAJO — Infra de despliegue no homogénea fuera de `docker-compose.yml`.**
   - El nuevo servicio `biometria-engine` está definido sin `ports` y solo en red interna en `docker-compose.yml`.
   - `docker-compose.prod.yml` y `docker-compose.Pruebas3.yml` no reflejan todavía la separación del motor, lo que deja riesgo operativo si esos entornos usan el backend sin el servicio interno configurado.

## Verificaciones positivas
- RBAC biometría: `backend_v2/app/core/rbac_manifest.py` contiene módulo `biometria` crítico; todos los endpoints del router usan `Depends(requerir_permiso_biometria)`.
- Owner/admin en fotos/evidencias: no-admin solo accede a su `url_avatar` o registros propios; admin accede a todos.
- Token interno fail-closed fuera de local: backend y engine validan `BIOMETRIA_ENGINE_TOKEN` en startup; engine rechaza `Authorization` ausente/incorrecto cuando hay token o no es local.
- No ports en motor: `docker-compose.yml` usa `expose: 8010`, sin `ports`, y red `biometria-internal` marcada `internal: true`.
- No JWT al motor: el cliente interno solo envía `Authorization: Bearer <BIOMETRIA_ENGINE_TOKEN>`, archivo e `image/content_type`; no reenvía JWT de usuario.
- No DB al motor: `biometria_engine/` no importa SQLAlchemy ni configura DB; el servicio solo comparte red con backend, no con `db`.
- Errores saneados: se eliminaron detalles `str(e)` hacia HTTP 500 en el flujo revisado; logs no incluyen embeddings/tokens.

## RBAC/config impact
- Impacto RBAC: correcto para `biometria`.
- Impacto config/infra: correcto en compose local; pendiente alinear compose prod/Pruebas3 si esos entornos se usan para este build.

## Blocking reasons
- Debe eliminarse el envío de `image.filename` / `usuario.id` al motor biométrico. Enviar únicamente nombre neutro no identificable.

Severity: BLOQUEANTE

CWE references: CWE-200, CWE-359, CWE-284
