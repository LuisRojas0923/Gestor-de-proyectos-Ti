# Plan - Separacion de motor biometrico DeepFace en contenedor interno

**Fecha:** 2026-07-03
**Plan:** Extraer DeepFace/OpenCV/TensorFlow del backend principal hacia un servicio interno `biometria-engine`.
**Autor del plan:** Agente IA (OpenCode)
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

Separar el runtime pesado de reconocimiento facial en un contenedor independiente, manteniendo al backend principal como unica autoridad de seguridad, identidad, RBAC, persistencia, auditoria y decisiones de negocio.

La arquitectura objetivo es:

```text
App movil GeoFace
  -> backend principal FastAPI (:8000)
      -> biometria-engine interno Docker
          -> DeepFace / OpenCV / TensorFlow
```

El motor biometrico solo debe encargarse del procesamiento facial tecnico:

1. Decodificar y normalizar imagenes.
2. Detectar rostro.
3. Ejecutar DeepFace.
4. Generar embeddings.
5. Devolver metadatos tecnicos de deteccion, confianza y errores biometricos.

El backend principal conserva:

1. Login, JWT, refresh token y sesion.
2. RBAC y permisos del modulo `biometria`.
3. Identidad autoritativa del usuario autenticado.
4. Persistencia en `embeddings_faciales`, `registros_asistencia` y `zonas_trabajo`.
5. Auditoria, logs funcionales y trazabilidad.
6. Escritura y control de acceso de fotos/evidencias.
7. Umbral final de coincidencia y respuesta funcional al cliente.
8. Cualquier decision sobre enrolar, re-enrolar, marcar asistencia o rechazar identidad.

### Evidencia inicial requerida

Antes de implementar, registrar en el build review:

| Evidencia | Comando / fuente | Obligatorio |
|---|---|---|
| Estado Docker | `docker compose ps` | si |
| Config efectiva | `docker compose config` filtrando secretos | si |
| Puertos expuestos actuales | `docker compose ps` + inspeccion de `ports` | si |
| Health backend actual | `GET /api/v2/health` desde host e IP LAN | si |
| Tiempo de arranque backend actual | logs `Application startup complete` | si |
| Tiempo primera precarga DeepFace actual | logs `Pre-cargando modelos` -> exito | si |
| Memoria/CPU base | `docker stats --no-stream` | recomendable |
| Flujo actual real | login -> enrolar -> asistencia con rostro real | si antes de refactor |

## 2. No-objetivos

- No exponer `biometria-engine` directamente a la app movil ni a internet.
- No mover JWT, RBAC, usuarios, roles ni sesiones al motor biometrico.
- No dar acceso directo a la base de datos principal al motor biometrico.
- No permitir que el cliente movil envie `userId` como identidad autoritativa.
- No duplicar tablas de usuarios ni embeddings en otro PostgreSQL.
- No cambiar el contrato publico movil salvo que sea estrictamente necesario.
- No eliminar el modo degradado `503` del backend cuando el motor biometrico no este disponible.
- No resolver en este plan los problemas separados ya detectados: `/auth/yo` expone `hash_contrasena`, consulta ERP `beneficio`, `REDIS_PASSWORD` vacio.
- No mezclar esos bugs en el mismo commit/refactor; si se corrigen, deben tener plan/build separado o una seccion explicitamente aislada.

## 3. Estado actual

El flujo actual vive dentro de `backend_v2/app/api/biometria/biometria_router.py`:

| Responsabilidad actual | Ubicacion | Debe quedar en |
|---|---|---|
| Autenticacion usuario actual | `Depends(obtener_usuario_actual_db)` | Backend principal |
| RBAC/modulo biometria | `rbac_manifest.py` + permisos actuales | Backend principal |
| Decodificacion imagen PIL/OpenCV | `load_image_from_bytes()` | `biometria-engine` |
| DeepFace import/modelos | `biometria_router.py` | `biometria-engine` |
| Precarga modelos | `preload_models()` desde startup | `biometria-engine` startup |
| Normalizacion L2 | `l2_normalize()` | Backend o engine, definido por contrato |
| Guardado embedding | `EmbeddingFacial` | Backend principal |
| Comparacion contra usuario autenticado | `marcar_asistencia()` | Backend principal |
| Registro asistencia | `RegistroAsistencia` | Backend principal |
| Evidencias/fotos | `storage/perfiles`, `storage/asistencias` | Backend principal |

Brechas actuales que deben quedar cubiertas si se toca este router:

1. Endpoints de foto/evidencia deben requerir autenticacion.
2. Foto/evidencia deben validar owner/admin, no solo existencia del archivo.
3. Endpoints biometricos deben validar permiso RBAC `biometria`, no solo JWT.
4. Respuestas `500` no deben incluir `str(e)` ni detalles internos.

Actualmente `backend_v2/requirements.txt` incluye dependencias pesadas:

- `deepface==0.0.86`
- `tf-keras==2.16.0`
- `opencv-python-headless==4.9.0.80`

Estas dependencias deben migrarse gradualmente al nuevo servicio para reducir peso y riesgo del backend principal.

## 4. Diseno propuesto

### 4.1 Servicio nuevo

Crear un servicio interno:

```text
biometria_engine/
  app/
    main.py
    schemas.py
    face_engine.py
    config.py
  Dockerfile
  requirements.txt
```

Nombre Docker Compose:

```yaml
biometria-engine:
  build:
    context: ./biometria_engine
  expose:
    - "8010"
  environment:
    - DEEPFACE_MODEL=${DEEPFACE_MODEL:-Facenet}
    - DEEPFACE_DETECTOR=${DEEPFACE_DETECTOR:-opencv}
    - ANTI_SPOOFING=${ANTI_SPOOFING:-1}
    - BIOMETRIA_ENGINE_TOKEN=${BIOMETRIA_ENGINE_TOKEN}
  volumes:
    - deepface_weights:/root/.deepface
  networks:
    - app-network
```

No debe tener `ports:` en desarrollo normal. Debe usar `expose:` para que solo el backend pueda llamarlo por red Docker interna.

### 4.2 Contrato interno minimo

Endpoint de salud:

```text
GET /health
```

Respuesta:

```json
{
  "estado": "saludable",
  "modelo": "Facenet",
  "detector": "opencv",
  "runtime": "deepface"
}
```

Endpoint tecnico de representacion:

```text
POST /internal/v1/represent
Authorization: Bearer <BIOMETRIA_ENGINE_TOKEN>
Content-Type: multipart/form-data
image=<archivo>
```

Respuesta exitosa:

```json
{
  "embedding": [0.123, -0.456],
  "embedding_size": 128,
  "is_real": true,
  "detector_backend": "opencv",
  "model_name": "Facenet"
}
```

Errores internos esperados:

| Codigo | Significado |
|---|---|
| `400` | Imagen corrupta, vacia o formato invalido |
| `401` | Token interno ausente o invalido |
| `422` | No se detecto rostro claro |
| `403` | Anti-spoofing detecto suplantacion |
| `503` | Modelo no cargado o runtime no disponible |

El motor no debe recibir ni devolver:

- `usuario_id`
- `cedula`
- JWT del usuario final
- roles/permisos
- datos personales
- registros de asistencia
- rutas de archivos finales

### 4.3 Cliente interno del backend

Crear en backend:

```text
backend_v2/app/services/biometria/biometria_engine_client.py
```

Crear tambien un servicio de negocio:

```text
backend_v2/app/services/biometria/biometria_service.py
```

El flujo backend debe quedar:

```text
router -> BiometriaService -> BiometriaEngineClient / modelos
```

El router no debe contener comparacion vectorial, escritura de archivos, persistencia ni manejo detallado de errores del motor. Debe limitarse a recibir la peticion, aplicar dependencias de seguridad/RBAC y delegar.

Responsabilidades:

1. Enviar imagen al motor con `httpx.AsyncClient`.
2. Usar timeout corto y configurable.
3. Traducir errores del motor a errores funcionales del backend.
4. No filtrar stack traces ni respuestas internas al movil.
5. Registrar logs sin imagenes, sin embeddings completos y sin PII.

Mapeo obligatorio de errores:

| Caso motor/cliente | Respuesta backend al movil |
|---|---|
| Timeout, conexion rechazada o DNS | `503 Servicio de biometria no disponible` |
| Motor `400` imagen invalida | `400` saneado |
| Motor `401` token interno invalido | `503` saneado, no `401` al movil |
| Motor `403` spoofing | `403` saneado |
| Motor `422` sin rostro | `422` saneado |
| Motor `503` modelo/runtime no disponible | `503` saneado |
| Usuario sin embedding activo | `404`, antes de llamar al motor |
| Rostro no coincide | `401 Identidad denegada` |

Las respuestas `500` del backend no deben propagar `str(e)`.

Variables sugeridas:

```text
BIOMETRIA_ENGINE_URL=http://biometria-engine:8010
BIOMETRIA_ENGINE_TOKEN=<secreto-interno>
BIOMETRIA_ENGINE_TIMEOUT_SECONDS=30
MATCH_THRESHOLD=0.40
```

Guards obligatorios:

1. En entorno no local, backend y motor deben fallar al arrancar si `BIOMETRIA_ENGINE_TOKEN` esta vacio, ausente o usa placeholder.
2. El motor debe rechazar toda llamada interna sin token valido.
3. El backend nunca debe reenviar JWT del usuario final al motor.

### 4.4 Contrato estable de embedding

El motor devuelve embedding ya normalizado L2. El backend debe validar antes de persistir o comparar:

1. `embedding` es `list[float]`.
2. Dimension coincide con el modelo configurado.
3. No contiene `NaN`, `Inf` ni valores no numericos.
4. `embedding_size == len(embedding)`.
5. `model_name` y `detector_backend` coinciden con configuracion esperada.

El backend conserva el calculo de distancia y el umbral final `MATCH_THRESHOLD`.

### 4.5 Flujo de enrolamiento objetivo

```text
1. Movil -> backend: POST /api/v2/biometria/enrolar con JWT + imagen.
2. Backend valida JWT, usuario activo y permiso biometria.
3. Backend llama a biometria-engine /represent con token interno.
4. Engine devuelve embedding o error tecnico.
5. Backend normaliza/valida embedding segun contrato.
6. Backend guarda embedding en embeddings_faciales para usuario_actual.id.
7. Backend guarda foto de perfil si aplica.
8. Backend responde al movil.
```

Para evitar carreras por `embeddings_faciales.usuario_id` unico, el guardado debe usar una de estas estrategias:

1. Upsert PostgreSQL `ON CONFLICT (usuario_id) DO UPDATE`, preferida.
2. Transaccion con bloqueo y retry controlado ante `IntegrityError`.

No usar patron `select -> insert` sin manejo de concurrencia.

### 4.6 Flujo de asistencia objetivo

```text
1. Movil -> backend: POST /api/v2/biometria/asistencia con JWT + imagen + lat/lon.
2. Backend valida JWT, usuario activo y permiso biometria.
3. Backend busca embedding activo de usuario_actual.id.
4. Si no existe, backend devuelve 404 funcional.
5. Backend llama a biometria-engine /represent con imagen nueva.
6. Backend compara embedding nuevo contra embedding guardado.
7. Backend aplica MATCH_THRESHOLD.
8. Backend registra asistencia y evidencia.
9. Backend devuelve exito o 401 por rostro no coincidente.
```

La comparacion final debe permanecer en backend para que el motor no sea autoridad sobre identidad ni politicas de negocio. Si despues se agrega `/compare` en el motor por rendimiento, el backend debe conservar el umbral efectivo y la decision final.

### 4.7 RBAC y ownership

Agregar una dependencia concreta para endpoints biometricos publicos, por ejemplo:

```text
usuario_actual = Depends(requerir_permiso_biometria)
```

La dependencia debe:

1. Requerir JWT valido.
2. Cargar usuario activo.
3. Verificar permiso/modulo `biometria` desde el sistema RBAC actual.
4. Devolver `403` para usuario autenticado sin permiso.

Endpoints que deben requerir esta dependencia o equivalente:

- `POST /api/v2/biometria/enrolar`
- `POST /api/v2/biometria/asistencia`
- `GET /api/v2/biometria/asistencias`
- `GET /api/v2/biometria/foto/{filename}`
- `GET /api/v2/biometria/evidencia/{filename}`
- `GET/POST/DELETE /api/v2/biometria/zonas`

Para fotos/evidencias:

1. Perfil: solo el dueno del archivo o admin.
2. Evidencia: solo el dueno del registro asociado o admin.
3. Validar filename para impedir traversal.
4. Evitar filenames predecibles en nuevos registros si se cambia el storage.

## 5. Fases de implementacion

### Fase 0 - Cierre de precondiciones

1. Confirmar que el flujo actual funciona con rostro real: login -> enrolar -> asistencia.
2. Corregir o aislar bugs no relacionados que contaminen logs: `/auth/yo` expone `hash_contrasena`, consulta ERP `beneficio` desactualizada.
3. Documentar metricas base de arranque, memoria y tiempo de primera inferencia del backend actual.

### Fase 1 - Crear motor interno sin integrar

1. Crear `biometria_engine/` con FastAPI minimo.
2. Mover dependencias DeepFace/OpenCV/TensorFlow al `requirements.txt` del motor.
3. Implementar `/health` y `/internal/v1/represent`.
4. Agregar precarga de modelo en startup del motor.
5. Agregar autenticacion interna por `BIOMETRIA_ENGINE_TOKEN`.
6. Agregar validacion fail-closed de token interno.
7. Montar `deepface_weights` en el motor.
8. Agregar servicio en `docker-compose.yml` sin `ports`, solo `expose`.
9. Preferir red Docker privada `biometria-internal` compartida solo por backend y motor, ademas de la red general si hace falta.

### Fase 2 - Integrar backend por cliente interno

1. Crear `biometria_engine_client.py` en backend.
2. Crear `biometria_service.py` para enrolamiento, asistencia, historial, zonas y archivos.
3. Refactorizar `biometria_router.py` para quitar llamadas directas a `DeepFace.represent` y dejarlo delgado.
4. Agregar dependencia RBAC `biometria` y tests `403`.
5. Proteger foto/evidencia con auth + owner/admin.
6. Mantener `EmbeddingFacial`, `RegistroAsistencia`, `ZonaTrabajo` sin cambios de esquema salvo hallazgo documentado.
7. Mantener endpoints publicos actuales para no romper la app movil.
8. Mantener modo degradado: si motor no responde, backend devuelve `503 Servicio de biometria no disponible`.
9. Eliminar `str(e)` de respuestas `500` del router/servicio tocado.

### Fase 3 - Adelgazar backend principal

1. Remover `deepface`, `tf-keras` y `opencv-python-headless` de `backend_v2/requirements.txt` solo despues de tener pruebas verdes.
2. Remover precarga DeepFace del startup del backend.
3. Mantener dependencias ligeras necesarias para archivo/imagen solo si siguen usadas por backend.
4. Reconstruir backend y validar que arranque sin TensorFlow.

### Fase 4 - Hardening operativo

1. Definir limites de CPU/RAM para `biometria-engine`.
2. Agregar healthcheck Docker al motor.
3. Definir `restart: unless-stopped` o politica equivalente segun entorno.
4. Agregar logs estructurados sin embeddings ni imagenes.
5. Agregar timeouts y circuit breaker simple desde backend.
6. Documentar que el motor es servicio interno no publico.
7. Agregar limites de tamano y content-type de imagen en backend y motor.
8. Agregar rate limiting especifico para enrolamiento/asistencia si aplica al stack actual.

### Fase 5 - Pruebas y evidencia

1. Tests unitarios del cliente interno mockeando `httpx`.
2. Tests de router biometrico mockeando respuesta del motor.
3. Test de `503` cuando el motor no esta disponible.
4. Test de `401` sin JWT en endpoints publicos.
5. Test de `404` cuando usuario no tiene rostro enrolado.
6. Test de `422` cuando motor reporta rostro no detectado.
7. Validacion manual movil: login -> enrolar -> asistencia -> historial.
8. Reporte final en `docs/reviews/builds/`.
9. ADR en `docs/decisions/ADR-NNN-biometria-engine-interno.md`.
10. Actualizar `testing/CATALOGO_PRUEBAS.md` con entradas concretas.
11. Actualizar `docs/ESQUEMA_BASE_DATOS.md` para reflejar tablas biometricas existentes (`embeddings_faciales`, `registros_asistencia`, `zonas_trabajo`) aunque no haya migracion nueva.

## 6. Archivos afectados

Nuevos:

- `biometria_engine/Dockerfile`
- `biometria_engine/requirements.txt`
- `biometria_engine/app/main.py`
- `biometria_engine/app/config.py`
- `biometria_engine/app/schemas.py`
- `biometria_engine/app/face_engine.py`
- `backend_v2/app/services/biometria/biometria_engine_client.py`
- `backend_v2/app/services/biometria/biometria_service.py`
- `testing/backend/test_biometria_engine_client.py`
- `testing/backend/test_biometria_router_engine.py`
- `testing/backend/test_biometria_service.py`
- `testing/backend/test_biometria_engine_api.py`

Modificados:

- `docker-compose.yml`
- `backend_v2/requirements.txt`
- `backend_v2/app/api/biometria/biometria_router.py`
- `backend_v2/app/main.py`
- `backend_v2/app/config.py` o `backend_v2/app/core/config.py`, segun fuente activa de settings
- `testing/CATALOGO_PRUEBAS.md`
- `docs/GUIA_DESARROLLO.md`
- `docs/decisions/ADR-NNN-biometria-engine-interno.md`
- `docs/ESQUEMA_BASE_DATOS.md` para documentar tablas biometricas existentes y mantener sincronizacion documental

## 7. Seguridad

Controles obligatorios:

1. `biometria-engine` no publica puerto en host.
2. Backend y motor comparten red Docker interna.
3. Backend llama al motor con token interno fuerte.
4. Token interno no se registra en logs.
5. Motor no recibe JWT de usuario final.
6. Motor no recibe cedula, `usuario_id`, rol ni permisos.
7. Motor no tiene acceso a DB principal ni ERP.
8. Backend conserva validacion de usuario autenticado.
9. Backend conserva RBAC y auditoria.
10. Backend conserva ownership de fotos/evidencias.
11. Embeddings completos no deben aparecer en logs.
12. Imagenes no deben guardarse temporalmente en el motor salvo archivo temporal efimero borrado al terminar.
13. Endpoints de foto/evidencia deben requerir auth y owner/admin.
14. Endpoints biometricos deben validar RBAC `biometria`.
15. Errores internos no deben exponer `str(e)` al cliente.
16. Rate limit y limite de tamano de imagen deben estar definidos o documentados con justificacion.

## 8. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigacion |
|---|---|---|---|
| Motor interno expuesto por error con `ports` | M | A | Usar solo `expose`, validar `docker compose ps`, documentar no-publico |
| Latencia adicional por llamada HTTP interna | M | M | Usar red Docker, timeouts, payload multipart directo |
| Inconsistencia de normalizacion embedding | M | A | Definir si normaliza engine o backend; probar dimensiones/distancias |
| Backend pierde modo degradado | B | A | Tests de motor caido -> `503` |
| Logs filtran embeddings o PII | M | A | Sanitizar logs y tests de no logging sensible si aplica |
| Primer arranque descarga modelos | M | M | Volumen `deepface_weights`, healthcheck y preload |
| Motor consume RAM/CPU excesiva | M | A | Limites de recursos y monitoreo |
| App movil rompe contrato | B | A | Mantener endpoints publicos actuales |
| Comparacion movida al motor debilita decision backend | M | A | Backend conserva umbral y decision final |
| Tests se vuelven lentos por DeepFace real | A | M | Mock del cliente interno; tests engine separados/manuales |
| Usuario autenticado sin permiso usa biometria | M | A | Dependencia RBAC `biometria` + tests `403` |
| Fotos/evidencias expuestas por filename | M | A | Auth + owner/admin + validar filename |
| Token interno vacio en desarrollo se promueve a produccion | M | A | Fail-closed fuera de local + tests |
| Carrera en enrolamiento duplica usuario | M | M | Upsert `ON CONFLICT` o retry `IntegrityError` |
| Evidencia guardada pero commit DB falla | M | M | Definir limpieza de archivo huerfano o registrar compensacion |
| Embedding invalido aceptado por backend | B | A | Validar dimension, `embedding_size`, modelo/detector y valores finitos |

## 9. Comandos de validacion

Backend principal:

- `docker compose build --no-cache backend`
- `docker compose up -d backend`
- `docker compose exec backend python -m pytest testing/backend/test_biometria_engine_client.py -v`
- `docker compose exec backend python -m pytest testing/backend/test_biometria_router_engine.py -v`
- `docker compose exec backend python -m pytest testing/backend/test_biometria_service.py -v`
- `docker compose exec backend python -m pytest testing/backend/test_biometria_engine_api.py -v`
- `docker compose exec backend python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v`

Motor biometrico:

- `docker compose build --no-cache biometria-engine`
- `docker compose up -d biometria-engine backend`
- `docker compose exec biometria-engine python -c "import cv2; from deepface import DeepFace; import tf_keras; print('ok')"`
- `docker compose exec backend python -c "import httpx; print(httpx.get('http://biometria-engine:8010/health').json())"`
- `docker compose ps` y confirmar que `biometria-engine` no tiene puerto publicado al host
- Probar `/internal/v1/represent` sin token y con token invalido: debe rechazar
- Probar backend con `BIOMETRIA_ENGINE_URL` invalida: endpoints biometricos deben responder `503` saneado
- Probar arranque fail-closed con `BIOMETRIA_ENGINE_TOKEN` ausente/vacio/placeholder fuera de local en backend y motor

Validacion manual movil:

- Configurar app movil con IP LAN del host y puerto `8000`.
- Login.
- Enrolar rostro.
- Marcar asistencia.
- Consultar historial.
- Confirmar que la app nunca llama directamente a `biometria-engine`.

## 10. Criterios de aceptacion

| Criterio | Meta |
|---|---|
| Backend principal | Arranca sin importar DeepFace/TensorFlow |
| Motor interno | Precarga modelo y responde `/health` |
| Seguridad | `biometria-engine` no esta publicado en host |
| Auth | Endpoints publicos siguen requiriendo JWT |
| RBAC | Usuario autenticado sin permiso `biometria` recibe `403` |
| RBAC | Permiso `biometria` sigue gobernado por backend |
| Ownership | Fotos/evidencias requieren auth y owner/admin |
| Token interno | Motor rechaza llamadas sin token y falla cerrado si falta secreto fuera de local |
| Enrolamiento | Guarda embedding en `embeddings_faciales` desde respuesta del motor |
| Concurrencia | Enrolamiento concurrente no rompe constraint unico |
| Asistencia | Compara contra embedding del usuario autenticado y registra asistencia |
| Degradacion | Motor caido produce `503` controlado en backend |
| Movil | No cambia contrato publico salvo URL backend `IP_LAN:8000` |
| Logs | No exponen imagenes, embeddings completos, JWT ni token interno |
| Tests | Tests backend verdes con motor mockeado |

## 11. Plan de pruebas minimo

| Area | Casos obligatorios |
|---|---|
| Cliente interno backend | Exito; timeout/conexion -> `503`; motor `400/403/422/503`; motor `401` -> `503` saneado; no logs de token/JWT/imagen/embedding completo |
| Contrato embedding | Rechazar dimension invalida, `embedding_size` inconsistente, `NaN/Inf`, valores no numericos, `model_name` o `detector_backend` inesperado |
| Router/servicio backend | `401` sin JWT; `403` sin permiso `biometria`; `404` sin embedding antes de llamar motor; `422` sin rostro; `403` spoofing; `503` motor caido |
| Persistencia backend | Enrolamiento crea/actualiza con upsert; concurrencia no rompe constraint unico; asistencia exitosa registra; rollback DB; no escritura si motor falla |
| Mismatch/evidencias | Definir si `match_exitoso=false` se registra o no; probar la decision; limpiar archivo huerfano o compensar si falla commit DB |
| Foto/evidencia | Sin JWT `401`; otro usuario `403`; owner/admin `200`; filename sin traversal |
| Motor biometrico | `/health`; represent sin token `401`; token invalido `401`; imagen invalida `400`; sin rostro `422`; spoofing `403`; modelo no disponible `503` |
| Fail-closed | Backend y motor fallan cerrado si `BIOMETRIA_ENGINE_TOKEN` falta, esta vacio o usa placeholder fuera de local |

Los tests rapidos deben mockear DeepFace; inferencia real queda para validacion manual/integracion.

## 12. Evidencia final y documentacion

Crear `docs/reviews/builds/YYYY-MM-DD_biometria-engine-container.md` usando `docs/reviews/templates/build_review.md`.

El build review debe incluir archivos modificados, subagentes, comandos ejecutados/no ejecutados, `docker compose ps` sin puerto publico del motor, health backend/motor, rechazo de token invalido, backend sin imports DeepFace/TensorFlow, pruebas, validacion manual movil, documentacion actualizada, decision final y riesgos residuales.

## 13. Matriz de subagentes

```text
Subagente | Motivo | Estado plan
----------|--------|------------
harness-router | Recomendar matriz para plan backend/security/infra | consultado
scope-reviewer | Validar alcance y fronteras | approved_with_risks
backend-reviewer | Revisar arquitectura FastAPI, cliente interno y pruebas | approved_with_risks
security-rbac-reviewer | Revisar auth/RBAC/secrets/exposicion de servicio | approved_with_risks
docs-tests-reviewer | Revisar evidencia, pruebas y documentacion | approved_with_risks
```

## 14. Decision propuesta

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

Motivo: la separacion es arquitectonicamente sana, pero debe hacerse despues de confirmar el flujo actual con rostro real y sin abrir el motor a la red publica.
