# Reporte de Revisión de Build - Biometria Engine Interno

**Fecha:** 2026-07-03
**Build:** Separacion de DeepFace/OpenCV/TensorFlow a `biometria-engine`
**Autor del build:** Agente IA (OpenCode)
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `biometria_engine/` nuevo servicio FastAPI interno.
- `backend_v2/app/api/biometria/biometria_router.py`
- `backend_v2/app/services/biometria/biometria_engine_client.py`
- `backend_v2/app/services/biometria/biometria_service.py`
- `backend_v2/app/core/migrations/structural_blindaje.py`
- `backend_v2/app/main.py`
- `backend_v2/requirements.txt`
- `docker-compose.yml`
- `testing/backend/test_biometria_*.py`
- `testing/CATALOGO_PRUEBAS.md`
- `docs/GUIA_DESARROLLO.md`
- `docs/ESQUEMA_BASE_DATOS.md`
- `docs/decisions/ADR-007-biometria-engine-interno.md`
- `docs/reviews/plans/2026-07-03_biometria-engine-container.md`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| harness-router | required: scope, backend, security; docs-tests opcional | no | Routing inicial del plan. |
| scope-reviewer | approved_with_risks | no | Alcance backend/infra/docs/tests. |
| backend-reviewer | approved_with_risks | no | Bloqueos iniciales corregidos: test sin DeepFace, unique index, UUID evidencia, numpy directo. |
| security-rbac-reviewer | approved_with_risks | no | Bloqueo PII corregido: el motor recibe `captura.*`, no filename real ni `usuario.id`. |
| docs-tests-reviewer | approved_with_risks | no | ADR, catalogo, guia y esquema actualizados. |

## 3. Hallazgos bloqueantes

Ninguno restante.

## 4. Hallazgos no bloqueantes

- `biometria_service.py` mantiene E/S de archivos sincrona; se recomienda mover a `asyncio.to_thread()` o storage dedicado.
- `backend` no espera `biometria-engine` con `condition: service_healthy`; durante arranque inicial puede devolver `503`, que es degradacion aceptada.
- `face_engine.py` desactiva `anti_spoofing` ante `TypeError` para compatibilidad; conviene acotar ese fallback a una version conocida.
- Si ya existieran duplicados historicos en `embeddings_faciales.usuario_id`, el unique index del blindaje podria no crearse y quedaria warning en logs.
- `docker-compose.prod.yml` y `docker-compose.Pruebas3.yml` aun no incorporan `biometria-engine`.
- URLs locales de fotos/evidencias siguen incluyendo `usuario.id`; ya no se envian al motor, pero puede endurecerse despues.

## 5. Tests / comandos ejecutados

- `python -m pytest testing/backend/test_biometria_engine_client.py testing/backend/test_biometria_service.py testing/backend/test_biometria_router_engine.py testing/backend/test_biometria_engine_api.py -v` - PASS, 16 passed.
- `python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v` - PASS, 4 passed / 4 skipped.
- `docker compose config --services` - PASS, incluye `biometria-engine`.
- `docker compose build --no-cache backend biometria-engine` - PASS.
- `docker compose build backend` - PASS tras fixes finales.
- `docker compose up -d biometria-engine backend` - PASS con `BIOMETRIA_ENGINE_TOKEN` temporal de sesion.
- `docker compose ps backend biometria-engine` - PASS; `backend` publica `8000`, `biometria-engine` solo `8010/tcp` sin puerto host.
- `GET http://localhost:8000/api/v2/health` - PASS `200 OK`.
- `backend -> http://biometria-engine:8010/health` - PASS `{'estado': 'saludable', 'modelo': 'Facenet', 'detector': 'opencv', 'runtime': 'deepface'}`.
- Import check en backend - PASS: `deepface`, `tensorflow`, `tf_keras`, `cv2` no instalados.
- `POST /internal/v1/represent` sin token y con token invalido desde backend - PASS `401` en ambos casos.
- `POST /api/v2/biometria/asistencia` sin token - PASS `401`.
- `POST /api/v2/biometria/asistencia` con token y sin rostro enrolado - PASS `404` funcional.

No se ejecuto validacion manual movil con rostro real porque requiere camara/usuario final.

## 6. Documentacion actualizada

- [x] `docs/ESQUEMA_BASE_DATOS.md`
- [x] `docs/decisions/ADR-007-biometria-engine-interno.md`
- [x] `docs/GUIA_DESARROLLO.md`
- [x] `testing/CATALOGO_PRUEBAS.md`
- [x] `docs/reviews/plans/2026-07-03_biometria-engine-container.md`

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Agregar `BIOMETRIA_ENGINE_TOKEN` seguro en `.env` local/produccion antes de reinicios futuros | Equipo TI | 2026-07-03 |
| Replicar `biometria-engine` en compose productivo y Pruebas3 | Equipo TI | Proximo despliegue |
| Validar enrolamiento/asistencia desde app movil con rostro real | Equipo TI | Proxima prueba movil |
| Endurecer URLs de evidencia para no incluir `usuario.id` | Backend | Backlog seguridad |
| Convertir E/S de archivos biometrica a no bloqueante | Backend | Backlog tecnico |
